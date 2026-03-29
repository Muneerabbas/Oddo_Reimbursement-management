import { z } from "zod";

export const supportAgentRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required."),
  conversationId: z.string().trim().max(120).optional(),
  userContext: z
    .object({
      userId: z.number().int().positive().optional(),
      companyId: z.number().int().positive().optional(),
      role: z.string().trim().optional(),
    })
    .optional(),
  strictMode: z.boolean().optional(),
});

export type SupportAgentRequest = z.infer<typeof supportAgentRequestSchema>;

