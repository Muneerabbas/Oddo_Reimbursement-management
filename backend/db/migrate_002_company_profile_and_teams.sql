-- Run once on existing databases that used the older init.sql (before company profile + teams).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(200);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

CREATE TABLE IF NOT EXISTS company_roles (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  base_role VARCHAR(20) NOT NULL CHECK (base_role IN ('employee', 'manager')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_roles_company_name_unique UNIQUE (company_id, name)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role_id INTEGER REFERENCES company_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_role_id ON users(company_role_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id ON company_roles(company_id);
