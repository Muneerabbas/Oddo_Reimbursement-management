import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { pool } from "../config/db";
import {
  createCompanyRoleSchema,
  createTeamMemberSchema,
  updateCompanyRoleSchema,
  updateTeamMemberSchema,
} from "../schemas/teamSchemas";
import type { RolePermissions } from "../utils/permissions";
import { permissionsFromInput } from "../utils/seedCompanyRoles";

const BCRYPT_ROUNDS = 12;

function sendZodError(res: Response, err: ZodError): void {
  const first = err.issues[0];
  res.status(400).json({
    message: first?.message ?? "Validation failed",
    errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

async function assertManagerAboveTier(
  companyId: number,
  managerId: number,
  subordinateTier: number,
): Promise<string | null> {
  const mgr = await pool.query<{ hierarchy_tier: number }>(
    `SELECT hierarchy_tier FROM users WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
    [managerId, companyId],
  );
  if (mgr.rows.length === 0) {
    return "Manager must be an existing manager in your company.";
  }
  if (mgr.rows[0].hierarchy_tier >= subordinateTier) {
    return "Line manager must be on a higher level than the member, so the manager tier must be lower.";
  }
  return null;
}

async function assertRoleTierKeepsLinksValid(
  companyId: number,
  roleId: number,
  nextTier: number,
): Promise<string | null> {
  const subordinateConflict = await pool.query<{ full_name: string; hierarchy_tier: number }>(
    `SELECT u.full_name, sup.hierarchy_tier
     FROM users u
     JOIN reporting_links rl ON rl.company_id = u.company_id AND rl.subordinate_id = u.id
     JOIN users sup ON sup.id = rl.supervisor_id AND sup.company_id = rl.company_id
     WHERE u.company_id = $1 AND u.company_role_id = $2 AND sup.hierarchy_tier >= $3
     LIMIT 1`,
    [companyId, roleId, nextTier],
  );
  if (subordinateConflict.rows.length > 0) {
    return "This tier would place at least one role member above or level with their current supervisor.";
  }

  const supervisorConflict = await pool.query<{ full_name: string; hierarchy_tier: number }>(
    `SELECT u.full_name, sub.hierarchy_tier
     FROM users u
     JOIN reporting_links rl ON rl.company_id = u.company_id AND rl.supervisor_id = u.id
     JOIN users sub ON sub.id = rl.subordinate_id AND sub.company_id = rl.company_id
     WHERE u.company_id = $1 AND u.company_role_id = $2 AND sub.hierarchy_tier <= $3
     LIMIT 1`,
    [companyId, roleId, nextTier],
  );
  if (supervisorConflict.rows.length > 0) {
    return "This tier would place at least one role member below or level with a direct report they supervise.";
  }

  return null;
}

function mapRoleRow(row: {
  id: number;
  name: string;
  base_role: string;
  permissions: unknown;
  created_at: Date;
  hierarchy_tier?: number;
}) {
  return {
    id: row.id,
    name: row.name,
    baseRole: row.base_role,
    permissions: row.permissions,
    createdAt: row.created_at,
    hierarchyTier: row.hierarchy_tier ?? 0,
  };
}

export async function listRoles(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.auth!.companyId;
    const r = await pool.query(
      `SELECT id, name, base_role, permissions, created_at, hierarchy_tier
       FROM company_roles WHERE company_id = $1 ORDER BY name ASC`,
      [companyId],
    );
    res.json({ roles: r.rows.map(mapRoleRow) });
  } catch (e) {
    console.error("listRoles", e);
    res.status(500).json({ message: "Could not load team roles." });
  }
}

export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    const body = createCompanyRoleSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const perms = permissionsFromInput(body.baseRole, body.permissions ?? undefined);
    const r = await pool.query(
      `INSERT INTO company_roles (company_id, name, base_role, permissions, hierarchy_tier)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id, name, base_role, permissions, created_at, hierarchy_tier`,
      [companyId, body.name.trim(), body.baseRole, JSON.stringify(perms), body.hierarchyTier ?? 10],
    );
    res.status(201).json({ role: mapRoleRow(r.rows[0]) });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ message: "A role with this name already exists." });
      return;
    }
    console.error("createRole", e);
    res.status(500).json({ message: "Could not create role." });
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: "Invalid role id." });
      return;
    }
    const body = updateCompanyRoleSchema.parse(req.body);
    const companyId = req.auth!.companyId;

    const existing = await pool.query<{
      id: number;
      base_role: string;
      permissions: RolePermissions;
      hierarchy_tier: number;
    }>(
      `SELECT id, base_role, permissions, hierarchy_tier FROM company_roles WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ message: "Role not found." });
      return;
    }

    const row = existing.rows[0];
    const nextName = body.name?.trim() ?? undefined;
    const mergedPerms =
      body.permissions !== undefined
        ? { ...row.permissions, ...body.permissions }
        : row.permissions;
    const nextHierarchyTier = body.hierarchyTier ?? row.hierarchy_tier;
    if (nextHierarchyTier !== row.hierarchy_tier) {
      const tierError = await assertRoleTierKeepsLinksValid(companyId, id, nextHierarchyTier);
      if (tierError) {
        res.status(400).json({ message: tierError });
        return;
      }
    }

    const r = await pool.query(
      `UPDATE company_roles
       SET name = COALESCE($1, name), permissions = $2::jsonb, hierarchy_tier = $3
       WHERE id = $4 AND company_id = $5
       RETURNING id, name, base_role, permissions, created_at, hierarchy_tier`,
      [nextName ?? null, JSON.stringify(mergedPerms), nextHierarchyTier, id, companyId],
    );
    
    if (nextHierarchyTier !== row.hierarchy_tier) {
      await pool.query(
        `UPDATE users SET hierarchy_tier = $1 WHERE company_role_id = $2 AND company_id = $3 AND role != 'admin'`,
        [nextHierarchyTier, id, companyId],
      );
    }
    
    res.json({ role: mapRoleRow(r.rows[0]) });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ message: "A role with this name already exists." });
      return;
    }
    console.error("updateRole", e);
    res.status(500).json({ message: "Could not update role." });
  }
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: "Invalid role id." });
    return;
  }
  const companyId = req.auth!.companyId;

  const inUse = await pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE company_role_id = $1`, [
    id,
  ]);
  if (inUse.rows[0].n > 0) {
    res.status(400).json({ message: "Cannot delete a role that is assigned to team members." });
    return;
  }

  const del = await pool.query(
    `DELETE FROM company_roles WHERE id = $1 AND company_id = $2 RETURNING id`,
    [id, companyId],
  );
  if (del.rowCount === 0) {
    res.status(404).json({ message: "Role not found." });
    return;
  }
  res.status(204).send();
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.auth!.companyId;
    const r = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.manager_id, u.company_role_id, u.hierarchy_tier,
              cr.name AS team_role_name, cr.base_role AS team_role_base,
              m.full_name AS manager_name
       FROM users u
       LEFT JOIN company_roles cr ON cr.id = u.company_role_id
       LEFT JOIN users m ON m.id = u.manager_id AND m.company_id = u.company_id
       WHERE u.company_id = $1
       ORDER BY u.full_name ASC`,
      [companyId],
    );
    res.json({
      members: r.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        systemRole: row.role,
        hierarchyTier: row.hierarchy_tier,
        managerId: row.manager_id,
        managerName: row.manager_name,
        companyRole: row.company_role_id
          ? {
              id: row.company_role_id,
              name: row.team_role_name,
              baseRole: row.team_role_base,
            }
          : null,
      })),
    });
  } catch (e) {
    console.error("listMembers", e);
    res.status(500).json({ message: "Could not load team members." });
  }
}

export async function listManagers(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.auth!.companyId;
    const r = await pool.query(
      `SELECT id, full_name, email FROM users
       WHERE company_id = $1 AND role = 'manager'
       ORDER BY full_name ASC`,
      [companyId],
    );
    res.json({
      managers: r.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
      })),
    });
  } catch (e) {
    console.error("listManagers", e);
    res.status(500).json({ message: "Could not load managers." });
  }
}

export async function createMember(req: Request, res: Response): Promise<void> {
  try {
    const body = createTeamMemberSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const emailNorm = body.email.trim().toLowerCase();

    const roleRes = await pool.query<{ base_role: string; hierarchy_tier: number }>(
      `SELECT base_role, hierarchy_tier FROM company_roles WHERE id = $1 AND company_id = $2`,
      [body.companyRoleId, companyId],
    );
    if (roleRes.rows.length === 0) {
      res.status(400).json({ message: "Invalid team role for this company." });
      return;
    }
    const baseRole = roleRes.rows[0].base_role as "employee" | "manager";
    const initialTier = roleRes.rows[0].hierarchy_tier;

    if (body.managerId != null) {
      if (baseRole === "manager" && body.managerId) {
        res.status(400).json({ message: "Managers are not assigned a line manager here." });
        return;
      }
      const managerTierError = await assertManagerAboveTier(companyId, body.managerId, initialTier);
      if (managerTierError) {
        res.status(400).json({ message: managerTierError });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    const ins = await pool.query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, manager_id, company_role_id, hierarchy_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, full_name, email, role, manager_id, company_role_id`,
      [
        companyId,
        emailNorm,
        passwordHash,
        body.fullName.trim(),
        baseRole,
        baseRole === "employee" ? body.managerId ?? null : null,
        body.companyRoleId,
        initialTier,
      ],
    );

    const row = ins.rows[0];

    if (baseRole === "employee" && body.managerId != null) {
      await pool.query(
        `INSERT INTO reporting_links (company_id, subordinate_id, supervisor_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id, subordinate_id, supervisor_id) DO NOTHING`,
        [companyId, row.id, body.managerId],
      );
    }
    res.status(201).json({
      member: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        systemRole: row.role,
        managerId: row.manager_id,
        companyRoleId: row.company_role_id,
      },
    });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ message: "A user with this email already exists." });
      return;
    }
    console.error("createMember", e);
    res.status(500).json({ message: "Could not add team member." });
  }
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  try {
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId)) {
      res.status(400).json({ message: "Invalid member id." });
      return;
    }
    const body = updateTeamMemberSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const adminId = req.auth!.userId;

    const cur = await pool.query<{
      role: string;
      company_role_id: number | null;
      manager_id: number | null;
    }>(`SELECT role, company_role_id, manager_id FROM users WHERE id = $1 AND company_id = $2`, [
      memberId,
      companyId,
    ]);
    if (cur.rows.length === 0) {
      res.status(404).json({ message: "Member not found." });
      return;
    }

    if (cur.rows[0].role === "admin") {
      res.status(400).json({ message: "Organization admins cannot be edited from Teams." });
      return;
    }

    let nextSystemRole: string | undefined;
    let nextCompanyRoleId: number | undefined;
    let nextTier: number | undefined;
    if (body.companyRoleId !== undefined) {
      const roleRes = await pool.query<{ base_role: string; hierarchy_tier: number }>(
        `SELECT base_role, hierarchy_tier FROM company_roles WHERE id = $1 AND company_id = $2`,
        [body.companyRoleId, companyId],
      );
      if (roleRes.rows.length === 0) {
        res.status(400).json({ message: "Invalid team role." });
        return;
      }
      nextSystemRole = roleRes.rows[0].base_role;
      nextCompanyRoleId = body.companyRoleId;
      nextTier = roleRes.rows[0].hierarchy_tier;
    }

    let nextManagerId: number | null | undefined = undefined;
    if (body.managerId !== undefined) {
      if (body.managerId === null) {
        nextManagerId = null;
      } else {
        if (memberId === body.managerId) {
          res.status(400).json({ message: "A user cannot be their own manager." });
          return;
        }
        const mgr = await pool.query(
          `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
          [body.managerId, companyId],
        );
        if (mgr.rows.length === 0) {
          res.status(400).json({ message: "Invalid manager." });
          return;
        }
        nextManagerId = body.managerId;
      }
    }

    const u = cur.rows[0];
    const finalRole = nextSystemRole ?? u.role;
    const finalCompanyRoleId = nextCompanyRoleId ?? u.company_role_id;
    let finalManagerId = u.manager_id;
    if (nextManagerId !== undefined) {
      finalManagerId = nextManagerId;
    }
    if (finalRole === "manager") {
      finalManagerId = null;
    }

    if (finalRole === "employee" && finalManagerId != null) {
      const effectiveTier = nextTier ?? (await pool.query<{ hierarchy_tier: number }>(
        `SELECT hierarchy_tier FROM users WHERE id = $1 AND company_id = $2`,
        [memberId, companyId],
      )).rows[0]?.hierarchy_tier;
      const managerTierError = await assertManagerAboveTier(companyId, finalManagerId, effectiveTier);
      if (managerTierError) {
        res.status(400).json({ message: managerTierError });
        return;
      }
    }

    await pool.query(
      `UPDATE users SET role = $1, company_role_id = $2, manager_id = $3
       WHERE id = $4 AND company_id = $5`,
      [finalRole, finalCompanyRoleId, finalManagerId, memberId, companyId],
    );
    
    if (nextTier !== undefined) {
      await pool.query(
        `UPDATE users SET hierarchy_tier = $1 WHERE id = $2 AND company_id = $3 AND role != 'admin'`,
        [nextTier, memberId, companyId],
      );
    }

    res.json({ success: true });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    console.error("updateMember", e);
    res.status(500).json({ message: "Could not update member." });
  }
}

export async function deleteMember(req: Request, res: Response): Promise<void> {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId)) {
    res.status(400).json({ message: "Invalid member id." });
    return;
  }
  const companyId = req.auth!.companyId;
  const adminId = req.auth!.userId;

  if (memberId === adminId) {
    res.status(400).json({ message: "You cannot remove your own account." });
    return;
  }

  const target = await pool.query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1 AND company_id = $2`,
    [memberId, companyId],
  );
  if (target.rows.length === 0) {
    res.status(404).json({ message: "Member not found." });
    return;
  }

  if (target.rows[0].role === "admin") {
    const admins = await pool.query(`SELECT COUNT(*)::int AS n FROM users WHERE company_id = $1 AND role = 'admin'`, [
      companyId,
    ]);
    if (admins.rows[0].n <= 1) {
      res.status(400).json({ message: "Cannot remove the only company administrator." });
      return;
    }
  }

  await pool.query(`DELETE FROM users WHERE id = $1 AND company_id = $2`, [memberId, companyId]);
  res.status(204).send();
}
