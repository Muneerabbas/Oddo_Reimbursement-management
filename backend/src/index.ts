import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import { env } from "./config/env";
import { testDbConnection } from "./config/db";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRoutes);

const startServer = async (): Promise<void> => {
  try {
    await testDbConnection();
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
