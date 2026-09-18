import Project from "../models/Project.js";

/**
 * Fetch a project only if it belongs to the given user.
 * This is the single choke point for per-user project isolation.
 */
export async function getOwnedProject(userId, projectId) {
  return Project.findOne({ projectId, userId: userId.toString() });
}

/** Same as getOwnedProject but throws a 404 when the project is missing/not owned. */
export async function requireOwnedProject(userId, projectId) {
  const project = await getOwnedProject(userId, projectId);
  if (!project) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
  return project;
}
