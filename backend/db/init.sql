CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admin_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'finance', 'auditor')),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE companies
  ADD CONSTRAINT companies_admin_user_fk
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_original DECIMAL(12, 2) NOT NULL CHECK (amount_original >= 0),
  currency_original VARCHAR(3) NOT NULL,
  amount_converted DECIMAL(12, 2) NOT NULL CHECK (amount_converted >= 0),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rules_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department VARCHAR(100) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL CHECK (amount >= 0),
  period VARCHAR(50) NOT NULL,
  spent DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT budgets_company_department_period_unique UNIQUE (company_id, department, period)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_rates (
  base_currency VARCHAR(3) PRIMARY KEY,
  rates_json JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  ocr_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_approval_requests_expense_id ON approval_requests(expense_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver_id ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_rules_company_id ON approval_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_company_id ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_expense_id ON audit_logs(expense_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_ocr_status ON bills(ocr_status);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER trg_approval_requests_updated_at
BEFORE UPDATE ON approval_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
