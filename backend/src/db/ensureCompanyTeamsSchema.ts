import { pool } from "../config/db";

/**
 * Idempotent DDL for DBs that never ran migrate_002 (company_roles, users.company_role_id, company profile columns).
 * Without this, /api/teams/* queries throw and Express returns 500.
 */
export async function ensureCompanyTeamsSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_code CHAR(2)`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS about TEXT`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(500)`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(200)`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS company_roles (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        base_role VARCHAR(20) NOT NULL CHECK (base_role IN ('employee', 'manager')),
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT company_roles_company_name_unique UNIQUE (company_id, name)
      )
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role_id INTEGER REFERENCES company_roles(id) ON DELETE SET NULL
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_company_role_id ON users(company_role_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON company_roles(company_id)`,
    );

    await client.query("COMMIT");
    console.log("DB schema OK: company_roles + company profile columns");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("ensureCompanyTeamsSchema failed:", e);
    throw e;
  } finally {
    client.release();
  }
}
