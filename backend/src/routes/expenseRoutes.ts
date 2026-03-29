import { Router, type Request, type Response } from "express";
import multer from "multer";
import { createExpense, listExpenses } from "../controllers/expenseController";
import { env } from "../config/env";
import { requireAuth } from "../middleware/authMiddleware";
import { uploadExpenseReceipt } from "../middleware/expenseUpload";

const router = Router();

router.use(requireAuth);

router.get("/expenses", listExpenses);

router.post("/expenses", (req: Request, res: Response) => {
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

export default router;
