import SecurityScan from "../models/SecurityScan.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitProgress } from "../utils/events.js";
import { newId } from "../utils/ids.js";

/** POST /api/projects/:projectId/security/scan */
export async function runSecurityScan(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const jobId = newId("job");

    (async () => {
      try {
        emitProgress(project.projectId, "SECURITY_SCAN", {
          step: "SCANNING",
          progress: 15,
          message: "Security agent scanning repository...",
        });

        const result = await askAiEngine({
          action: "security",
          projectId: project.projectId,
          repoOwner: project.repoOwner,
          repoName: project.repoName,
          branch: project.branch,
          githubToken: req.user.accessToken || undefined,
        });

        const findings = result.findings ?? [];
        const summary = findings.reduce(
          (acc, finding) => {
            acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
            return acc;
          },
          { critical: 0, high: 0, medium: 0, low: 0 }
        );

        await SecurityScan.findOneAndUpdate(
          { projectId: project.projectId },
          { projectId: project.projectId, findings, summary, scanStatus: "completed" },
          { upsert: true, new: true }
        );

        emitProgress(project.projectId, "SECURITY_SCAN_COMPLETED", {
          step: "DONE",
          progress: 100,
          message: `Security scan complete. ${findings.length} finding(s) found.`,
          data: { findings, summary },
        });
      } catch (error) {
        emitProgress(project.projectId, "SECURITY_SCAN_FAILED", {
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

/** GET /api/projects/:projectId/security */
export async function getSecurity(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    const scan = await SecurityScan.findOne({ projectId: req.params.projectId });
    if (!scan) {
      return res.json({ findings: [], summary: { critical: 0, high: 0, medium: 0, low: 0 } });
    }
    res.json(scan);
  } catch (error) {
    next(error);
  }
}
