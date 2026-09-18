import { Router } from "express";
import { validateProject } from "../controllers/validation.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/projects/:projectId
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/validate", validateProject);

export default router;
