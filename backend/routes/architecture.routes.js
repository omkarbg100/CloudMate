import { Router } from "express";
import {
  generateArchitecture,
  getArchitecture,
} from "../controllers/architecture.controller.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/projects/:projectId
const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post("/architecture", generateArchitecture);
router.get("/architecture", getArchitecture);

export default router;
