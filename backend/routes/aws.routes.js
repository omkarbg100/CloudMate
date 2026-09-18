import { Router } from "express";
import { z } from "zod";
import { createConnection, listConnections } from "../controllers/aws.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createConnectionSchema = z.object({
  roleArn: z.string().regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Invalid IAM role ARN"),
  externalId: z.string().min(12),
  region: z.string().min(3),
});

router.use(requireAuth);

router.get("/connections", listConnections);
router.post("/connections", validateBody(createConnectionSchema), createConnection);

export default router;
