import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";

/**
 * POST /api/chat
 * Forwards the message to the Python AI engine. The backend never performs AI
 * reasoning itself.
 */
export async function chat(req, res, next) {
  try {
    const { projectId, message } = req.body;
    const project = await requireOwnedProject(req.user._id, projectId);

    const result = await askAiEngine({
      action: "chat",
      projectId,
      message,
      repoOwner: project.repoOwner,
      repoName: project.repoName,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
