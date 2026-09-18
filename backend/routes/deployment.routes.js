import { Router } from "express";
import { z } from "zod";
import {
  approveDeployment,
  createPlan,
  getDeployment,
  getDeploymentLogs,
  rejectDeployment,
  rollbackDeployment,
} from "../controllers/deployment.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createPlanSchema = z.object({
  projectId: z.string().min(1),
  awsConnectionId: z.string().min(1).optional(),
});

router.use(requireAuth);

router.post("/plan", validateBody(createPlanSchema), createPlan);
router.get("/:deploymentId", getDeployment);
router.get("/:deploymentId/logs", getDeploymentLogs);
router.post("/:deploymentId/approve", approveDeployment);
router.post("/:deploymentId/reject", rejectDeployment);
router.post("/:deploymentId/rollback", rollbackDeployment);

export default router;
