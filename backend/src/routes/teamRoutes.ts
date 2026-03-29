import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware";
import { ensureTeamsSchemaMiddleware } from "../middleware/ensureTeamsSchemaMiddleware";
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
import {
  createReportingLink,
  deleteReportingLink,
  getHierarchy,
  updateUserHierarchyTier,
} from "../controllers/hierarchyController";

const router = Router();

router.use(requireAuth, requireAdmin, ensureTeamsSchemaMiddleware);

router.get("/roles", listRoles);
router.post("/roles", createRole);
router.patch("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/members", listMembers);
router.get("/managers", listManagers);
router.post("/members", createMember);
router.patch("/members/:id", updateMember);
router.delete("/members/:id", deleteMember);

router.get("/hierarchy", getHierarchy);
router.post("/hierarchy/links", createReportingLink);
router.delete("/hierarchy/links/:subordinateId/:supervisorId", deleteReportingLink);
router.patch("/hierarchy/users/:userId/tier", updateUserHierarchyTier);

export default router;
