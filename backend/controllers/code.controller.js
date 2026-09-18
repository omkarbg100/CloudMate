import Analysis from "../models/Analysis.js";
import SecurityScan from "../models/SecurityScan.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitProgress } from "../utils/events.js";

/**
 * POST /api/projects/:projectId/code
 * Ask the AI code agent to generate fixes (diffs). Nothing is applied here —
 * changes are proposals that the user reviews and approves.
 */
export async function generateCode(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const { message, findingIds } = req.body ?? {};

    emitProgress(project.projectId, "CODE_GENERATION", {
      step: "GENERATING",
      progress: 10,
      message: "Code agent generating changes...",
    });

    const analysis = await Analysis.findOne({ projectId: project.projectId });
    const scan = await SecurityScan.findOne({ projectId: project.projectId });
    const findings = (scan?.findings ?? []).filter(
      (finding) => !findingIds?.length || findingIds.includes(finding.id)
    );

    const result = await askAiEngine({
      action: "code",
      projectId: project.projectId,
      message,
      analysis: analysis?.toObject(),
      findings,
    });

    emitProgress(project.projectId, "CODE_GENERATION_COMPLETED", {
      step: "DONE",
      progress: 100,
      message: `Generated ${result.changes?.length ?? 0} proposed change(s).`,
      data: { changes: result.changes ?? [], explanation: result.explanation },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
