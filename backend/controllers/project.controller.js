import Project from "../models/Project.js";
import { requireOwnedProject } from "../services/projectService.js";
import { newId } from "../utils/ids.js";

/** GET /api/projects */
export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ userId: req.user._id.toString() }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    next(error);
  }
}

/** POST /api/projects */
export async function createProject(req, res, next) {
  try {
    const { name, repoOwner, repoName, branch } = req.body;
    const project = await Project.create({
      projectId: newId("proj"),
      userId: req.user._id.toString(),
      name,
      repoOwner,
      repoName,
      branch: branch ?? "main",
    });
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

/** GET /api/projects/:projectId */
export async function getProject(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    res.json(project);
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/projects/:projectId */
export async function deleteProject(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (error) {
    next(error);
  }
}
