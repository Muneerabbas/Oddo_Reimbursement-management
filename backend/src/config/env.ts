import dotenv from "dotenv";
import path from "path";

dotenv.config();

const requiredVars = [
  "PORT",
] as const;

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDiscreteDbConfig =
  Boolean(process.env.DB_HOST) &&
  Boolean(process.env.DB_PORT) &&
  Boolean(process.env.DB_NAME) &&
  Boolean(process.env.DB_USER) &&
  Boolean(process.env.DB_PASSWORD);

if (!hasDatabaseUrl && !hasDiscreteDbConfig) {
  throw new Error(
    "Database config missing. Provide DATABASE_URL or all DB_* vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).",
  );
}

export const env = {
  port: Number(process.env.PORT || 5001),
  databaseUrl: process.env.DATABASE_URL,
  dbHost: process.env.DB_HOST,
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbSsl: process.env.DB_SSL === "true",
  dbRequiredOnStartup: process.env.DB_REQUIRED_ON_STARTUP === "true",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  billUploadDir: path.resolve(process.cwd(), process.env.BILL_UPLOAD_DIR || "uploads/bills"),
  billUploadPublicPath: process.env.BILL_UPLOAD_PUBLIC_PATH || "/uploads/bills",
  billUploadMaxSizeBytes: Number(process.env.BILL_UPLOAD_MAX_SIZE_MB || 10) * 1024 * 1024,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
