-- Adds a hierarchy tier column to the company_roles table
-- which will synchronize across all users with that role

ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS hierarchy_tier INTEGER NOT NULL DEFAULT 0;
