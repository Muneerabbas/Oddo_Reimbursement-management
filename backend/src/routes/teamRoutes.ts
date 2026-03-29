import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware";
import {
  createMember,
  createRole,
  deleteMember,
  deleteRole,
  listManagers,
  listMembers,
  listRoles,
  updateMember,
  updateRole,
} from "../controllers/teamsController";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/roles", listRoles);
router.post("/roles", createRole);
router.patch("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/members", listMembers);
router.get("/managers", listManagers);
router.post("/members", createMember);
router.patch("/members/:id", updateMember);
router.delete("/members/:id", deleteMember);

export default router;
