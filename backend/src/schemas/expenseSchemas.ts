import { z } from "zod";

export const createExpenseSubmissionSchema = z.object({
  date: z.string().trim().min(1, "Transaction date is required."),
  category: z.string().trim().min(1, "Expense category is required."),
  amount: z.coerce.number().positive("Expense amount must be greater than zero."),
  currency: z.string().trim().length(3, "Currency must be a 3-letter code."),
  description: z.string().trim().min(1, "Business purpose description is required."),
});

export const resolveExpenseApprovalSchema = z
  .object({
    action: z.enum(["approved", "rejected", "Approved", "Rejected"]),
    comment: z.string().trim().max(2000, "Comment must be 2000 characters or fewer.").optional(),
  })
  .transform((input) => ({
    action: input.action.toLowerCase() as "approved" | "rejected",
    comment: input.comment?.trim() ?? "",
  }));

export type CreateExpenseSubmissionInput = z.infer<typeof createExpenseSubmissionSchema>;
export type ResolveExpenseApprovalInput = z.infer<typeof resolveExpenseApprovalSchema>;
