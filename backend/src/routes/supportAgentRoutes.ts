import { Router } from "express";
import { supportAgentMessage } from "../controllers/supportAgentController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/support/agent", requireAuth, supportAgentMessage);

export default router;

