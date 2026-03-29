import axios from "axios";
import { z } from "zod";
import { pool } from "../config/db";
import { env } from "../config/env";
import { ensureExpenseSubmissionsTableExists } from "./expenseSubmissionService";

type ExtractInput = {
  companyId: number;
  employeeId: number;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
};

type FieldConfidence = {
  value: string | number | null;
  confidence: number;
  source: "ocr" | "ai_inferred" | "defaulted";
};

type ExtractResult = {
  amount: FieldConfidence;
  currency: FieldConfidence;
  date: FieldConfidence;
  vendor: FieldConfidence;
  category: FieldConfidence;
  description: FieldConfidence;
  confidence: number;
  flags: string[];
  rawTextSnippet: string;
};

type GeminiParsed = {
  amount?: number | string | null;
  currency?: string | null;
  date?: string | null;
  vendor?: string | null;
  category?: string | null;
  description?: string | null;
  confidence?: number | null;
  fieldConfidence?: Partial<Record<"amount" | "currency" | "date" | "vendor" | "category" | "description", number>>;
  flags?: string[];
};

const geminiParsedSchema = z.object({
  amount: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  fieldConfidence: z
    .object({
      amount: z.number().min(0).max(1).optional(),
      currency: z.number().min(0).max(1).optional(),
      date: z.number().min(0).max(1).optional(),
      vendor: z.number().min(0).max(1).optional(),
      category: z.number().min(0).max(1).optional(),
      description: z.number().min(0).max(1).optional(),
    })
    .partial()
    .optional(),
  flags: z.array(z.string()).optional(),
});

const KNOWN_CATEGORIES = ["Travel", "Meals", "Supplies", "Software", "Hardware", "Other"] as const;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const code = error.code || "";
  return ["ECONNABORTED", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT"].includes(code);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientAxiosError(error) || i === attempts - 1) {
        throw error;
      }
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastError;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeCurrency(input: string | null | undefined): string {
  const c = (input || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(c)) return c;
  return "USD";
}

function normalizeAmount(input: string | number | null | undefined): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input <= 0) return null;
    return Number(input.toFixed(2));
  }
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.\-]/g, "");
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Number(parsed.toFixed(2));
  }
  return null;
}

function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeCategory(input: string | null | undefined): string {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return "Other";
  if (raw.includes("travel") || raw.includes("flight") || raw.includes("taxi") || raw.includes("uber")) {
    return "Travel";
  }
  if (raw.includes("food") || raw.includes("meal") || raw.includes("restaurant") || raw.includes("dinner")) {
    return "Meals";
  }
  if (raw.includes("office") || raw.includes("stationery") || raw.includes("supply")) {
    return "Supplies";
  }
  if (raw.includes("software") || raw.includes("license") || raw.includes("subscription") || raw.includes("saas")) {
    return "Software";
  }
  if (raw.includes("hardware") || raw.includes("laptop") || raw.includes("device") || raw.includes("equipment")) {
    return "Hardware";
  }

  const direct = KNOWN_CATEGORIES.find((c) => c.toLowerCase() === raw);
  return direct || "Other";
}

function inferCategoryFromText(rawText: string): string {
  return normalizeCategory(rawText);
}

function inferAmountFromText(rawText: string): number | null {
  const matches = rawText.match(/(?:total|amount|grand total)[^\d]{0,12}(\d[\d,]*\.?\d{0,2})/i);
  if (matches?.[1]) {
    return normalizeAmount(matches[1]);
  }
  const anyNumber = rawText.match(/\b\d{1,6}(?:,\d{3})*(?:\.\d{2})\b/g);
  if (!anyNumber || anyNumber.length === 0) return null;
  const largest = anyNumber
    .map((n) => normalizeAmount(n))
    .filter((n): n is number => n != null)
    .sort((a, b) => b - a)[0];
  return largest ?? null;
}

function inferCurrencyFromText(rawText: string): string {
  const upper = rawText.toUpperCase();
  const code = upper.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY|CNY|SGD|AED)\b/);
  if (code?.[1]) return code[1];
  if (upper.includes("₹")) return "INR";
  if (upper.includes("$")) return "USD";
  if (upper.includes("€")) return "EUR";
  if (upper.includes("£")) return "GBP";
  return "USD";
}

function inferDateFromText(rawText: string): string | null {
  const iso = rawText.match(/\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
  if (iso?.[0]) return iso[0];
  const dmy = rawText.match(/\b([0-2]?\d|3[01])[\/\-]([0]?\d|1[0-2])[\/\-](20\d{2})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function inferVendorFromText(rawText: string): string | null {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const firstUseful = lines.find((l) => /[a-z]/i.test(l) && !/\b(invoice|receipt|bill)\b/i.test(l));
  return firstUseful ? firstUseful.slice(0, 80) : null;
}

async function extractRawTextViaOcrSpace(fileName: string, fileBuffer: Buffer): Promise<string> {
  if (!env.ocrSpaceApiKey) {
    throw new Error("OCR_SPACE_API_KEY is not configured.");
  }

  if (!inputLooksLikeSupportedFile(fileName)) {
    throw new Error("Unsupported file type for OCR extraction.");
  }
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (fileBuffer.length > env.billUploadMaxSizeBytes) {
    throw new Error("Uploaded file exceeds maximum allowed size.");
  }

  const tryOcr = async (engine: "1" | "2", isTable: boolean): Promise<string | null> => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)]);
    form.append("apikey", env.ocrSpaceApiKey);
    form.append("file", blob, fileName);
    form.append("language", "eng");
    form.append("isTable", isTable ? "true" : "false");
    form.append("OCREngine", engine);

    const response = await withRetry(
      () =>
        axios.post("https://api.ocr.space/parse/image", form, {
          timeout: 30000,
        }),
      3,
      700,
    );

    const parsedResults = response.data?.ParsedResults;
    const text = Array.isArray(parsedResults)
      ? parsedResults
          .map((r: { ParsedText?: string }) => r?.ParsedText || "")
          .join("\n")
          .trim()
      : "";

    if (text) return text;

    const errMessage =
      response.data?.ErrorMessage?.[0] ||
      response.data?.ErrorMessage ||
      response.data?.ParsedResults?.[0]?.ErrorMessage ||
      "Unknown OCR error.";
    const exitCode = response.data?.OCRExitCode ?? "NA";
    throw new Error(`OCR failed (engine=${engine}, table=${isTable}, code=${exitCode}): ${errMessage}`);
  };

  try {
    return (await tryOcr("2", true)) as string;
  } catch (firstError) {
    try {
      return (await tryOcr("2", false)) as string;
    } catch {
      try {
        return (await tryOcr("1", false)) as string;
      } catch {
        throw firstError;
      }
    }
  }
}

function extractJsonFromGeminiText(raw: string): GeminiParsed {
  const trimmed = raw.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini response did not contain JSON object.");
  const parsed = JSON.parse(match[0]) as unknown;
  return geminiParsedSchema.parse(parsed) as GeminiParsed;
}

async function parseAndValidateWithGemini(rawText: string): Promise<GeminiParsed> {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = [
    "Extract and validate expense details from this receipt text.",
    "Also:",
    "- Infer missing fields",
    "- Categorize expense",
    "- Add confidence score (0–1)",
    "- Flag suspicious or unclear data",
    "Return JSON only with keys:",
    "amount, currency, date, vendor, category, description, confidence, fieldConfidence, flags",
    "fieldConfidence should include each field between 0 and 1.",
    "Receipt text:",
    rawText,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;
  const response = await withRetry(
    () =>
      axios.post(
        url,
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        },
        {
          timeout: 45000,
        },
      ),
    3,
    1000,
  );

  const text =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    response.data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("\n");

  if (!text || typeof text !== "string") {
    throw new Error("Gemini parsing failed: empty response.");
  }

  return extractJsonFromGeminiText(text);
}

function inputLooksLikeSupportedFile(fileName: string): boolean {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return [
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "tif",
    "tiff",
    "pdf",
  ].includes(ext);
}

async function findPotentialDuplicateFlags(
  companyId: number,
  employeeId: number,
  amount: number | null,
  date: string | null,
  vendor: string | null,
): Promise<string[]> {
  if (amount == null || !date) return [];

  await ensureExpenseSubmissionsTableExists();

  const duplicateFlags: string[] = [];
  const result = await pool.query<{
    id: number;
    amount: string;
    expense_date: string;
    description: string;
    category: string;
  }>(
    `SELECT id, amount, expense_date, description, category
     FROM expense_submissions
     WHERE company_id = $1
       AND employee_id = $2
       AND ABS(amount - $3::numeric) <= 0.01
       AND expense_date BETWEEN ($4::date - interval '30 days') AND ($4::date + interval '30 days')
     ORDER BY created_at DESC
     LIMIT 5`,
    [companyId, employeeId, amount, date],
  );

  if (result.rows.length > 0) {
    duplicateFlags.push("potential_duplicate_expense");
  }

  if (vendor && result.rows.some((r) => (r.description || "").toLowerCase().includes(vendor.toLowerCase()))) {
    duplicateFlags.push("vendor_seen_recently");
  }

  return duplicateFlags;
}

export async function extractExpenseDataWithAi(input: ExtractInput): Promise<ExtractResult> {
  const rawText = await extractRawTextViaOcrSpace(input.fileName, input.fileBuffer);
  const flags = new Set<string>();
  let ai: GeminiParsed | null = null;

  try {
    ai = await parseAndValidateWithGemini(rawText);
  } catch {
    flags.add("ai_service_unavailable");
    ai = null;
  }

  const amount = normalizeAmount(ai?.amount) ?? inferAmountFromText(rawText);
  const currency = normalizeCurrency(ai?.currency) || inferCurrencyFromText(rawText);
  const date = normalizeDate(ai?.date) || inferDateFromText(rawText) || new Date().toISOString().slice(0, 10);
  const vendor = (ai?.vendor || "").trim() || inferVendorFromText(rawText);
  const category = normalizeCategory(ai?.category) || inferCategoryFromText(rawText);
  const description =
    (ai?.description || "").trim() ||
    (vendor ? `Expense at ${vendor}` : `Receipt-based expense (${category})`);

  if (Array.isArray(ai?.flags)) {
    ai.flags.filter(Boolean).forEach((f) => flags.add(f));
  }

  if (amount == null) {
    flags.add("amount_missing_or_invalid");
  }
  if (!vendor) {
    flags.add("vendor_missing");
  }
  if (rawText.length < 20) {
    flags.add("low_image_quality");
  }

  if (amount != null) {
    if (amount > 100000) flags.add("high_amount_outlier");
    if (amount < 0.5) flags.add("tiny_amount_check_required");
  }
  if (date) {
    const extractedDate = new Date(date);
    const now = new Date();
    if (extractedDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      flags.add("future_date_detected");
    }
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    flags.add("currency_invalid");
  }

  const dupFlags = await findPotentialDuplicateFlags(
    input.companyId,
    input.employeeId,
    amount,
    date,
    vendor,
  );
  dupFlags.forEach((f) => flags.add(f));

  const fieldConfidence = ai?.fieldConfidence || {};
  const globalConfidence = clamp01(ai?.confidence ?? (flags.has("ai_service_unavailable") ? 0.6 : 0.75));

  return {
    amount: {
      value: amount,
      confidence: clamp01(fieldConfidence.amount ?? (amount != null ? globalConfidence : 0.3)),
      source: ai?.amount != null ? "ocr" : "ai_inferred",
    },
    currency: {
      value: currency,
      confidence: clamp01(fieldConfidence.currency ?? (ai?.currency ? globalConfidence : 0.55)),
      source: ai?.currency ? "ocr" : "ai_inferred",
    },
    date: {
      value: date,
      confidence: clamp01(fieldConfidence.date ?? (ai?.date ? globalConfidence : 0.55)),
      source: ai?.date ? "ocr" : "defaulted",
    },
    vendor: {
      value: vendor,
      confidence: clamp01(fieldConfidence.vendor ?? (vendor ? globalConfidence : 0.4)),
      source: vendor ? "ocr" : "ai_inferred",
    },
    category: {
      value: category,
      confidence: clamp01(fieldConfidence.category ?? (ai?.category ? globalConfidence : 0.65)),
      source: ai?.category ? "ocr" : "ai_inferred",
    },
    description: {
      value: description,
      confidence: clamp01(fieldConfidence.description ?? (ai?.description ? globalConfidence : 0.7)),
      source: ai?.description ? "ocr" : "ai_inferred",
    },
    confidence: globalConfidence,
    flags: Array.from(flags),
    rawTextSnippet: rawText.slice(0, 500),
  };
}
