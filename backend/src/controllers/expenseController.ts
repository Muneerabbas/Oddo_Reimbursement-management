import type { Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { createExpenseSubmissionSchema } from "../schemas/expenseSchemas";
import {
  createExpenseSubmission,
  listExpenseSubmissionsForUser,
} from "../services/expenseSubmissionService";

function sendValidationError(res: Response, message: string): void {
  res.status(400).json({ message });
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
