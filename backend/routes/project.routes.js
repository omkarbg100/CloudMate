import { Router } from "express";
import { z } from "zod";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  branch: z.string().min(1).default("main"),
});

router.use(requireAuth);

router.get("/", listProjects);
router.post("/", validateBody(createProjectSchema), createProject);
router.get("/:projectId", getProject);
router.delete("/:projectId", deleteProject);

export default router;
