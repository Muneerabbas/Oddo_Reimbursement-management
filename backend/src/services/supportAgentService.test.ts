import { describe, expect, it } from "vitest";
import {
  buildQueryPlan,
  classifyIntentFamily,
  classifySubIntent,
  extractEntities,
} from "./supportAgentService";

describe("supportAgentService router", () => {
  it("classifies billing duplicate intent", () => {
    const message = "I was charged twice for EXP-12 in EUR and USD";
    const family = classifyIntentFamily(message);
    const sub = classifySubIntent(family, message);
    expect(family).toBe("billing_dispute");
    expect(sub).toBe("duplicate_charge_check");
  });

  it("extracts key entities", () => {
    const entities = extractEntities("check EXP-45 from 2026-01-01 to 2026-02-01 step 2 in INR");
    expect(entities.expenseSubmissionId).toBe(45);
    expect(entities.stepNumber).toBe(2);
    expect(entities.currencyCode).toBe("INR");
    expect(entities.dateFrom).toBe("2026-01-01");
    expect(entities.dateTo).toBe("2026-02-01");
  });

  it("builds approval template plan", () => {
    const plan = buildQueryPlan("approval_workflow", "approver_chain");
    expect(plan.templateIds).toContain("approval.current_chain");
    expect(plan.templateIds).toContain("approval.pending_step");
    expect(plan.templateIds).toContain("ctx.role_hierarchy");
    expect(plan.templateIds).toContain("ctx.user_scope");
  });

  it("routes budget policy requests", () => {
    const message = "show budget health and policy limits";
    const family = classifyIntentFamily(message);
    const sub = classifySubIntent(family, message);
    const plan = buildQueryPlan(family, sub);
    expect(family).toBe("policy_explain");
    expect(sub).toBe("budget_health");
    expect(plan.templateIds).toContain("policy.budget_snapshot");
  });

  it("routes OCR audit requests", () => {
    const message = "audit OCR failures in bill scan";
    const family = classifyIntentFamily(message);
    const sub = classifySubIntent(family, message);
    const plan = buildQueryPlan(family, sub);
    expect(family).toBe("audit_trace");
    expect(sub).toBe("ocr_receipt_audit");
    expect(plan.templateIds).toContain("audit.bill_ocr");
    expect(plan.templateIds).toContain("audit.bill_recent_failures");
  });
});
