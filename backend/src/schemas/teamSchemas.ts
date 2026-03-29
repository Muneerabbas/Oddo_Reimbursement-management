import { z } from "zod";

const permissionsPartial = z
  .object({
    submitExpense: z.boolean().optional(),
    viewOwnExpenses: z.boolean().optional(),
    viewApprovalStatus: z.boolean().optional(),
    approveExpenses: z.boolean().optional(),
    viewTeamExpenses: z.boolean().optional(),
    manageTeamRoles: z.boolean().optional(),
    manageTeamMembers: z.boolean().optional(),
    configureApprovalFlow: z.boolean().optional(),
  })
  .optional();

export const createCompanyRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(100),
  baseRole: z.enum(["employee", "manager"]),
  permissions: permissionsPartial,
  hierarchyTier: z.coerce.number().int().min(0).max(999).optional(),
});

export const updateCompanyRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  permissions: permissionsPartial,
  hierarchyTier: z.coerce.number().int().min(0).max(999).optional(),
});

export const createTeamMemberSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyRoleId: z.coerce.number().int().positive(),
  managerId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateTeamMemberSchema = z
  .object({
    companyRoleId: z.coerce.number().int().positive().optional(),
    managerId: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.companyRoleId !== undefined || d.managerId !== undefined, {
    message: "Provide at least one field to update",
  });
