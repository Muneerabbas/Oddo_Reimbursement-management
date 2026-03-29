import { Router } from "express";
import { getApprovalRules, saveApprovalRules } from "../controllers/approvalRuleController";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/approval-rules", requireAuth, requireAdmin, getApprovalRules);
router.put("/approval-rules", requireAuth, requireAdmin, saveApprovalRules);

export default router;
