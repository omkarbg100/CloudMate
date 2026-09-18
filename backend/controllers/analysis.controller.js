import AgentExecution from "../models/AgentExecution.js";
import Analysis from "../models/Analysis.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitProgress } from "../utils/events.js";
import { newId } from "../utils/ids.js";

/** POST /api/projects/:projectId/analyze — queue repository analysis. */
export async function runAnalysis(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const jobId = newId("job");

    project.status = "analyzing";
    await project.save();

    // Background job: call the AI engine and persist the analysis.
    (async () => {
      const executionId = newId("exec");
      try {
        await AgentExecution.create({
          executionId,
          projectId: project.projectId,
          userId: req.user._id.toString(),
          agentName: "repository",
          trigger: "user",
          input: { repoOwner: project.repoOwner, repoName: project.repoName, branch: project.branch },
        });

        emitProgress(project.projectId, "ANALYSIS_STARTED", {
          step: "ANALYZING",
          progress: 10,
          message: "Repository agent started analysis...",
        });

        const result = await askAiEngine({
          action: "analyze",
          projectId: project.projectId,
          repoOwner: project.repoOwner,
          repoName: project.repoName,
          branch: project.branch,
          githubToken: req.user.accessToken || undefined,
        });

        await Analysis.findOneAndUpdate(
          { projectId: project.projectId },
          { ...result.analysis, projectId: project.projectId },
          { upsert: true, new: true }
        );

        project.status = "analyzed";
        await project.save();

        await AgentExecution.findOneAndUpdate(
          { executionId },
          { status: "completed", output: result.analysis }
        );

        emitProgress(project.projectId, "ANALYSIS_COMPLETED", {
          step: "ANALYZED",
          progress: 100,
          message: "Repository analysis complete.",
          data: result.analysis,
        });
      } catch (error) {
        await AgentExecution.findOneAndUpdate(
          { executionId },
          { status: "failed", errorMessage: error.message }
        ).catch(() => {});
        emitProgress(project.projectId, "ANALYSIS_FAILED", {
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

/** GET /api/projects/:projectId/analysis */
export async function getAnalysis(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    const analysis = await Analysis.findOne({ projectId: req.params.projectId });
    if (!analysis) {
      const error = new Error("No analysis found. Run analysis first.");
      error.status = 404;
      throw error;
    }
    res.json(analysis);
  } catch (error) {
    next(error);
  }
}
