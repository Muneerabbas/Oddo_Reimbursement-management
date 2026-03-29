import { Request, Response } from "express";
import { testDbConnection } from "../config/db";

export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: "ok" });
};

export const dbHealthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    await testDbConnection();
    res.status(200).json({ success: true, message: "db ok" });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "db unavailable",
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
};
