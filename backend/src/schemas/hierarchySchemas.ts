import { z } from "zod";

export const createReportingLinkSchema = z.object({
  subordinateId: z.coerce.number().int().positive(),
  supervisorId: z.coerce.number().int().positive(),
});

export const updateHierarchyTierSchema = z.object({
  hierarchyTier: z.coerce.number().int().min(0).max(999),
});
