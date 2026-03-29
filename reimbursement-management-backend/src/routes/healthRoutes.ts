import { Router } from "express";
import { dbHealthCheck, healthCheck } from "../controllers/healthController";

const router = Router();

router.get("/health", healthCheck);
router.get("/health/db", dbHealthCheck);

export default router;
