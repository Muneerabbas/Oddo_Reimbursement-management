import { z } from "zod";

const ruleStepSchema = z
  .object({
    id: z.string().trim().min(1),
    mode: z.enum(["role_percentage", "specific_approver"]),
    percentage: z.coerce.number().min(0).max(100).optional(),
    roleIds: z.array(z.coerce.number().int().positive()).default([]),
    approverIds: z.array(z.coerce.number().int().positive()).default([]),
  })
  .superRefine((step, ctx) => {
    if (step.mode === "role_percentage") {
      if (!step.roleIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roleIds"],
          message: "Select at least one role for a role + percentage step.",
        });
      }
      if (typeof step.percentage !== "number" || Number.isNaN(step.percentage)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["percentage"],
          message: "Percentage is required for a role + percentage step.",
        });
      }
    }

    if (step.mode === "specific_approver" && !step.approverIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approverIds"],
        message: "Select at least one approver for a specific approver step.",
      });
    }
  });

const approvalRuleSchema = z
  .object({
    id: z.string().trim().min(1),
    triggerMode: z.enum(["amount", "employee_specific"]).default("amount"),
    maxAmount: z.coerce.number().positive("Max amount must be greater than zero.").optional(),
    employeeIds: z.array(z.coerce.number().int().positive()).default([]),
    steps: z.array(ruleStepSchema).min(1, "At least one step is required."),
  })
  .superRefine((rule, ctx) => {
    if (rule.triggerMode === "amount") {
      if (typeof rule.maxAmount !== "number" || Number.isNaN(rule.maxAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxAmount"],
          message: "Max amount is required for an amount-based rule.",
        });
      }
    }

    if (rule.triggerMode === "employee_specific" && !rule.employeeIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeIds"],
        message: "Select at least one employee for a person-specific rule.",
      });
    }
  });

export const approvalRuleConfigSchema = z.object({
  rules: z.array(approvalRuleSchema).default([]),
});
