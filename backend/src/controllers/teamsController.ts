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

function mapRoleRow(row: {
  id: number;
  name: string;
  base_role: string;
  permissions: unknown;
  created_at: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    baseRole: row.base_role,
    permissions: row.permissions,
    createdAt: row.created_at,
  };
}

export async function listRoles(req: Request, res: Response): Promise<void> {
  const companyId = req.auth!.companyId;
  const r = await pool.query(
    `SELECT id, name, base_role, permissions, created_at
     FROM company_roles WHERE company_id = $1 ORDER BY name ASC`,
    [companyId],
  );
  res.json({ roles: r.rows.map(mapRoleRow) });
}

export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    const body = createCompanyRoleSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const perms = permissionsFromInput(body.baseRole, body.permissions ?? undefined);
    const r = await pool.query(
      `INSERT INTO company_roles (company_id, name, base_role, permissions)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, name, base_role, permissions, created_at`,
      [companyId, body.name.trim(), body.baseRole, JSON.stringify(perms)],
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
    }>(
      `SELECT id, base_role, permissions FROM company_roles WHERE id = $1 AND company_id = $2`,
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

    const r = await pool.query(
      `UPDATE company_roles
       SET name = COALESCE($1, name), permissions = $2::jsonb
       WHERE id = $3 AND company_id = $4
       RETURNING id, name, base_role, permissions, created_at`,
      [nextName ?? null, JSON.stringify(mergedPerms), id, companyId],
    );
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
  const companyId = req.auth!.companyId;
  const r = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.manager_id, u.company_role_id,
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
}

export async function listManagers(req: Request, res: Response): Promise<void> {
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
}

export async function createMember(req: Request, res: Response): Promise<void> {
  try {
    const body = createTeamMemberSchema.parse(req.body);
    const companyId = req.auth!.companyId;
    const emailNorm = body.email.trim().toLowerCase();

    const roleRes = await pool.query<{ base_role: string }>(
      `SELECT base_role FROM company_roles WHERE id = $1 AND company_id = $2`,
      [body.companyRoleId, companyId],
    );
    if (roleRes.rows.length === 0) {
      res.status(400).json({ message: "Invalid team role for this company." });
      return;
    }
    const baseRole = roleRes.rows[0].base_role as "employee" | "manager";

    if (body.managerId != null) {
      const mgr = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
        [body.managerId, companyId],
      );
      if (mgr.rows.length === 0) {
        res.status(400).json({ message: "Manager must be an existing manager in your company." });
        return;
      }
      if (baseRole === "manager" && body.managerId) {
        res.status(400).json({ message: "Managers are not assigned a line manager here." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    const ins = await pool.query(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, manager_id, company_role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, role, manager_id, company_role_id`,
      [
        companyId,
        emailNorm,
        passwordHash,
        body.fullName.trim(),
        baseRole,
        baseRole === "employee" ? body.managerId ?? null : null,
        body.companyRoleId,
      ],
    );

    const row = ins.rows[0];
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
    if (body.companyRoleId !== undefined) {
      const roleRes = await pool.query<{ base_role: string }>(
        `SELECT base_role FROM company_roles WHERE id = $1 AND company_id = $2`,
        [body.companyRoleId, companyId],
      );
      if (roleRes.rows.length === 0) {
        res.status(400).json({ message: "Invalid team role." });
        return;
      }
      nextSystemRole = roleRes.rows[0].base_role;
      nextCompanyRoleId = body.companyRoleId;
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
      const mgr = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
        [finalManagerId, companyId],
      );
      if (mgr.rows.length === 0) {
        res.status(400).json({ message: "Invalid manager." });
        return;
      }
    }

    await pool.query(
      `UPDATE users SET role = $1, company_role_id = $2, manager_id = $3
       WHERE id = $4 AND company_id = $5`,
      [finalRole, finalCompanyRoleId, finalManagerId, memberId, companyId],
    );

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
