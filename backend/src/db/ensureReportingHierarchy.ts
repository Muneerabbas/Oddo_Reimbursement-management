import { pool } from "../config/db";

const ADMIN_TOP_TIER = 0;
const DEFAULT_MANAGER_TIER = 20;

/**
 * Idempotent DDL so existing databases (that never ran migrate_003) get
 * hierarchy_tier + reporting_links before any controller queries them.
 */
export async function ensureReportingHierarchySchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy_tier INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_hierarchy_tier_check`);
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_hierarchy_tier_check
      CHECK (hierarchy_tier >= 0 AND hierarchy_tier <= 999)
    `);

    await client.query(`UPDATE users SET hierarchy_tier = $1 WHERE role = 'admin'`, [ADMIN_TOP_TIER]);
    await client.query(
      `UPDATE users SET hierarchy_tier = $1 WHERE role = 'manager' AND hierarchy_tier = 0`,
      [DEFAULT_MANAGER_TIER],
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS reporting_links (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        subordinate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supervisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT reporting_links_no_self CHECK (subordinate_id <> supervisor_id),
        CONSTRAINT reporting_links_pair_unique UNIQUE (company_id, subordinate_id, supervisor_id)
      )
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_hierarchy_tier ON users(company_id, hierarchy_tier)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_reporting_links_company ON reporting_links(company_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_reporting_links_sub ON reporting_links(subordinate_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_reporting_links_sup ON reporting_links(supervisor_id)`,
    );

    await client.query(`
      INSERT INTO reporting_links (company_id, subordinate_id, supervisor_id)
      SELECT u.company_id, u.id, u.manager_id
      FROM users u
      WHERE u.manager_id IS NOT NULL
      ON CONFLICT (company_id, subordinate_id, supervisor_id) DO NOTHING
    `);

    await client.query("COMMIT");
    console.log("DB schema OK: hierarchy_tier + reporting_links");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("ensureReportingHierarchySchema failed:", e);
    throw e;
  } finally {
    client.release();
  }
}
