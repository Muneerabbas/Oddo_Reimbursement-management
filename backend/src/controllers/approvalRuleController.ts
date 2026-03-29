import type { Request, Response } from "express";
import { ZodError } from "zod";
import { pool } from "../config/db";
import { approvalRuleConfigSchema } from "../schemas/approvalRuleSchemas";

function sendValidationError(res: Response, err: ZodError): void {
  const first = err.issues[0];
  res.status(400).json({
    message: first?.message ?? "Validation failed.",
    errors: err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function normalizeConfig(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return { rules: [] };
  }

  const maybeConfig = raw as { rules?: unknown };
  if (!Array.isArray(maybeConfig.rules)) {
    return { rules: [] };
  }

  return { rules: maybeConfig.rules };
}

export async function getApprovalRules(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.auth!.companyId;
    const result = await pool.query<{ rules_json: unknown }>(
      `
        SELECT rules_json
        FROM approval_rules
        WHERE company_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [companyId],
    );

    res.json(normalizeConfig(result.rows[0]?.rules_json));
  } catch (error) {
    console.error("getApprovalRules", error);
    res.status(500).json({ message: "Could not load approval rules." });
  }
}

export async function saveApprovalRules(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.auth!.companyId;
    const payload = approvalRuleConfigSchema.parse(req.body);

    const existing = await pool.query<{ id: number }>(
      `
        SELECT id
        FROM approval_rules
        WHERE company_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [companyId],
    );

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE approval_rules SET rules_json = $1::jsonb WHERE id = $2`,
        [JSON.stringify(payload), existing.rows[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO approval_rules (company_id, rules_json) VALUES ($1, $2::jsonb)`,
        [companyId, JSON.stringify(payload)],
      );
    }

    res.json({ success: true, rules: payload.rules });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error);
      return;
    }

    console.error("saveApprovalRules", error);
    res.status(500).json({ message: "Could not save approval rules." });
  }
}
