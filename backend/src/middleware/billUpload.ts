import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const allowedMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "text/plain",
]);

const allowedExtensions = new Set([
  ".bmp",
  ".doc",
  ".docx",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".tif",
  ".tiff",
  ".txt",
  ".webp",
  ".xls",
  ".xlsx",
]);

fs.mkdirSync(env.billUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.billUploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const safeBaseName = baseName || "bill";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    cb(null, `${safeBaseName}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedMimeType = allowedMimeTypes.has(file.mimetype);
  const isAllowedExtension = allowedExtensions.has(extension);

  if (!isAllowedMimeType || !isAllowedExtension) {
    cb(new Error("Unsupported bill file type. Upload an image, PDF, or office document."));
    return;
  }

  cb(null, true);
};

export const uploadBillFile = multer({
  storage,
  limits: {
    fileSize: env.billUploadMaxSizeBytes,
    files: 1,
  },
  fileFilter,
}).single("bill");
