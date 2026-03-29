import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/authRoutes";
import teamRoutes from "./routes/teamRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import billRoutes from "./routes/billRoutes";
import approvalRuleRoutes from "./routes/approvalRuleRoutes";
import { env } from "./config/env";

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(env.billUploadPublicPath, express.static(env.billUploadDir));

  app.use("/api", healthRoutes);
  app.use("/api", billRoutes);
  app.use("/api", expenseRoutes);
  app.use("/api", approvalRuleRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/teams", teamRoutes);

  return app;
}
