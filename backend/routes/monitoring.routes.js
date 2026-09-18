import { Router } from "express";
import {
  getAlerts,
  getHealth,
  getLogs,
  getMetrics,
} from "../controllers/monitoring.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:projectId/health", getHealth);
router.get("/:projectId/metrics", getMetrics);
router.get("/:projectId/logs", getLogs);
router.get("/:projectId/alerts", getAlerts);

export default router;
