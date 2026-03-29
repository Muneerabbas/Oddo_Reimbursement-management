import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(255),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Country code must be ISO 3166-1 alpha-2")
    .transform((s) => s.toUpperCase()),
  companyName: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(255).optional(),
  ),
  companyAbout: optionalText,
  companyWebsite: optionalUrl,
  companyIndustry: z.string().trim().max(200).optional().transform((v) => v === "" ? undefined : v),
  companyPhone: z.string().trim().max(50).optional().transform((v) => v === "" ? undefined : v),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
