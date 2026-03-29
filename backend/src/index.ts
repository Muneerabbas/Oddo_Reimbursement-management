import { env } from "./config/env";
import { testDbConnection } from "./config/db";
import { ensureCompanyTeamsSchema } from "./db/ensureCompanyTeamsSchema";
import { ensureReportingHierarchySchema } from "./db/ensureReportingHierarchy";
import { createApp } from "./app";

const app = createApp();

console.log(
  `AI extraction readiness: OCR_SPACE_API_KEY=${env.ocrSpaceApiKey ? "set" : "missing"}, GEMINI_API_KEY=${env.geminiApiKey ? "set" : "missing"}`,
);

const startServer = async (): Promise<void> => {
  try {
    await testDbConnection();
    await ensureCompanyTeamsSchema();
    await ensureReportingHierarchySchema();
    console.log("Database connection successful");
  } catch (error) {
    if (env.dbRequiredOnStartup) {
      console.error("Failed to start server: database is required but unavailable.", error);
      process.exit(1);
    }
    console.warn("Database unavailable at startup. Server will run, but DB-backed routes may fail.");
    console.warn(error);
  }

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

void startServer();
