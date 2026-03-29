import fs from "fs/promises";
import path from "path";
import { Request, Response } from "express";
import { env } from "../config/env";
import { createBillRecord } from "../services/billService";

export const uploadBill = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "No bill file uploaded. Send it as multipart/form-data using the `bill` field.",
    });
    return;
  }

  const relativeFilePath = path.relative(process.cwd(), req.file.path).split(path.sep).join("/");
  const publicFileUrl = `${env.billUploadPublicPath}/${req.file.filename}`;
  const uploadedAt = new Date().toISOString();

  try {
    const bill = await createBillRecord({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: relativeFilePath,
      fileUrl: publicFileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    res.status(201).json({
      success: true,
      message: "Bill uploaded successfully",
      data: {
        id: bill.id,
        fileName: bill.storedName,
        originalName: bill.originalName,
        mimeType: bill.mimeType,
        size: bill.fileSize,
        path: bill.filePath,
        url: bill.fileUrl,
        ocrStatus: bill.ocrStatus,
        uploadedAt: bill.createdAt || uploadedAt,
      },
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => undefined);

    res.status(500).json({
      success: false,
      message: "Bill upload failed while saving metadata to the database.",
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
};
