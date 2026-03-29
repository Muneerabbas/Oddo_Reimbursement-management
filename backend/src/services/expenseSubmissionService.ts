import { pool } from "../config/db";
import type { CreateExpenseSubmissionInput } from "../schemas/expenseSchemas";
import {
  backfillMissingApprovalRequestsForPendingExpenses,
  initializeApprovalWorkflow,
  listPendingApprovalsForApprover,
  resolveApprovalDecision,
} from "./approvalWorkflowService";

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
  legacy_expense_id?: number | null;
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

type ExpenseLogRow = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  receipt_file_name: string;
  created_at: string;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  approval_comment: string | null;
};

type ExpenseDocumentRow = {
  id: number;
  receipt_file_name: string;
  receipt_mime_type: string;
  receipt_data: Buffer;
};

type PendingApprovalRow = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  receipt_file_name: string;
  created_at: string;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  manager_id: number | null;
  manager_name: string | null;
};

type ResolvedApprovalRow = {
  id: number;
  status: string;
  approval_comment: string | null;
  reviewed_at: string | null;
};

let ensureExpenseSubmissionsTablePromise: Promise<void> | null = null;

const normalizeRole = (role: string) => role.trim().toLowerCase();
const isAdminRole = (role: string) => role === "admin";
const isManagerRole = (role: string) => role === "manager";
const canReviewExpenses = (role: string) => isAdminRole(role) || isManagerRole(role);
const formatStatus = (status: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

export const ensureExpenseSubmissionsTableExists = async (): Promise<void> => {
  if (!ensureExpenseSubmissionsTablePromise) {
    ensureExpenseSubmissionsTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS expense_submissions (
          id SERIAL PRIMARY KEY,
          legacy_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
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
          approval_comment TEXT,
          reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          reviewed_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE expense_submissions ADD COLUMN IF NOT EXISTS approval_comment TEXT;
        ALTER TABLE expense_submissions ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE expense_submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL;
        ALTER TABLE expense_submissions ADD COLUMN IF NOT EXISTS legacy_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_expense_submissions_company_id ON expense_submissions(company_id);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_employee_id ON expense_submissions(employee_id);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_created_at ON expense_submissions(created_at);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_status ON expense_submissions(company_id, status, created_at);
        CREATE INDEX IF NOT EXISTS idx_expense_submissions_legacy_expense_id ON expense_submissions(legacy_expense_id);
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
  legacyExpenseId: row.legacy_expense_id ?? null,
  date: row.expense_date,
  category: row.category,
  description: row.description,
  amount: Number(row.amount),
  currency: row.currency,
  status: formatStatus(row.status),
  receiptFileName: row.receipt_file_name,
  receiptMimeType: row.receipt_mime_type,
  receiptSize: row.receipt_size,
  createdAt: row.created_at,
});

const mapExpenseLogRow = (row: ExpenseLogRow) => ({
  id: `EXP-${row.id}`,
  date: row.expense_date,
  category: row.category,
  description: row.description,
  amount: Number(row.amount),
  currency: row.currency,
  status: formatStatus(row.status),
  receiptFileName: row.receipt_file_name,
  createdAt: row.created_at,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  employeeEmail: row.employee_email,
  reviewedById: row.reviewed_by,
  reviewedByName: row.reviewed_by_name,
  reviewedAt: row.reviewed_at,
  approvalComment: row.approval_comment ?? "",
});

const mapPendingApprovalRow = (row: PendingApprovalRow, reviewerRole: string) => ({
  id: `EXP-${row.id}`,
  date: row.expense_date,
  category: row.category,
  description: row.description,
  amount: Number(row.amount),
  currency: row.currency,
  status: formatStatus(row.status),
  receiptFileName: row.receipt_file_name,
  createdAt: row.created_at,
  employeeId: row.employee_id,
  employeeName: row.employee_name,
  employeeEmail: row.employee_email,
  managerId: row.manager_id,
  managerName: row.manager_name,
  approvalStep: isAdminRole(reviewerRole) ? "Finance / Admin Review" : "Manager Review",
});

export const createExpenseSubmission = async (input: CreateExpenseSubmissionRecordInput) => {
  await ensureExpenseSubmissionsTableExists();
  const client = await pool.connect();
  let submissionId: number | null = null;
  let legacyExpenseId: number | null = null;

  try {
    await client.query("BEGIN");

    const insertedSubmission = await client.query<ExpenseSubmissionRow>(
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
        RETURNING id
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
    submissionId = insertedSubmission.rows[0].id;

    const insertedExpense = await client.query<{ id: number }>(
      `
        INSERT INTO expenses (
          company_id,
          employee_id,
          amount_original,
          currency_original,
          amount_converted,
          category,
          description,
          expense_date,
          receipt_url,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, 'pending')
        RETURNING id
      `,
      [
        input.companyId,
        input.employeeId,
        input.amount,
        input.currency.toUpperCase(),
        input.amount,
        input.category,
        input.description,
        input.date,
      ],
    );
    legacyExpenseId = insertedExpense.rows[0].id;

    await client.query(
      `UPDATE expense_submissions SET legacy_expense_id = $1 WHERE id = $2`,
      [legacyExpenseId, submissionId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!submissionId || !legacyExpenseId) {
    throw new Error("Failed to initialize expense workflow.");
  }

  await initializeApprovalWorkflow({
    companyId: input.companyId,
    employeeId: input.employeeId,
    expenseId: legacyExpenseId,
    amount: input.amount,
  });

  const result = await pool.query<ExpenseSubmissionRow>(
    `
      SELECT
        id,
        legacy_expense_id,
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
      WHERE id = $1
    `,
    [submissionId],
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

export const listExpenseLogsForViewer = async (
  companyId: number,
  viewerId: number,
  viewerRole: string,
) => {
  await ensureExpenseSubmissionsTableExists();
  const normalizedRole = normalizeRole(viewerRole);

  if (isAdminRole(normalizedRole)) {
    const result = await pool.query<ExpenseLogRow>(
      `
        SELECT
          es.id,
          es.expense_date,
          es.category,
          es.description,
          es.amount,
          es.currency,
          es.status,
          es.receipt_file_name,
          es.created_at,
          u.id AS employee_id,
          u.full_name AS employee_name,
          u.email AS employee_email,
          es.reviewed_by,
          rv.full_name AS reviewed_by_name,
          es.reviewed_at,
          es.approval_comment
        FROM expense_submissions es
        JOIN users u
          ON u.id = es.employee_id
         AND u.company_id = es.company_id
        LEFT JOIN users rv
          ON rv.id = es.reviewed_by
         AND rv.company_id = es.company_id
        WHERE es.company_id = $1
        ORDER BY COALESCE(es.reviewed_at, es.created_at) DESC, es.id DESC
      `,
      [companyId],
    );

    return result.rows.map(mapExpenseLogRow);
  }

  if (isManagerRole(normalizedRole)) {
    const result = await pool.query<ExpenseLogRow>(
      `
        WITH RECURSIVE scope AS (
          SELECT rl.subordinate_id
          FROM reporting_links rl
          WHERE rl.company_id = $1
            AND rl.supervisor_id = $2
          UNION
          SELECT rl.subordinate_id
          FROM reporting_links rl
          JOIN scope s
            ON s.subordinate_id = rl.supervisor_id
          WHERE rl.company_id = $1
        )
        SELECT
          es.id,
          es.expense_date,
          es.category,
          es.description,
          es.amount,
          es.currency,
          es.status,
          es.receipt_file_name,
          es.created_at,
          u.id AS employee_id,
          u.full_name AS employee_name,
          u.email AS employee_email,
          es.reviewed_by,
          rv.full_name AS reviewed_by_name,
          es.reviewed_at,
          es.approval_comment
        FROM expense_submissions es
        JOIN users u
          ON u.id = es.employee_id
         AND u.company_id = es.company_id
        LEFT JOIN users rv
          ON rv.id = es.reviewed_by
         AND rv.company_id = es.company_id
        WHERE es.company_id = $1
          AND (
            es.employee_id = $2
            OR es.employee_id IN (SELECT subordinate_id FROM scope)
          )
        ORDER BY COALESCE(es.reviewed_at, es.created_at) DESC, es.id DESC
      `,
      [companyId, viewerId],
    );

    return result.rows.map(mapExpenseLogRow);
  }

  return [];
};

export const listPendingApprovalsForReviewer = async (
  companyId: number,
  reviewerId: number,
  reviewerRole: string,
) => {
  const normalizedRole = normalizeRole(reviewerRole);

  if (!canReviewExpenses(normalizedRole)) {
    return [];
  }
  await backfillMissingApprovalRequestsForPendingExpenses(companyId);
  return listPendingApprovalsForApprover(
    companyId,
    reviewerId,
    isAdminRole(normalizedRole),
  );
};

export const resolvePendingApproval = async (
  companyId: number,
  reviewerId: number,
  reviewerRole: string,
  expenseId: number,
  action: "approved" | "rejected",
  comment: string,
) => {
  const normalizedRole = normalizeRole(reviewerRole);

  if (!canReviewExpenses(normalizedRole)) {
    return null;
  }
  const numericApprovalId = Number(String(expenseId).replace(/^APR-/i, ""));
  if (!Number.isFinite(numericApprovalId)) {
    return null;
  }

  const result = await resolveApprovalDecision({
    companyId,
    approverId: reviewerId,
    approvalId: numericApprovalId,
    action,
    comment,
    allowAdminOverride: isAdminRole(normalizedRole),
  });

  return {
    id: `APR-${numericApprovalId}`,
    status: formatStatus(result.status),
    comment,
    reviewedAt: new Date().toISOString(),
  };
};

export const getExpenseSubmissionDocumentForViewer = async (
  companyId: number,
  viewerId: number,
  viewerRole: string,
  expenseId: number,
) => {
  await ensureExpenseSubmissionsTableExists();
  const normalizedRole = normalizeRole(viewerRole);

  if (isAdminRole(normalizedRole)) {
    const result = await pool.query<ExpenseDocumentRow>(
      `
        SELECT
          id,
          receipt_file_name,
          receipt_mime_type,
          receipt_data
        FROM expense_submissions
        WHERE company_id = $1
          AND id = $2
      `,
      [companyId, expenseId],
    );
    return result.rows[0] ?? null;
  }

  if (isManagerRole(normalizedRole)) {
    const result = await pool.query<ExpenseDocumentRow>(
      `
        WITH RECURSIVE scope AS (
          SELECT rl.subordinate_id
          FROM reporting_links rl
          WHERE rl.company_id = $1
            AND rl.supervisor_id = $2
          UNION
          SELECT rl.subordinate_id
          FROM reporting_links rl
          JOIN scope s
            ON s.subordinate_id = rl.supervisor_id
          WHERE rl.company_id = $1
        )
        SELECT
          es.id,
          es.receipt_file_name,
          es.receipt_mime_type,
          es.receipt_data
        FROM expense_submissions es
        WHERE es.company_id = $1
          AND es.id = $3
          AND (
            es.employee_id = $2
            OR es.employee_id IN (SELECT subordinate_id FROM scope)
          )
      `,
      [companyId, viewerId, expenseId],
    );
    return result.rows[0] ?? null;
  }

  const result = await pool.query<ExpenseDocumentRow>(
    `
      SELECT
        id,
        receipt_file_name,
        receipt_mime_type,
        receipt_data
      FROM expense_submissions
      WHERE company_id = $1
        AND employee_id = $2
        AND id = $3
    `,
    [companyId, viewerId, expenseId],
  );

  return result.rows[0] ?? null;
};
