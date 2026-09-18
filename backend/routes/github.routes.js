import { Router } from "express";
import {
  listRepos,
  getProjectFiles,
  getProjectFileContent,
  commitProjectFile,
} from "../controllers/github.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/repos", requireAuth, listRepos);
router.get("/projects/:projectId/tree", requireAuth, getProjectFiles);
router.get("/projects/:projectId/file", requireAuth, getProjectFileContent);
router.post("/projects/:projectId/commit", requireAuth, commitProjectFile);

export default router;
