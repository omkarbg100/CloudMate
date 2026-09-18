import { Router } from "express";
import { generateCode } from "../controllers/code.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/projects/:projectId
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/code", generateCode);

export default router;
