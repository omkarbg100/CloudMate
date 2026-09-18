import { Router } from "express";
import {
  listRepos,
  getProjectFiles,
  getProjectFileContent,
  getProjectBranches,
  ensureDeploymateBranch,
  ensurePullRequest,
  commitProjectFile,
} from "../controllers/github.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/repos", requireAuth, listRepos);
router.get("/projects/:projectId/branches", requireAuth, getProjectBranches);
router.get("/projects/:projectId/tree", requireAuth, getProjectFiles);
router.get("/projects/:projectId/file", requireAuth, getProjectFileContent);
router.post("/projects/:projectId/branch", requireAuth, ensureDeploymateBranch);
router.post("/projects/:projectId/pr", requireAuth, ensurePullRequest);
router.post("/projects/:projectId/commit", requireAuth, commitProjectFile);

export default router;