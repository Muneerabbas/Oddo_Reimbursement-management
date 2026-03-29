import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { ZodError } from "zod";
import axios from "axios";
import { pool } from "../config/db";
import { env } from "../config/env";
import { loginSchema, registerSchema } from "../schemas/authSchemas";
import { getDefaultCurrencyForCountryCode } from "../utils/currencyFromCountryCode";
import { insertDefaultCompanyRoles } from "../utils/seedCompanyRoles";

const BCRYPT_ROUNDS = 12;

type UserRow = {
  id: number;
  company_id: number;
  email: string;
  full_name: string;
  role: string;
};

type LoginRow = UserRow & {
  password_hash: string;
  company_name: string;
  default_currency: string;
  country_code: string | null;
  about: string | null;
  website: string | null;
  industry: string | null;
  phone: string | null;
  cr_id: number | null;
  cr_name: string | null;
  cr_base: string | null;
  cr_perms: Record<string, unknown> | null;
};

function signToken(userId: number, role: string, companyId: number): string {
  const signOptions = { expiresIn: env.jwtExpiresIn } as SignOptions;
  return jwt.sign({ sub: userId, role, companyId }, env.jwtSecret, signOptions);
}

function sendZodError(res: Response, err: ZodError): void {
  const first = err.issues[0];
  res.status(400).json({
    message: first?.message ?? "Validation failed",
    errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

function buildUserResponse(
  row: UserRow,
  company: {
    name: string;
    defaultCurrency: string;
    countryCode: string | null;
    about: string | null;
    website: string | null;
    industry: string | null;
    phone: string | null;
  },
  companyRole: { id: number; name: string; baseRole: string; permissions: Record<string, unknown> } | null,
): Record<string, unknown> {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    company: {
      name: company.name,
      defaultCurrency: company.defaultCurrency,
      countryCode: company.countryCode,
      about: company.about,
      website: company.website,
      industry: company.industry,
      phone: company.phone,
    },
    companyRole,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const emailNorm = body.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    let defaultCurrency: string;
    try {
      defaultCurrency = await getDefaultCurrencyForCountryCode(body.countryCode);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        res.status(400).json({ message: "Unknown country code. Please select a valid country." });
        return;
      }
      if (e instanceof Error && e.message === "INVALID_COUNTRY_CODE") {
        res.status(400).json({ message: "Invalid country code." });
        return;
      }
      res.status(502).json({
        message: "Could not resolve currency for the selected country. Try again later.",
      });
      return;
    }

    const companyDisplayName =
      body.companyName?.trim() || `${body.fullName.trim()}'s Organization`;

    const client = await pool.connect();
    let userRow: UserRow;

    try {
      await client.query("BEGIN");

      const companyInsert = await client.query<{ id: number }>(
        `INSERT INTO companies (
           name, default_currency, country_code, about, website, industry, phone
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          companyDisplayName,
          defaultCurrency,
          body.countryCode,
          body.companyAbout ?? null,
          body.companyWebsite ?? null,
          body.companyIndustry ?? null,
          body.companyPhone ?? null,
        ],
      );
      const companyId = companyInsert.rows[0].id;

      const userInsert = await client.query<UserRow>(
        `INSERT INTO users (company_id, email, password_hash, full_name, role, manager_id, company_role_id, hierarchy_tier)
         VALUES ($1, $2, $3, $4, 'admin', NULL, NULL, 100)
         RETURNING id, company_id, email, full_name, role`,
        [companyId, emailNorm, passwordHash, body.fullName.trim()],
      );
      userRow = userInsert.rows[0];

      await client.query(`UPDATE companies SET admin_user_id = $1 WHERE id = $2`, [
        userRow.id,
        companyId,
      ]);

      await insertDefaultCompanyRoles(client, companyId);

      await client.query("COMMIT");
    } catch (e: unknown) {
      await client.query("ROLLBACK");
      const err = e as { code?: string };
      if (err.code === "23505") {
        res.status(409).json({ message: "An account with this email already exists." });
        return;
      }
      throw e;
    } finally {
      client.release();
    }

    const token = signToken(userRow.id, userRow.role, userRow.company_id);
    res.status(201).json({
      token,
      user: buildUserResponse(
        userRow,
        {
          name: companyDisplayName,
          defaultCurrency,
          countryCode: body.countryCode,
          about: body.companyAbout ?? null,
          website: body.companyWebsite ?? null,
          industry: body.companyIndustry ?? null,
          phone: body.companyPhone ?? null,
        },
        null,
      ),
    });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    console.error("register error", e);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const emailNorm = body.email.trim().toLowerCase();

    const result = await pool.query<LoginRow>(
      `SELECT u.id, u.company_id, u.email, u.full_name, u.role, u.password_hash,
              c.name AS company_name, c.default_currency, c.country_code, c.about, c.website,
              c.industry, c.phone,
              cr.id AS cr_id, cr.name AS cr_name, cr.base_role AS cr_base, cr.permissions AS cr_perms
       FROM users u
       JOIN companies c ON c.id = u.company_id
       LEFT JOIN company_roles cr ON cr.id = u.company_role_id
       WHERE u.email = $1`,
      [emailNorm],
    );

    const row = result.rows[0];
    if (!row) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const companyRole =
      row.cr_id != null && row.cr_name != null && row.cr_base != null && row.cr_perms != null
        ? {
            id: row.cr_id,
            name: row.cr_name,
            baseRole: row.cr_base,
            permissions: row.cr_perms as Record<string, unknown>,
          }
        : null;

    const userCore: UserRow = {
      id: row.id,
      company_id: row.company_id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
    };

    const token = signToken(userCore.id, userCore.role, userCore.company_id);

    res.json({
      token,
      user: buildUserResponse(
        userCore,
        {
          name: row.company_name,
          defaultCurrency: row.default_currency,
          countryCode: row.country_code,
          about: row.about,
          website: row.website,
          industry: row.industry,
          phone: row.phone,
        },
        companyRole,
      ),
    });
  } catch (e) {
    if (e instanceof ZodError) {
      sendZodError(res, e);
      return;
    }
    console.error("login error", e);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
}
