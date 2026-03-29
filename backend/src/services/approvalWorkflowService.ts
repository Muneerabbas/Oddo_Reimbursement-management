import { pool } from "../config/db";

type RuleStep = {
  id: string;
  mode: "role_percentage" | "specific_approver";
  percentage?: number;
  roleIds?: number[];
  approverIds?: number[];
};

type RuleConfig = {
  id: string;
  triggerMode: "amount" | "employee_specific";
  maxAmount?: number;
  employeeIds?: number[];
  steps: RuleStep[];
};

type RuleDoc = { rules?: RuleConfig[] };

async function fetchLatestRuleConfig(companyId: number): Promise<RuleConfig[]> {
  const result = await pool.query<{ rules_json: unknown }>(
    `SELECT rules_json FROM approval_rules WHERE company_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [companyId],
  );
  const doc = (result.rows[0]?.rules_json || {}) as RuleDoc;
  return Array.isArray(doc.rules) ? doc.rules.filter((r) => Array.isArray(r.steps) && r.steps.length > 0) : [];
}

function pickRule(rules: RuleConfig[], employeeId: number, amount: number): RuleConfig | null {
  const specific = rules.find((r) => r.triggerMode === "employee_specific" && (r.employeeIds || []).includes(employeeId));
  if (specific) return specific;

  const amountRules = rules
    .filter((r) => r.triggerMode === "amount" && Number.isFinite(Number(r.maxAmount)))
    .sort((a, b) => Number(a.maxAmount) - Number(b.maxAmount));
  return amountRules.find((r) => amount <= Number(r.maxAmount)) || amountRules[amountRules.length - 1] || null;
}

async function resolveApproversForStep(
  companyId: number,
  employeeId: number,
  step: RuleStep,
): Promise<number[]> {
  if (step.mode === "specific_approver") {
    return Array.from(new Set((step.approverIds || []).map(Number).filter(Boolean)));
  }

  const roleIds = Array.isArray(step.roleIds) ? step.roleIds.map(Number).filter(Boolean) : [];
  const directManagers = await pool.query<{ supervisor_id: number }>(
    `SELECT supervisor_id FROM reporting_links WHERE company_id = $1 AND subordinate_id = $2`,
    [companyId, employeeId],
  );
  const directManagerIds = directManagers.rows.map((r) => r.supervisor_id);
  if (directManagerIds.length > 0 && roleIds.length === 0) {
    return Array.from(new Set(directManagerIds));
  }

  if (roleIds.length > 0) {
    const usersByRole = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE company_id = $1 AND company_role_id = ANY($2::int[])`,
      [companyId, roleIds],
    );
    const merged = [...directManagerIds, ...usersByRole.rows.map((r) => r.id)];
    return Array.from(new Set(merged.filter((id) => id !== employeeId)));
  }

  const fallbackManagers = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE company_id = $1 AND role IN ('manager', 'admin', 'finance')`,
    [companyId],
  );
  return Array.from(new Set(fallbackManagers.rows.map((r) => r.id).filter((id) => id !== employeeId)));
}

async function syncSubmissionStatus(expenseId: number, status: "pending" | "approved" | "rejected"): Promise<void> {
  await pool.query(
    `UPDATE expense_submissions SET status = $1 WHERE legacy_expense_id = $2`,
    [status, expenseId],
  );
}

export async function initializeApprovalWorkflow(input: {
  companyId: number;
  employeeId: number;
  expenseId: number;
  amount: number;
}): Promise<void> {
  const rules = await fetchLatestRuleConfig(input.companyId);
  const selected = pickRule(rules, input.employeeId, input.amount);
  const firstStep: RuleStep = selected?.steps?.[0] || {
    id: "default-step-1",
    mode: "role_percentage",
    percentage: 100,
  };
  const approvers = await resolveApproversForStep(input.companyId, input.employeeId, firstStep);
  if (approvers.length === 0) {
    await pool.query(`UPDATE expenses SET status = 'approved' WHERE id = $1`, [input.expenseId]);
    await syncSubmissionStatus(input.expenseId, "approved");
    return;
  }

  for (const approverId of approvers) {
    await pool.query(
      `INSERT INTO approval_requests (expense_id, approver_id, step_number, status, comments)
       VALUES ($1, $2, $3, 'pending', NULL)`,
      [input.expenseId, approverId, 1],
    );
  }
}

export async function backfillMissingApprovalRequestsForPendingExpenses(companyId: number): Promise<void> {
  const result = await pool.query<{
    id: number;
    employee_id: number;
    amount_original: string;
  }>(
    `
      SELECT
        e.id,
        e.employee_id,
        e.amount_original
      FROM expenses e
      LEFT JOIN approval_requests ar
        ON ar.expense_id = e.id
      WHERE e.company_id = $1
        AND e.status = 'pending'
      GROUP BY e.id, e.employee_id, e.amount_original
      HAVING COUNT(ar.id) = 0
      ORDER BY e.id ASC
    `,
    [companyId],
  );

  for (const row of result.rows) {
    try {
      await initializeApprovalWorkflow({
        companyId,
        employeeId: row.employee_id,
        expenseId: row.id,
        amount: Number(row.amount_original),
      });
    } catch (error) {
      console.error("backfillMissingApprovalRequestsForPendingExpenses", {
        companyId,
        expenseId: row.id,
        error,
      });
    }
  }
}

export async function listPendingApprovalsForApprover(
  companyId: number,
  approverId: number,
  includeAllCompanyPending = false,
) {
  const result = await pool.query<{
    approval_id: number;
    expense_id: number;
    step_number: number;
    employee_name: string;
    amount_original: string;
    currency_original: string;
    category: string;
    description: string;
    expense_date: string;
    status: string;
  }>(
    `SELECT
       ar.id AS approval_id,
       ar.expense_id,
       ar.step_number,
       u.full_name AS employee_name,
       e.amount_original,
       e.currency_original,
       e.category,
       e.description,
       e.expense_date,
       ar.status
     FROM approval_requests ar
     JOIN expenses e ON e.id = ar.expense_id
     JOIN users u ON u.id = e.employee_id
     WHERE e.company_id = $1
       AND ($3::boolean = true OR ar.approver_id = $2)
       AND ar.status = 'pending'
     ORDER BY ar.created_at DESC`,
    [companyId, approverId, includeAllCompanyPending],
  );

  return result.rows.map((r) => ({
    id: `APR-${r.approval_id}`,
    approvalId: r.approval_id,
    expenseId: r.expense_id,
    approvalStep: `Step ${r.step_number}`,
    employeeName: r.employee_name,
    amount: Number(r.amount_original),
    currency: r.currency_original,
    category: r.category,
    description: r.description,
    date: r.expense_date,
    status: r.status,
  }));
}

function thresholdForStep(step: RuleStep): number {
  const raw = Number(step.percentage ?? 100);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0, Math.min(100, raw)) / 100;
}

export async function resolveApprovalDecision(input: {
  companyId: number;
  approverId: number;
  approvalId: number;
  action: "approved" | "rejected";
  comment: string;
  allowAdminOverride?: boolean;
}) {
  const allowAdminOverride = Boolean(input.allowAdminOverride);
  const approvalRes = await pool.query<{
    id: number;
    expense_id: number;
    step_number: number;
    status: string;
    employee_id: number;
    amount_original: string;
  }>(
    `SELECT ar.id, ar.expense_id, ar.step_number, ar.status, e.employee_id, e.amount_original
     FROM approval_requests ar
     JOIN expenses e ON e.id = ar.expense_id
     WHERE ar.id = $1
       AND e.company_id = $3
       AND ($4::boolean = true OR ar.approver_id = $2)`,
    [input.approvalId, input.approverId, input.companyId, allowAdminOverride],
  );
  const approval = approvalRes.rows[0];
  if (!approval) throw new Error("Approval request not found.");
  if (approval.status !== "pending") throw new Error("This approval request is already resolved.");

  await pool.query(
    `UPDATE approval_requests
     SET status = $1, comments = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [input.action, input.comment || null, input.approvalId],
  );

  const stepRows = await pool.query<{ status: string; approver_id: number }>(
    `SELECT status, approver_id
     FROM approval_requests
     WHERE expense_id = $1 AND step_number = $2`,
    [approval.expense_id, approval.step_number],
  );
  const total = stepRows.rows.length;
  const approvedCount = stepRows.rows.filter((r) => r.status === "approved").length;
  const rejectedCount = stepRows.rows.filter((r) => r.status === "rejected").length;
  const pendingCount = stepRows.rows.filter((r) => r.status === "pending").length;
  const approvedRatio = total > 0 ? approvedCount / total : 0;

  const rules = await fetchLatestRuleConfig(input.companyId);
  const selected = pickRule(rules, approval.employee_id, Number(approval.amount_original));
  const currentStepConfig = selected?.steps?.[approval.step_number - 1];
  const threshold = thresholdForStep(currentStepConfig || { id: "default", mode: "role_percentage", percentage: 100 });

  if (input.action === "rejected") {
    await pool.query(`UPDATE expenses SET status = 'rejected' WHERE id = $1`, [approval.expense_id]);
    await syncSubmissionStatus(approval.expense_id, "rejected");
    return { status: "rejected", advanced: false };
  }

  if (approvedRatio >= threshold) {
    const nextStepNumber = approval.step_number + 1;
    const nextStep = selected?.steps?.[nextStepNumber - 1];
    if (!nextStep) {
      await pool.query(`UPDATE expenses SET status = 'approved' WHERE id = $1`, [approval.expense_id]);
      await syncSubmissionStatus(approval.expense_id, "approved");
      return { status: "approved", advanced: false };
    }

    const exists = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM approval_requests WHERE expense_id = $1 AND step_number = $2`,
      [approval.expense_id, nextStepNumber],
    );
    if (exists.rows[0]?.n === 0) {
      const nextApprovers = await resolveApproversForStep(input.companyId, approval.employee_id, nextStep);
      for (const approverId of nextApprovers) {
        await pool.query(
          `INSERT INTO approval_requests (expense_id, approver_id, step_number, status, comments)
           VALUES ($1, $2, $3, 'pending', NULL)`,
          [approval.expense_id, approverId, nextStepNumber],
        );
      }
    }
    await pool.query(`UPDATE expenses SET status = 'pending' WHERE id = $1`, [approval.expense_id]);
    await syncSubmissionStatus(approval.expense_id, "pending");
    return { status: "pending", advanced: true };
  }

  if (pendingCount === 0 && approvedRatio < threshold) {
    await pool.query(`UPDATE expenses SET status = 'rejected' WHERE id = $1`, [approval.expense_id]);
    await syncSubmissionStatus(approval.expense_id, "rejected");
    return { status: "rejected", advanced: false };
  }

  return { status: "pending", advanced: false };
}

