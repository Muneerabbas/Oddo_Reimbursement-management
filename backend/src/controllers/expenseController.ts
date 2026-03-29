import type { Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import axios from "axios";
import {
  createExpenseSubmissionSchema,
  resolveExpenseApprovalSchema,
} from "../schemas/expenseSchemas";
import {
  createExpenseSubmission,
  getExpenseSubmissionDocumentForViewer,
  listPendingApprovalsForReviewer,
  listExpenseSubmissionsForUser,
  resolvePendingApproval,
} from "../services/expenseSubmissionService";
import { extractExpenseDataWithAi } from "../services/aiExpenseExtractionService";

function sendValidationError(res: Response, message: string): void {
  res.status(400).json({ message });
}

function parseExpenseId(rawExpenseId: string | string[] | undefined): number | null {
  const normalized = Array.isArray(rawExpenseId) ? rawExpenseId[0] : rawExpenseId;
  const numericExpenseId = Number(normalized?.replace(/^EXP-/i, ""));
  return Number.isFinite(numericExpenseId) ? numericExpenseId : null;
}

function isReviewerRole(role: string | undefined): boolean {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "manager";
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!req.file) {
      sendValidationError(res, "Receipt file is required.");
      return;
    }

    const body = createExpenseSubmissionSchema.parse(req.body);
    const expense = await createExpenseSubmission({
      companyId: req.auth.companyId,
      employeeId: req.auth.userId,
      date: body.date,
      category: body.category,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      receiptFileName: req.file.originalname,
      receiptMimeType: req.file.mimetype,
      receiptSize: req.file.size,
      receiptData: req.file.buffer,
    });

    res.status(201).json({ expense });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error.issues[0]?.message ?? "Validation failed.");
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        sendValidationError(res, "Receipt file is too large.");
        return;
      }
      sendValidationError(res, error.message);
      return;
    }

    if (error instanceof Error) {
      sendValidationError(res, error.message);
      return;
    }

    res.status(500).json({ message: "Could not submit expense." });
  }
}

export async function extractExpenseFromReceipt(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!req.file) {
      sendValidationError(res, "Receipt file is required.");
      return;
    }

    const extracted = await extractExpenseDataWithAi({
      companyId: req.auth.companyId,
      employeeId: req.auth.userId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileBuffer: req.file.buffer,
    });

    res.json({
      extraction: extracted,
      suggestedExpense: {
        amount: extracted.amount.value,
        currency: extracted.currency.value,
        date: extracted.date.value,
        category: extracted.category.value,
        description: extracted.description.value,
        vendor: extracted.vendor.value,
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const code = error.code || "OCR_AI_REQUEST_FAILED";
      const detail =
        (typeof error.response?.data?.ErrorMessage === "string" && error.response?.data?.ErrorMessage) ||
        error.response?.data?.message ||
        error.message;
      res.status(502).json({ message: `Receipt extraction service error (${code}): ${detail}` });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Could not extract receipt details." });
  }
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const expenses = await listExpenseSubmissionsForUser(req.auth.companyId, req.auth.userId);
    res.json({ expenses });
  } catch (error) {
    console.error("listExpenses", error);
    res.status(500).json({ message: "Could not load expenses." });
  }
}

export async function listPendingApprovals(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!isReviewerRole(req.auth.role)) {
      res.status(403).json({ message: "Manager or admin access required." });
      return;
    }

    const approvals = await listPendingApprovalsForReviewer(
      req.auth.companyId,
      req.auth.userId,
      req.auth.role,
    );

    res.json({ approvals });
  } catch (error) {
    console.error("listPendingApprovals", error);
    res.status(500).json({ message: "Could not load approval queue." });
  }
}

export async function resolveExpenseApproval(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!isReviewerRole(req.auth.role)) {
      res.status(403).json({ message: "Manager or admin access required." });
      return;
    }

    const numericExpenseId = parseExpenseId(req.params.expenseId);
    if (!numericExpenseId) {
      res.status(400).json({ message: "Invalid expense id." });
      return;
    }

    const body = resolveExpenseApprovalSchema.parse(req.body);
    if (body.action === "rejected" && body.comment.trim() === "") {
      sendValidationError(res, "A comment is required when rejecting an expense.");
      return;
    }

    const approval = await resolvePendingApproval(
      req.auth.companyId,
      req.auth.userId,
      req.auth.role,
      numericExpenseId,
      body.action,
      body.comment,
    );

    if (!approval) {
      res.status(404).json({ message: "Approval item not found, inaccessible, or already processed." });
      return;
    }

    res.json({
      approval,
      message: `Expense ${approval.id} marked as ${approval.status.toLowerCase()}.`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, error.issues[0]?.message ?? "Validation failed.");
      return;
    }

    console.error("resolveExpenseApproval", error);
    res.status(500).json({ message: "Could not resolve approval." });
  }
}

export async function viewExpenseDocument(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const numericExpenseId = parseExpenseId(req.params.expenseId);
    if (!numericExpenseId) {
      res.status(400).json({ message: "Invalid expense id." });
      return;
    }

    const document = await getExpenseSubmissionDocumentForViewer(
      req.auth.companyId,
      req.auth.userId,
      req.auth.role,
      numericExpenseId,
    );

    if (!document) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    res.setHeader("Content-Type", document.receipt_mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${document.receipt_file_name}"`);
    res.send(document.receipt_data);
  } catch (error) {
    console.error("viewExpenseDocument", error);
    res.status(500).json({ message: "Could not load document." });
  }
}
