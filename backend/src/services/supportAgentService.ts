import { pool } from "../config/db";
import type { SupportAgentRequest } from "../schemas/supportAgentSchemas";

type IntentFamily =
  | "billing_dispute"
  | "reimbursement_status"
  | "approval_workflow"
  | "policy_explain"
  | "audit_trace";

type SubIntent =
  | "duplicate_charge_check"
  | "refund_eligibility"
  | "blocked_status"
  | "sla_delay"
  | "approver_chain"
  | "next_step_check"
  | "policy_lookup"
  | "action_explain"
  | "budget_health"
  | "ocr_receipt_audit"
  | "hierarchy_scope";

type QueryTraceItem = {
  templateId: string;
  durationMs: number;
  rowCount: number;
};

type AgentEntityContext = {
  expenseSubmissionId?: number;
  expenseId?: number;
  stepNumber?: number;
  currencyCode?: string;
  dateFrom?: string;
  dateTo?: string;
};

type AgentDecision = {
  intentFamily: IntentFamily;
  subIntent: SubIntent;
  entities: AgentEntityContext;
  supportFacts: {
    case_state: Record<string, unknown>;
    financial_events: Record<string, unknown>;
    approval_state: Record<string, unknown>;
    policy_constraints: Record<string, unknown>;
    risk_flags: string[];
  };
  recommendation: string;
};

type SupportAgentResponse = {
  answer: string;
  decision: AgentDecision;
  queryTrace: QueryTraceItem[];
  confidence: number;
  suggestedActions: string[];
  escalate: boolean;
  escalateReason: string | null;
  routingDepth: {
    depth1IntentFamily: IntentFamily;
    depth2SubIntent: SubIntent;
    depth3Entities: AgentEntityContext;
    depth4Plan: string[];
    depth5Synthesis: string;
  };
};

type QueryPlan = {
  templateIds: string[];
  execute: (ctx: {
    companyId: number;
    userId: number;
    role: string;
    entities: AgentEntityContext;
  }) => Promise<{
    trace: QueryTraceItem[];
    outputs: Record<string, unknown>;
  }>;
};

function toIsoDate(input: string): string | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function extractEntities(message: string): AgentEntityContext {
  const expenseSubmissionIdMatch = message.match(/\bEXP-(\d+)\b/i);
  const expenseIdMatch = message.match(/\bexpense(?:\s+id)?[:\s#-]*(\d+)\b/i);
  const stepMatch = message.match(/\bstep\s+(\d+)\b/i);
  const currencyMatch = message.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY|CNY|SGD|AED)\b/i);

  const rangeMatch = message.match(/\bfrom\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})\b/i);
  const dateFrom = rangeMatch?.[1] ? toIsoDate(rangeMatch[1]) || undefined : undefined;
  const dateTo = rangeMatch?.[2] ? toIsoDate(rangeMatch[2]) || undefined : undefined;

  return {
    expenseSubmissionId: expenseSubmissionIdMatch?.[1] ? Number(expenseSubmissionIdMatch[1]) : undefined,
    expenseId: expenseIdMatch?.[1] ? Number(expenseIdMatch[1]) : undefined,
    stepNumber: stepMatch?.[1] ? Number(stepMatch[1]) : undefined,
    currencyCode: currencyMatch?.[1]?.toUpperCase(),
    dateFrom,
    dateTo,
  };
}

export function classifyIntentFamily(message: string): IntentFamily {
  const m = message.toLowerCase();
  if (/(audit|who changed|why changed|history|log|ocr|receipt read|bill upload|trace)/.test(m)) {
    return "audit_trace";
  }
  if (/(charged|charge|refund|double|duplicate|billing|fx|currency)/.test(m)) return "billing_dispute";
  if (/(approval|approver|manager|finance step|pending approv)/.test(m)) return "approval_workflow";
  if (/(policy|rule|allowed|eligib|compliance)/.test(m)) return "policy_explain";
  return "reimbursement_status";
}

export function classifySubIntent(intentFamily: IntentFamily, message: string): SubIntent {
  const m = message.toLowerCase();
  if (intentFamily === "billing_dispute") {
    if (/(duplicate|double|twice)/.test(m)) return "duplicate_charge_check";
    return "refund_eligibility";
  }
  if (intentFamily === "approval_workflow") {
    if (/(chain|sequence|who next|step)/.test(m)) return "approver_chain";
    if (/(hierarchy|manager of|reporting|supervisor|who can approve)/.test(m)) return "hierarchy_scope";
    return "next_step_check";
  }
  if (intentFamily === "policy_explain") {
    if (/(budget|spent|limit|department budget)/.test(m)) return "budget_health";
    return "policy_lookup";
  }
  if (intentFamily === "audit_trace") {
    if (/(ocr|receipt text|bill parse|scan)/.test(m)) return "ocr_receipt_audit";
    return "action_explain";
  }
  if (/(stuck|delay|overdue|late|sla)/.test(m)) return "sla_delay";
  return "blocked_status";
}

async function runTemplatedQuery(
  templateId: string,
  text: string,
  values: unknown[],
): Promise<{ rows: Record<string, unknown>[]; trace: QueryTraceItem }> {
  const started = Date.now();
  const result = await pool.query<Record<string, unknown>>(text, values);
  return {
    rows: result.rows,
    trace: {
      templateId,
      durationMs: Date.now() - started,
      rowCount: result.rowCount ?? result.rows.length,
    },
  };
}

export function buildQueryPlan(intentFamily: IntentFamily, subIntent: SubIntent): QueryPlan {
  const isBilling = intentFamily === "billing_dispute";
  const isStatus = intentFamily === "reimbursement_status";
  const isApproval = intentFamily === "approval_workflow";
  const isPolicy = intentFamily === "policy_explain";
  const isAudit = intentFamily === "audit_trace";

  const templateIds = [
    "ctx.user_scope",
    "ctx.role_hierarchy",
    ...(isBilling ? ["billing.duplicate_window", "billing.cross_currency"] : []),
    ...(isStatus ? ["reimbursement.latest_status", "reimbursement.stale_pending"] : []),
    ...(isApproval ? ["approval.current_chain", "approval.pending_step"] : []),
    ...(isPolicy ? ["policy.approval_rules", "policy.budget_snapshot"] : []),
    ...(isAudit ? ["audit.recent_actions", "audit.bill_ocr"] : []),
    ...(subIntent === "refund_eligibility" ? ["billing.refund_policy_context"] : []),
    ...(subIntent === "hierarchy_scope" ? ["approval.reporting_scope"] : []),
    ...(isStatus ? ["reimbursement.legacy_expenses"] : []),
    ...(isBilling ? ["billing.legacy_expenses_window"] : []),
    ...(subIntent === "ocr_receipt_audit" ? ["audit.bill_recent_failures"] : []),
    ...(subIntent === "policy_lookup" ? ["policy.company_roles"] : []),
  ];

  return {
    templateIds,
    execute: async ({ companyId, userId, entities }) => {
      const trace: QueryTraceItem[] = [];
      const outputs: Record<string, unknown> = {};

      {
        const q = await runTemplatedQuery(
          "ctx.user_scope",
          `SELECT u.id, u.role, u.company_id, c.default_currency
           FROM users u
           JOIN companies c ON c.id = u.company_id
           WHERE u.id = $1 AND u.company_id = $2`,
          [userId, companyId],
        );
        trace.push(q.trace);
        outputs.userScope = q.rows[0] ?? null;
      }
      {
        const q = await runTemplatedQuery(
          "ctx.role_hierarchy",
          `SELECT
             u.id,
             u.hierarchy_tier,
             cr.name AS company_role_name,
             cr.base_role,
             (SELECT COUNT(*)::int FROM reporting_links rl WHERE rl.company_id = $2 AND rl.subordinate_id = u.id) AS outgoing_links,
             (SELECT COUNT(*)::int FROM reporting_links rl WHERE rl.company_id = $2 AND rl.supervisor_id = u.id) AS incoming_links
           FROM users u
           LEFT JOIN company_roles cr ON cr.id = u.company_role_id
           WHERE u.id = $1 AND u.company_id = $2`,
          [userId, companyId],
        );
        trace.push(q.trace);
        outputs.roleHierarchy = q.rows[0] ?? null;
      }

      if (isBilling) {
        const targetId = entities.expenseSubmissionId ?? null;
        const q1 = await runTemplatedQuery(
          "billing.duplicate_window",
          `SELECT es.id, es.amount, es.currency, es.expense_date, es.description
           FROM expense_submissions es
           WHERE es.company_id = $1
             AND ($2::int IS NULL OR es.id = $2)
             AND es.expense_date >= CURRENT_DATE - interval '60 days'
           ORDER BY es.created_at DESC
           LIMIT 30`,
          [companyId, targetId],
        );
        trace.push(q1.trace);
        outputs.duplicateWindow = q1.rows;

        const q2 = await runTemplatedQuery(
          "billing.cross_currency",
          `SELECT base_currency, rates_json, updated_at
           FROM currency_rates
           WHERE base_currency = COALESCE($1, 'USD')
           LIMIT 1`,
          [entities.currencyCode ?? "USD"],
        );
        trace.push(q2.trace);
        outputs.currencyRates = q2.rows[0] ?? null;

        const q3 = await runTemplatedQuery(
          "billing.legacy_expenses_window",
          `SELECT e.id, e.amount_original, e.currency_original, e.amount_converted, e.expense_date, e.status
           FROM expenses e
           WHERE e.company_id = $1
             AND ($2::int IS NULL OR e.id = $2)
             AND e.expense_date >= CURRENT_DATE - interval '60 days'
           ORDER BY e.created_at DESC
           LIMIT 30`,
          [companyId, entities.expenseId ?? null],
        );
        trace.push(q3.trace);
        outputs.legacyBillingWindow = q3.rows;
      }

      if (isStatus) {
        const targetId = entities.expenseSubmissionId ?? null;
        const q1 = await runTemplatedQuery(
          "reimbursement.latest_status",
          `SELECT id, status, expense_date, amount, currency, created_at
           FROM expense_submissions
           WHERE company_id = $1
             AND employee_id = $2
             AND ($3::int IS NULL OR id = $3)
           ORDER BY created_at DESC
           LIMIT 20`,
          [companyId, userId, targetId],
        );
        trace.push(q1.trace);
        outputs.latestStatus = q1.rows;

        const q2 = await runTemplatedQuery(
          "reimbursement.stale_pending",
          `SELECT id, status, created_at
           FROM expense_submissions
           WHERE company_id = $1
             AND employee_id = $2
             AND status = 'pending'
             AND created_at < CURRENT_TIMESTAMP - interval '7 days'
           ORDER BY created_at ASC
           LIMIT 20`,
          [companyId, userId],
        );
        trace.push(q2.trace);
        outputs.stalePending = q2.rows;

        const q3 = await runTemplatedQuery(
          "reimbursement.legacy_expenses",
          `SELECT id, status, expense_date, amount_original, currency_original, amount_converted, created_at
           FROM expenses
           WHERE company_id = $1
             AND employee_id = $2
             AND ($3::int IS NULL OR id = $3)
           ORDER BY created_at DESC
           LIMIT 20`,
          [companyId, userId, entities.expenseId ?? null],
        );
        trace.push(q3.trace);
        outputs.legacyStatus = q3.rows;
      }

      if (isApproval) {
        const q1 = await runTemplatedQuery(
          "approval.current_chain",
          `SELECT ar.expense_id, ar.approver_id, ar.step_number, ar.status, ar.updated_at
           FROM approval_requests ar
           JOIN expenses e ON e.id = ar.expense_id
           WHERE e.company_id = $1
             AND ($2::int IS NULL OR ar.step_number = $2)
           ORDER BY ar.updated_at DESC
           LIMIT 40`,
          [companyId, entities.stepNumber ?? null],
        );
        trace.push(q1.trace);
        outputs.currentChain = q1.rows;

        const q2 = await runTemplatedQuery(
          "approval.pending_step",
          `SELECT ar.expense_id, MIN(ar.step_number) AS next_step
           FROM approval_requests ar
           JOIN expenses e ON e.id = ar.expense_id
           WHERE e.company_id = $1
             AND ar.status = 'pending'
           GROUP BY ar.expense_id
           ORDER BY ar.expense_id DESC
           LIMIT 20`,
          [companyId],
        );
        trace.push(q2.trace);
        outputs.pendingStep = q2.rows;

        if (subIntent === "hierarchy_scope") {
          const q3 = await runTemplatedQuery(
            "approval.reporting_scope",
            `SELECT rl.subordinate_id, rl.supervisor_id
             FROM reporting_links rl
             WHERE rl.company_id = $1
               AND (rl.subordinate_id = $2 OR rl.supervisor_id = $2)
             LIMIT 50`,
            [companyId, userId],
          );
          trace.push(q3.trace);
          outputs.reportingScope = q3.rows;
        }
      }

      if (isPolicy) {
        const q = await runTemplatedQuery(
          "policy.approval_rules",
          `SELECT rules_json, created_at
           FROM approval_rules
           WHERE company_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [companyId],
        );
        trace.push(q.trace);
        outputs.approvalRules = q.rows[0] ?? null;

        const q2 = await runTemplatedQuery(
          "policy.budget_snapshot",
          `SELECT department, amount, spent, period, created_at
           FROM budgets
           WHERE company_id = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [companyId],
        );
        trace.push(q2.trace);
        outputs.budgetSnapshot = q2.rows;

        if (subIntent === "policy_lookup") {
          const q3 = await runTemplatedQuery(
            "policy.company_roles",
            `SELECT id, name, base_role, permissions, created_at
             FROM company_roles
             WHERE company_id = $1
             ORDER BY created_at DESC
             LIMIT 30`,
            [companyId],
          );
          trace.push(q3.trace);
          outputs.companyRoles = q3.rows;
        }
      }

      if (isAudit) {
        const q = await runTemplatedQuery(
          "audit.recent_actions",
          `SELECT id, user_id, action, expense_id, details, created_at
           FROM audit_logs
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId],
        );
        trace.push(q.trace);
        outputs.auditActions = q.rows;

        const q2 = await runTemplatedQuery(
          "audit.bill_ocr",
          `SELECT id, original_name, ocr_status, created_at
           FROM bills
           ORDER BY created_at DESC
           LIMIT 30`,
          [],
        );
        trace.push(q2.trace);
        outputs.billOcr = q2.rows;

        if (subIntent === "ocr_receipt_audit") {
          const q3 = await runTemplatedQuery(
            "audit.bill_recent_failures",
            `SELECT id, original_name, ocr_status, created_at
             FROM bills
             WHERE ocr_status = 'failed'
               AND created_at >= CURRENT_TIMESTAMP - interval '30 days'
             ORDER BY created_at DESC
             LIMIT 30`,
            [],
          );
          trace.push(q3.trace);
          outputs.billRecentFailures = q3.rows;
        }
      }

      if (subIntent === "refund_eligibility") {
        const q = await runTemplatedQuery(
          "billing.refund_policy_context",
          `SELECT default_currency, country_code
           FROM companies
           WHERE id = $1
           LIMIT 1`,
          [companyId],
        );
        trace.push(q.trace);
        outputs.refundPolicyContext = q.rows[0] ?? null;
      }

      return { trace, outputs };
    },
  };
}

function buildSupportFacts(
  intentFamily: IntentFamily,
  outputs: Record<string, unknown>,
): AgentDecision["supportFacts"] {
  const riskFlags: string[] = [];
  const caseState: Record<string, unknown> = {};
  const financialEvents: Record<string, unknown> = {};
  const approvalState: Record<string, unknown> = {};
  const policyConstraints: Record<string, unknown> = {};

  if (intentFamily === "billing_dispute") {
    const duplicateWindow = Array.isArray(outputs.duplicateWindow) ? outputs.duplicateWindow : [];
    const legacyWindow = Array.isArray(outputs.legacyBillingWindow) ? outputs.legacyBillingWindow : [];
    caseState.openCasesInWindow = duplicateWindow.length;
    financialEvents.duplicateCandidates = duplicateWindow.slice(0, 5);
    financialEvents.legacyExpenseCandidates = legacyWindow.slice(0, 5);
    if (duplicateWindow.length > 1) riskFlags.push("possible_duplicate_pattern");
    if (legacyWindow.length === 0 && duplicateWindow.length === 0) riskFlags.push("no_billing_records_found");
    if (!outputs.currencyRates) riskFlags.push("missing_currency_rates");
  }

  if (intentFamily === "reimbursement_status") {
    const latest = Array.isArray(outputs.latestStatus) ? outputs.latestStatus : [];
    const stale = Array.isArray(outputs.stalePending) ? outputs.stalePending : [];
    const legacy = Array.isArray(outputs.legacyStatus) ? outputs.legacyStatus : [];
    caseState.latest = latest[0] ?? null;
    caseState.latestLegacy = legacy[0] ?? null;
    caseState.stalePendingCount = stale.length;
    caseState.totalTrackedRecords = latest.length + legacy.length;
    if (stale.length > 0) riskFlags.push("stale_pending_reimbursements");
    if (latest.length === 0 && legacy.length === 0) riskFlags.push("no_reimbursement_records_found");
  }

  if (intentFamily === "approval_workflow") {
    const chain = Array.isArray(outputs.currentChain) ? outputs.currentChain : [];
    const pending = Array.isArray(outputs.pendingStep) ? outputs.pendingStep : [];
    const scope = Array.isArray(outputs.reportingScope) ? outputs.reportingScope : [];
    approvalState.recentChainEvents = chain.slice(0, 8);
    approvalState.pendingSteps = pending.slice(0, 8);
    if (scope.length > 0) approvalState.reportingScope = scope.slice(0, 12);
    if (pending.length > 0) riskFlags.push("approval_backlog_detected");
    if (chain.length === 0) riskFlags.push("no_approval_chain_data");
  }

  if (intentFamily === "policy_explain") {
    const budgets = Array.isArray(outputs.budgetSnapshot) ? outputs.budgetSnapshot : [];
    const roles = Array.isArray(outputs.companyRoles) ? outputs.companyRoles : [];
    policyConstraints.approvalRules = outputs.approvalRules ?? null;
    policyConstraints.budgets = budgets.slice(0, 10);
    if (roles.length > 0) policyConstraints.companyRoles = roles.slice(0, 10);
    if (!outputs.approvalRules) riskFlags.push("policy_not_configured");
    if (budgets.length === 0) riskFlags.push("budget_data_missing");
  }

  if (intentFamily === "audit_trace") {
    const actions = Array.isArray(outputs.auditActions) ? outputs.auditActions : [];
    const billOcr = Array.isArray(outputs.billOcr) ? outputs.billOcr : [];
    const failed = Array.isArray(outputs.billRecentFailures) ? outputs.billRecentFailures : [];
    caseState.auditEvents = actions;
    caseState.billOcrEvents = billOcr.slice(0, 10);
    if (failed.length > 0) caseState.billRecentFailures = failed.slice(0, 10);
    if (actions.length === 0) {
      riskFlags.push("no_recent_audit_events");
    }
    if (failed.length > 0) riskFlags.push("ocr_failures_detected");
  }

  return {
    case_state: caseState,
    financial_events: financialEvents,
    approval_state: approvalState,
    policy_constraints: policyConstraints,
    risk_flags: riskFlags,
  };
}

function evaluatePolicyRecommendation(
  intentFamily: IntentFamily,
  subIntent: SubIntent,
  supportFacts: AgentDecision["supportFacts"],
  strictMode: boolean,
): { recommendation: string; suggestedActions: string[]; confidence: number; escalate: boolean; escalateReason: string | null } {
  const flags = supportFacts.risk_flags;
  let recommendation = "I analyzed your case from live support data.";
  const suggestedActions: string[] = [];
  let confidence = 0.82;

  if (intentFamily === "billing_dispute" && subIntent === "duplicate_charge_check") {
    recommendation = "Possible duplicate or adjustment detected. Verify transaction metadata before refund.";
    suggestedActions.push("Review the top duplicate candidates.");
    suggestedActions.push("Check FX adjustment vs real duplicate before approving refund.");
    if (flags.includes("missing_currency_rates")) {
      confidence -= 0.2;
    }
  } else if (intentFamily === "reimbursement_status") {
    recommendation = "Your reimbursement status and pending age were evaluated from submissions history.";
    suggestedActions.push("If pending over SLA, escalate to manager/finance queue.");
  } else if (intentFamily === "approval_workflow") {
    recommendation = "Approval chain was analyzed for pending bottlenecks and next-step readiness.";
    suggestedActions.push("Route stuck step to assigned approver with context.");
    suggestedActions.push("Review approval rules if backlog persists.");
  } else if (intentFamily === "policy_explain") {
    recommendation = "Policy response is derived from current company approval rule configuration.";
    suggestedActions.push("Validate policy JSON for threshold and role conditions.");
    if (subIntent === "budget_health") {
      suggestedActions.push("Review budget spent vs amount and flag overrun departments.");
    }
  } else if (intentFamily === "audit_trace") {
    recommendation = "Recent audit history was checked for decision traceability.";
    suggestedActions.push("Review audit entries and confirm actor/action alignment.");
    if (subIntent === "ocr_receipt_audit") {
      suggestedActions.push("Inspect OCR failed bills and retry receipt extraction where needed.");
    }
  }

  if (flags.length > 0) confidence -= Math.min(0.25, flags.length * 0.07);
  if (flags.includes("no_approval_chain_data")) confidence -= 0.1;
  if (flags.includes("no_reimbursement_records_found")) confidence -= 0.1;
  if (flags.includes("no_billing_records_found")) confidence -= 0.08;
  if (strictMode && flags.length > 0) confidence -= 0.1;
  const escalate = confidence < (strictMode ? 0.75 : 0.65) || flags.includes("policy_not_configured");
  const escalateReason = escalate
    ? strictMode
      ? "Strict mode: risk flags or confidence threshold require human review."
      : "Low confidence or missing policy/risk data requires human review."
    : null;

  return { recommendation, suggestedActions, confidence: Math.max(0.2, confidence), escalate, escalateReason };
}

function renderAnswer(decision: AgentDecision, suggestedActions: string[]): string {
  const lines: string[] = [];
  const caseState = decision.supportFacts.case_state as Record<string, unknown>;
  const approvalState = decision.supportFacts.approval_state as Record<string, unknown>;
  const financialEvents = decision.supportFacts.financial_events as Record<string, unknown>;
  const policyConstraints = decision.supportFacts.policy_constraints as Record<string, unknown>;

  const stalePendingCount = Number(caseState.stalePendingCount ?? 0);
  const latest = caseState.latest as Record<string, unknown> | undefined;
  const pendingSteps = Array.isArray(approvalState.pendingSteps) ? approvalState.pendingSteps : [];
  const chainEvents = Array.isArray(approvalState.recentChainEvents)
    ? approvalState.recentChainEvents
    : [];

  // Numeric-first responses so direct questions (e.g. "how many pending approvals?") get direct answers.
  if (decision.intentFamily === "reimbursement_status") {
    const latestStatus = typeof latest?.status === "string" ? latest.status : "unknown";
    const totalTracked = Number(caseState.totalTrackedRecords ?? 0);
    lines.push(`SQL result: stale pending reimbursements (SLA breach) = ${stalePendingCount}.`);
    lines.push(`SQL result: latest reimbursement status = ${latestStatus}.`);
    lines.push(`SQL result: tracked reimbursement records = ${totalTracked}.`);
  }
  if (decision.intentFamily === "approval_workflow") {
    lines.push(`SQL result: pending approval chains = ${pendingSteps.length}.`);
    lines.push(`SQL result: recent approval events scanned = ${chainEvents.length}.`);
  }
  if (decision.intentFamily === "billing_dispute") {
    const dup = Array.isArray(financialEvents.duplicateCandidates)
      ? financialEvents.duplicateCandidates.length
      : 0;
    const legacy = Array.isArray(financialEvents.legacyExpenseCandidates)
      ? financialEvents.legacyExpenseCandidates.length
      : 0;
    lines.push(`SQL result: duplicate-like submission candidates = ${dup}.`);
    lines.push(`SQL result: legacy expense candidates in billing window = ${legacy}.`);
  }
  if (decision.intentFamily === "policy_explain") {
    const budgets = Array.isArray(policyConstraints.budgets) ? policyConstraints.budgets.length : 0;
    const hasRules = policyConstraints.approvalRules ? "yes" : "no";
    lines.push(`SQL result: approval rules configured = ${hasRules}.`);
    lines.push(`SQL result: budget rows analyzed = ${budgets}.`);
  }
  if (decision.intentFamily === "audit_trace") {
    const auditEvents = Array.isArray(caseState.auditEvents) ? caseState.auditEvents.length : 0;
    const ocrEvents = Array.isArray(caseState.billOcrEvents) ? caseState.billOcrEvents.length : 0;
    lines.push(`SQL result: audit events scanned = ${auditEvents}.`);
    lines.push(`SQL result: OCR bill events scanned = ${ocrEvents}.`);
  }

  lines.push(`Intent: ${decision.intentFamily.replace("_", " ")} / ${decision.subIntent.replace("_", " ")}.`);
  lines.push(`Decision: ${decision.recommendation}`);
  if (decision.supportFacts.risk_flags.length > 0) {
    lines.push(`Risk flags: ${decision.supportFacts.risk_flags.join(", ")}.`);
  }
  if (suggestedActions.length > 0) {
    lines.push(`Next: ${suggestedActions.join(" ")}`);
  }
  return lines.join(" ");
}

export async function runSupportAgent(
  input: SupportAgentRequest,
  auth: { userId: number; companyId: number; role: string },
): Promise<SupportAgentResponse> {
  const message = input.message.trim();

  const depth1IntentFamily = classifyIntentFamily(message);
  const depth2SubIntent = classifySubIntent(depth1IntentFamily, message);
  const depth3Entities = extractEntities(message);
  const depth4Plan = buildQueryPlan(depth1IntentFamily, depth2SubIntent);
  const { trace, outputs } = await depth4Plan.execute({
    companyId: auth.companyId,
    userId: auth.userId,
    role: auth.role,
    entities: depth3Entities,
  });

  const supportFacts = buildSupportFacts(depth1IntentFamily, outputs);
  const evaluated = evaluatePolicyRecommendation(
    depth1IntentFamily,
    depth2SubIntent,
    supportFacts,
    Boolean(input.strictMode),
  );

  const decision: AgentDecision = {
    intentFamily: depth1IntentFamily,
    subIntent: depth2SubIntent,
    entities: depth3Entities,
    supportFacts,
    recommendation: evaluated.recommendation,
  };

  const answer = renderAnswer(decision, evaluated.suggestedActions);

  return {
    answer,
    decision,
    queryTrace: trace,
    confidence: Number(evaluated.confidence.toFixed(2)),
    suggestedActions: evaluated.suggestedActions,
    escalate: evaluated.escalate,
    escalateReason: evaluated.escalateReason,
    routingDepth: {
      depth1IntentFamily,
      depth2SubIntent,
      depth3Entities,
      depth4Plan: depth4Plan.templateIds,
      depth5Synthesis: "Deterministic SQL facts + policy rule evaluators",
    },
  };
}
