import type { PoolClient } from "pg";
import {
  defaultEmployeePermissions,
  defaultManagerPermissions,
  mergePermissions,
  type RolePermissions,
} from "./permissions";

export async function insertDefaultCompanyRoles(client: PoolClient, companyId: number): Promise<void> {
  const emp = JSON.stringify(defaultEmployeePermissions());
  const mgr = JSON.stringify(defaultManagerPermissions());
  await client.query(
    `INSERT INTO company_roles (company_id, name, base_role, permissions) VALUES
       ($1, 'Employee', 'employee', $2::jsonb),
       ($1, 'Manager', 'manager', $3::jsonb)
     ON CONFLICT ON CONSTRAINT company_roles_company_name_unique DO NOTHING`,
    [companyId, emp, mgr],
  );
}

export function permissionsFromInput(
  baseRole: "employee" | "manager",
  partial?: Partial<Record<keyof RolePermissions, boolean>>,
): RolePermissions {
  const base =
    baseRole === "manager" ? defaultManagerPermissions() : defaultEmployeePermissions();
  return partial ? mergePermissions(base, partial) : base;
}
