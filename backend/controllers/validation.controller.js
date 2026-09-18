import Analysis from "../models/Analysis.js";
import SecurityScan from "../models/SecurityScan.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitProgress } from "../utils/events.js";

/** POST /api/projects/:projectId/validate — run readiness checks via the AI engine. */
export async function validateProject(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);

    emitProgress(project.projectId, "VALIDATION_STARTED", {
      step: "VALIDATING",
      progress: 20,
      message: "Validation agent checking deployment readiness...",
    });

    const analysis = await Analysis.findOne({ projectId: project.projectId });
    const scan = await SecurityScan.findOne({ projectId: project.projectId });

    const result = await askAiEngine({
      action: "validate",
      projectId: project.projectId,
      analysis: analysis?.toObject(),
      context: {
        findings: scan?.findings ?? [],
        dockerfile: req.body?.dockerfile ?? "",
        has_health_endpoint: Boolean(analysis?.backend),
      },
    });

    emitProgress(project.projectId, "VALIDATION_COMPLETED", {
      step: result.ready ? "READY" : "NOT_READY",
      progress: 100,
      message: result.summary,
      data: result,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
