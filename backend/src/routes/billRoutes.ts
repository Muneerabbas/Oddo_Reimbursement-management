import { Router, type Request, type Response } from "express";
import multer from "multer";
import { uploadBill } from "../controllers/billController";
import { env } from "../config/env";
import { uploadBillFile } from "../middleware/billUpload";

const router = Router();

router.post("/bills/upload", (req: Request, res: Response) => {
  uploadBillFile(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          success: false,
          message: `Bill file is too large. Maximum allowed size is ${Math.round(
            env.billUploadMaxSizeBytes / (1024 * 1024),
          )} MB.`,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    void uploadBill(req, res);
  });
});

export default router;
