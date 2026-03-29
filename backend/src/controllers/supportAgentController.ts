import type { Request, Response } from "express";
import { ZodError } from "zod";
import { supportAgentRequestSchema } from "../schemas/supportAgentSchemas";
import { runSupportAgent } from "../services/supportAgentService";

export async function supportAgentMessage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const payload = supportAgentRequestSchema.parse(req.body);
    const result = await runSupportAgent(payload, req.auth);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: error.issues[0]?.message ?? "Invalid request payload." });
      return;
    }
    if (error instanceof Error) {
      res.status(500).json({ message: `Support agent failed: ${error.message}` });
      return;
    }
    res.status(500).json({ message: "Support agent failed unexpectedly." });
  }
}

