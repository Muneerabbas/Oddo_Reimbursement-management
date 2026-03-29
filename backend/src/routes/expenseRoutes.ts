import { Router, type Request, type Response } from "express";
import multer from "multer";
import {
  createExpense,
  extractExpenseFromReceipt,
  listExpenses,
  listPendingApprovals,
  resolveExpenseApproval,
  viewExpenseDocument,
} from "../controllers/expenseController";
import { env } from "../config/env";
import { requireAuth } from "../middleware/authMiddleware";
import { uploadExpenseReceipt } from "../middleware/expenseUpload";

const router = Router();

router.get("/expenses", requireAuth, listExpenses);
router.get("/expenses/approvals/pending", requireAuth, listPendingApprovals);
router.get("/expenses/:expenseId/document", requireAuth, viewExpenseDocument);
router.patch("/expenses/:expenseId/approval", requireAuth, resolveExpenseApproval);

router.post("/expenses", requireAuth, (req: Request, res: Response) => {
  uploadExpenseReceipt(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          message: `Receipt file is too large. Maximum allowed size is ${Math.round(
            env.billUploadMaxSizeBytes / (1024 * 1024),
          )} MB.`,
        });
        return;
      }

      res.status(400).json({ message: error.message });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }

    void createExpense(req, res);
  });
});

router.post("/expenses/extract", requireAuth, (req: Request, res: Response) => {
  uploadExpenseReceipt(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          message: `Receipt file is too large. Maximum allowed size is ${Math.round(
            env.billUploadMaxSizeBytes / (1024 * 1024),
          )} MB.`,
        });
        return;
      }

      res.status(400).json({ message: error.message });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }

    void extractExpenseFromReceipt(req, res);
  });
});

export default router;
