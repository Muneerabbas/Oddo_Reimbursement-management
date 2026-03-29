import type { Request, Response } from "express";
import { ZodError } from "zod";
import { pool } from "../config/db";
import { createReportingLinkSchema, updateHierarchyTierSchema } from "../schemas/hierarchySchemas";

function sendZodError(res: Response, err: ZodError): void {
  const first = err.issues[0];
  res.status(400).json({
    message: first?.message ?? "Validation failed",
    errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

/** True if `candidate` appears in the subordinate tree rooted at `root` (root supervises candidate transitively). */
async function isUnderInReportingTree(
  companyId: number,
  rootId: number,
  candidateId: number,
): Promise<boolean> {
  const r = await pool.query<{ sub: number; sup: number }>(
    `SELECT subordinate_id AS sub, supervisor_id AS sup FROM reporting_links WHERE company_id = $1`,
    [companyId],
  );
  const bySupervisor = new Map<number, number[]>();
  for (const row of r.rows) {
    if (!bySupervisor.has(row.sup)) bySupervisor.set(row.sup, []);
    bySupervisor.get(row.sup)!.push(row.sub);
  }
  const q = [...(bySupervisor.get(rootId) || [])];
  const seen = new Set<number>();
  while (q.length) {
    const n = q.shift()!;
    if (n === candidateId) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const c of bySupervisor.get(n) || []) q.push(c);
  }
  return false;
}

export async function getHierarchy(req: Request, res: Response): Promise<void> {
  const companyId = req.auth!.companyId;

  const users = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.hierarchy_tier, u.manager_id,
            cr.name AS team_role_name
     FROM users u
     LEFT JOIN company_roles cr ON cr.id = u.company_role_id
     WHERE u.company_id = $1
     ORDER BY u.hierarchy_tier ASC, u.full_name ASC`,
    [companyId],
  );

  const links = await pool.query(
    `SELECT id, subordinate_id, supervisor_id FROM reporting_links WHERE company_id = $1`,
    [companyId],
  );

  res.json({
    nodes: users.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      systemRole: row.role,
      hierarchyTier: row.hierarchy_tier,
      teamRoleName: row.team_role_name,
      managerId: row.manager_id,
    })),
    links: links.rows.map((row) => ({
      id: `e-${row.id}`,
      dbId: row.id,
      subordinateId: row.subordinate_id,
      supervisorId: row.supervisor_id,
    })),
  });
}

export async function createReportingLink(req: Request, res: Response): Promise<void> {
  try {
    const body = createReportingLinkSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const { subordinateId: subId, supervisorId: supId } = body;

    if (subId === supId) {
      res.status(400).json({ message: "A user cannot report to themselves." });
      return;
    }

    const users = await pool.query<{
      id: number;
      role: string;
      hierarchy_tier: number;
    }>(
      `SELECT id, role, hierarchy_tier FROM users WHERE id = ANY($1::int[]) AND company_id = $2`,
      [[subId, supId], companyId],
    );
    if (users.rows.length !== 2) {
      res.status(400).json({ message: "Both users must belong to your company." });
      return;
    }
    const sub = users.rows.find((u) => u.id === subId)!;
    const sup = users.rows.find((u) => u.id === supId)!;

    if (sub.role === "admin") {
      res.status(400).json({ message: "Administrators cannot be subordinates in the reporting graph." });
      return;
    }
    if (sup.role !== "manager" && sup.role !== "admin") {
      res.status(400).json({ message: "Supervisors must be managers or administrators." });
      return;
    }

    if (sup.hierarchy_tier <= sub.hierarchy_tier) {
      res.status(400).json({
        message:
          "Reporting flows bottom → top: the supervisor’s hierarchy tier must be greater than the subordinate’s. Adjust tiers in the side panel if needed.",
      });
      return;
    }

    const invalid = await isUnderInReportingTree(companyId, subId, supId);
    if (invalid) {
      res.status(400).json({
        message: "This link would break the hierarchy (the proposed supervisor already reports under this subordinate).",
      });
      return;
    }

    const ins = await pool.query(
      `INSERT INTO reporting_links (company_id, subordinate_id, supervisor_id)
       VALUES ($1, $2, $3)
       RETURNING id, subordinate_id, supervisor_id`,
      [companyId, subId, supId],
    );

    if (sub.role === "employee") {
      await pool.query(
        `UPDATE users SET manager_id = COALESCE(manager_id, $1) WHERE id = $2 AND company_id = $3`,
        [supId, subId, companyId],
      );
    }

    const row = ins.rows[0];
    res.status(201).json({
      link: {
        id: `e-${row.id}`,
        dbId: row.id,
        subordinateId: row.subordinate_id,
        supervisorId: row.supervisor_id,
      },
    });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ message: "This reporting relationship already exists." });
      return;
    }
    console.error("createReportingLink", e);
    res.status(500).json({ message: "Could not create reporting link." });
  }
}

export async function deleteReportingLink(req: Request, res: Response): Promise<void> {
  const companyId = req.auth!.companyId;
  const subId = Number(req.params.subordinateId);
  const supId = Number(req.params.supervisorId);
  if (!Number.isFinite(subId) || !Number.isFinite(supId)) {
    res.status(400).json({ message: "Invalid link identifiers." });
    return;
  }

  const del = await pool.query(
    `DELETE FROM reporting_links
     WHERE company_id = $1 AND subordinate_id = $2 AND supervisor_id = $3
     RETURNING subordinate_id`,
    [companyId, subId, supId],
  );

  if (del.rowCount === 0) {
    res.status(404).json({ message: "Link not found." });
    return;
  }

  await pool.query(
    `UPDATE users SET manager_id = NULL
     WHERE id = $1 AND company_id = $2 AND manager_id = $3`,
    [subId, companyId, supId],
  );

  res.status(204).send();
}

export async function updateUserHierarchyTier(req: Request, res: Response): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ message: "Invalid user id." });
      return;
    }
    const body = updateHierarchyTierSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const tier = body.hierarchyTier;

    const cur = await pool.query<{ role: string; hierarchy_tier: number }>(
      `SELECT role, hierarchy_tier FROM users WHERE id = $1 AND company_id = $2`,
      [userId, companyId],
    );
    if (cur.rows.length === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    const row = cur.rows[0];
    if (row.role === "admin") {
      res.status(400).json({ message: "Administrator tier is fixed at the top level." });
      return;
    }

    const subs = await pool.query<{ max_t: number }>(
      `SELECT MAX(u.hierarchy_tier)::int AS max_t
       FROM reporting_links rl
       JOIN users u ON u.id = rl.subordinate_id AND u.company_id = rl.company_id
       WHERE rl.company_id = $1 AND rl.supervisor_id = $2`,
      [companyId, userId],
    );
    const maxSubTier = subs.rows[0]?.max_t ?? null;
    if (maxSubTier != null && tier <= maxSubTier) {
      res.status(400).json({
        message: `Tier must stay above everyone who reports to this person (current max subordinate tier is ${maxSubTier}).`,
      });
      return;
    }

    const sups = await pool.query<{ min_t: number }>(
      `SELECT MIN(u.hierarchy_tier)::int AS min_t
       FROM reporting_links rl
       JOIN users u ON u.id = rl.supervisor_id AND u.company_id = rl.company_id
       WHERE rl.company_id = $1 AND rl.subordinate_id = $2`,
      [companyId, userId],
    );
    const minSupTier = sups.rows[0]?.min_t ?? null;
    if (minSupTier != null && tier >= minSupTier) {
      res.status(400).json({
        message: `Tier must stay below every supervisor (current min supervisor tier is ${minSupTier}).`,
      });
      return;
    }

    await pool.query(`UPDATE users SET hierarchy_tier = $1 WHERE id = $2 AND company_id = $3`, [
      tier,
      userId,
      companyId,
    ]);

    res.json({ success: true, hierarchyTier: tier });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    console.error("updateUserHierarchyTier", e);
    res.status(500).json({ message: "Could not update tier." });
  }
}
