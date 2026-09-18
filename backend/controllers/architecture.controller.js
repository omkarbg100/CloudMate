import Analysis from "../models/Analysis.js";
import Architecture from "../models/Architecture.js";
import AwsConnection from "../models/AwsConnection.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitProgress } from "../utils/events.js";
import { newId } from "../utils/ids.js";

/** POST /api/projects/:projectId/architecture — generate the AWS architecture. */
export async function generateArchitecture(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const jobId = newId("job");

    (async () => {
      try {
        emitProgress(project.projectId, "ARCHITECTURE_STARTED", {
          step: "GENERATING",
          progress: 20,
          message: "Architecture agent designing AWS architecture...",
        });

        const analysis = await Analysis.findOne({ projectId: project.projectId });
        const awsDiscovery = project.awsConnectionId
          ? await AwsConnection.findOne({ connectionId: project.awsConnectionId })
          : null;

        const result = await askAiEngine({
          action: "architecture",
          projectId: project.projectId,
          analysis: analysis?.toObject(),
          awsDiscovery: awsDiscovery?.toObject(),
        });

        await Architecture.findOneAndUpdate(
          { projectId: project.projectId },
          { ...result.architecture, projectId: project.projectId, status: "generated" },
          { upsert: true, new: true }
        );

        emitProgress(project.projectId, "ARCHITECTURE_COMPLETED", {
          step: "DONE",
          progress: 100,
          message: "AWS architecture generated.",
          data: result.architecture,
        });
      } catch (error) {
        emitProgress(project.projectId, "ARCHITECTURE_FAILED", {
          step: "FAILED",
          progress: 0,
          message: error.message,
        });
      }
    })();

    res.status(202).json({ jobId, projectId: project.projectId, status: "QUEUED" });
  } catch (error) {
    next(error);
  }
}

/** GET /api/projects/:projectId/architecture */
export async function getArchitecture(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    const architecture = await Architecture.findOne({ projectId: req.params.projectId });
    if (!architecture) {
      const error = new Error("No architecture generated yet.");
      error.status = 404;
      throw error;
    }
    res.json(architecture);
  } catch (error) {
    next(error);
  }
}
