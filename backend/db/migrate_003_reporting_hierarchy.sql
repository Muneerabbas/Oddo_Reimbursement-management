-- Reporting graph: tiers + many-to-many supervisor links (run once on existing DBs).

ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy_tier INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_hierarchy_tier_check;
ALTER TABLE users ADD CONSTRAINT users_hierarchy_tier_check CHECK (hierarchy_tier >= 0 AND hierarchy_tier <= 999);

UPDATE users SET hierarchy_tier = 100 WHERE role = 'admin';
UPDATE users SET hierarchy_tier = 20 WHERE role = 'manager';
UPDATE users SET hierarchy_tier = 0 WHERE role = 'employee';

CREATE TABLE IF NOT EXISTS reporting_links (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subordinate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reporting_links_no_self CHECK (subordinate_id <> supervisor_id),
  CONSTRAINT reporting_links_pair_unique UNIQUE (company_id, subordinate_id, supervisor_id)
);

CREATE INDEX IF NOT EXISTS idx_users_hierarchy_tier ON users(company_id, hierarchy_tier);
CREATE INDEX IF NOT EXISTS idx_reporting_links_company ON reporting_links(company_id);
CREATE INDEX IF NOT EXISTS idx_reporting_links_sub ON reporting_links(subordinate_id);
CREATE INDEX IF NOT EXISTS idx_reporting_links_sup ON reporting_links(supervisor_id);

-- Seed links from legacy manager_id (one supervisor per employee).
INSERT INTO reporting_links (company_id, subordinate_id, supervisor_id)
SELECT u.company_id, u.id, u.manager_id
FROM users u
WHERE u.manager_id IS NOT NULL
ON CONFLICT ON CONSTRAINT reporting_links_pair_unique DO NOTHING;
