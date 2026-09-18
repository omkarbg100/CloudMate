import { Router } from "express";
import { getAnalysis, runAnalysis } from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/projects/:projectId
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/analyze", runAnalysis);
router.get("/analysis", getAnalysis);

export default router;
