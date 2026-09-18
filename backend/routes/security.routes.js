import { Router } from "express";
import { getSecurity, runSecurityScan } from "../controllers/security.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/projects/:projectId
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/security/scan", runSecurityScan);
router.get("/security", getSecurity);

export default router;
