import { Router } from "express";
import { z } from "zod";
import {
  connectAwsAccount,
  disconnectAwsAccount,
  discoverProjectAws,
  getAwsStatus,
  listConnections,
  testAwsConnection,
  getAwsResources,
} from "../controllers/aws.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

const router = Router();

const connectSchema = z.object({
  projectId: z.string().min(1),
  accessKeyId: z.string().regex(/^AKIA[0-9A-Z]{16}$/, "Invalid AWS Access Key ID"),
  secretAccessKey: z.string().min(16).max(256),
  region: z.string().min(2).max(24).default("ap-south-1"),
});

const projectQuerySchema = z.object({
  projectId: z.string().min(1),
});

router.use(requireAuth);

// Safe metadata list (Access Key IDs are masked, secrets never appear).
router.get("/connections", listConnections);

// New IAM-user credential flow.
router.post("/connect", validateBody(connectSchema), connectAwsAccount);
router.get("/status", validateQuery(projectQuerySchema), getAwsStatus);
router.post("/test", validateBody(connectSchema.omit({ accessKeyId: true, secretAccessKey: true })), testAwsConnection);
router.post("/discover", validateBody(connectSchema.omit({ accessKeyId: true, secretAccessKey: true })), discoverProjectAws);
router.get("/resources", validateQuery(projectQuerySchema), getAwsResources);
router.delete("/disconnect", validateBody(projectQuerySchema), disconnectAwsAccount);

export default router;