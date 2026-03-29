import { pool } from "../config/db";

type CreateBillInput = {
  originalName: string;
  storedName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

type BillRecord = {
  id: number;
  originalName: string;
  storedName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  ocrStatus: string;
  createdAt: string;
};

let ensureBillsTablePromise: Promise<void> | null = null;

const ensureBillsTableExists = async (): Promise<void> => {
  if (!ensureBillsTablePromise) {
    ensureBillsTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS bills (
          id SERIAL PRIMARY KEY,
          original_name VARCHAR(255) NOT NULL,
          stored_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_url TEXT NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          file_size INTEGER NOT NULL CHECK (file_size >= 0),
          ocr_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
          ocr_text TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_bills_ocr_status ON bills(ocr_status);
        CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureBillsTablePromise = null;
        throw error;
      });
  }

  await ensureBillsTablePromise;
};

export const createBillRecord = async (input: CreateBillInput): Promise<BillRecord> => {
  await ensureBillsTableExists();

  const result = await pool.query<{
    id: number;
    original_name: string;
    stored_name: string;
    file_path: string;
    file_url: string;
    mime_type: string;
    file_size: number;
    ocr_status: string;
    created_at: string;
  }>(
    `
      INSERT INTO bills (
        original_name,
        stored_name,
        file_path,
        file_url,
        mime_type,
        file_size
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        original_name,
        stored_name,
        file_path,
        file_url,
        mime_type,
        file_size,
        ocr_status,
        created_at
    `,
    [
      input.originalName,
      input.storedName,
      input.filePath,
      input.fileUrl,
      input.mimeType,
      input.fileSize,
    ],
  );

  const row = result.rows[0];

  return {
    id: row.id,
    originalName: row.original_name,
    storedName: row.stored_name,
    filePath: row.file_path,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    ocrStatus: row.ocr_status,
    createdAt: row.created_at,
  };
};
