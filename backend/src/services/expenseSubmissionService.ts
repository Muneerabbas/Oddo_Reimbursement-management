import { pool } from "../config/db";
import type { CreateExpenseSubmissionInput } from "../schemas/expenseSchemas";

type CreateExpenseSubmissionRecordInput = CreateExpenseSubmissionInput & {
  companyId: number;
  employeeId: number;
  receiptFileName: string;
  receiptMimeType: string;
  receiptSize: number;
  receiptData: Buffer;
};

type ExpenseSubmissionRow = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  receipt_file_name: string;
  receipt_mime_type: string;
  receipt_size: number;
  created_at: string;
};

let ensureExpenseSubmissionsTablePromise: Promise<void> | null = null;

const ensureExpenseSubmissionsTableExists = async (): Promise<void> => {
  if (!ensureExpenseSubmissionsTablePromise) {
    ensureExpenseSubmissionsTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS expense_submissions (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expense_date DATE NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
          currency VARCHAR(3) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
          receipt_file_name VARCHAR(255) NOT NULL,
          receipt_mime_type VARCHAR(255) NOT NULL,
          receipt_size INTEGER NOT NULL CHECK (receipt_size >= 0),
          receipt_data BYTEA NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_expense_submissions_company_id ON expense_submissions(company_id);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_employee_id ON expense_submissions(employee_id);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_created_at ON expense_submissions(created_at);
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureExpenseSubmissionsTablePromise = null;
        throw error;
      });
  }

  await ensureExpenseSubmissionsTablePromise;
};

const mapExpenseSubmissionRow = (row: ExpenseSubmissionRow) => ({
  id: `EXP-${row.id}`,
  date: row.expense_date,
  category: row.category,
  description: row.description,
  amount: Number(row.amount),
  currency: row.currency,
  status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
  receiptFileName: row.receipt_file_name,
  receiptMimeType: row.receipt_mime_type,
  receiptSize: row.receipt_size,
  createdAt: row.created_at,
});

export const createExpenseSubmission = async (input: CreateExpenseSubmissionRecordInput) => {
  await ensureExpenseSubmissionsTableExists();

  const result = await pool.query<ExpenseSubmissionRow>(
    `
      INSERT INTO expense_submissions (
        company_id,
        employee_id,
        expense_date,
        category,
        description,
        amount,
        currency,
        receipt_file_name,
        receipt_mime_type,
        receipt_size,
        receipt_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        expense_date,
        category,
        description,
        amount,
        currency,
        status,
        receipt_file_name,
        receipt_mime_type,
        receipt_size,
        created_at
    `,
    [
      input.companyId,
      input.employeeId,
      input.date,
      input.category,
      input.description,
      input.amount,
      input.currency.toUpperCase(),
      input.receiptFileName,
      input.receiptMimeType,
      input.receiptSize,
      input.receiptData,
    ],
  );

  return mapExpenseSubmissionRow(result.rows[0]);
};

export const listExpenseSubmissionsForUser = async (companyId: number, employeeId: number) => {
  await ensureExpenseSubmissionsTableExists();

  const result = await pool.query<ExpenseSubmissionRow>(
    `
      SELECT
        id,
        expense_date,
        category,
        description,
        amount,
        currency,
        status,
        receipt_file_name,
        receipt_mime_type,
        receipt_size,
        created_at
      FROM expense_submissions
      WHERE company_id = $1 AND employee_id = $2
      ORDER BY created_at DESC
    `,
    [companyId, employeeId],
  );

  return result.rows.map(mapExpenseSubmissionRow);
};
