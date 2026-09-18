import Analysis from "../models/Analysis.js";
import Architecture from "../models/Architecture.js";
import Deployment from "../models/Deployment.js";
import Project from "../models/Project.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
import { getConnectionForProject } from "../services/awsService.js";
import { deployToEcs, rollbackEcsService, PrerequisiteError } from "../services/ecsDeployer.js";
import { emitProgress } from "../utils/events.js";
import { newId } from "../utils/ids.js";

const APPROVAL_POLICY = {
  allowed: true,
  requiresApproval: true,
  violations: [
    {
      id: "approval_gate",
      severity: "medium",
      message: "Creating or modifying AWS resources requires explicit human approval.",
    },
  ],
};

/** POST /api/deployments/plan — build a plan from analysis + architecture. */
export async function createPlan(req, res, next) {
  try {
    const { projectId, awsConnectionId } = req.body;
    const project = await requireOwnedProject(req.user._id, projectId);

    const analysis = await Analysis.findOne({ projectId });
    const architecture = await Architecture.findOne({ projectId });

    const result = await askAiEngine({
      action: "deployment_plan",
      projectId,
      awsConnectionId: awsConnectionId ?? project.awsConnectionId,
      analysis: analysis?.toObject(),
      architecture: architecture?.toObject(),
    });

    const deployment = await Deployment.create({
      deploymentId: newId("deploy"),
      planId: newId("plan"),
      projectId,
      userId: req.user._id.toString(),
      status: "AWAITING_APPROVAL",
      region: result.region ?? project.awsRegion ?? "ap-south-1",
      awsConnectionId: awsConnectionId ?? project.awsConnectionId ?? null,
      steps: result.steps ?? [],
      resources: result.resources ?? [],
    });

    project.status = "awaiting_approval";
    await project.save();

    res.json({
      ...deployment.toObject(),
      requiresApproval: true,
      resourceDecisions: result.resourceDecisions ?? architecture?.resourceDecisions ?? [],
      policyValidation: result.policyValidation ?? APPROVAL_POLICY,
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/deployments/:deploymentId/approve — approve and start deployment. */
export async function approveDeployment(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    const project = await requireOwnedProject(req.user._id, deployment.projectId);

    // Real deployment requires a validated, project-scoped AWS connection.
    let connection;
    try {
      connection = await getConnectionForProject(req.user._id, deployment.projectId);
    } catch {
      const error = new Error("Connect this project to AWS first. Deployment requires validated IAM credentials.");
      error.status = 409;
      throw error;
    }
    if (connection.status !== "connected") {
      const error = new Error("AWS connection is not validated. Re-run 'Test Connection' before deploying.");
      error.status = 409;
      throw error;
    }

    deployment.status = "APPROVED";
    deployment.approvedBy = req.user._id.toString();
    deployment.approvedAt = new Date();
    await deployment.save();

    project.status = "deploying";
    await project.save();

    const jobId = newId("job");
    runRealDeployment(deployment, project, connection, req.user?.accessToken ?? null);

    res.json({ deploymentId: deployment.deploymentId, status: "APPROVED", jobId });
  } catch (error) {
    next(error);
  }
}

/** POST /api/deployments/:deploymentId/reject */
export async function rejectDeployment(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    deployment.status = "REJECTED";
    await deployment.save();

    const project = await requireOwnedProject(req.user._id, deployment.projectId);
    project.status = "analyzed";
    await project.save();

    emitProgress(deployment.projectId, "DEPLOYMENT_REJECTED", {
      step: "REJECTED",
      progress: 0,
      message: "Deployment rejected by the user. No resources were created.",
    });

    res.json({ deploymentId: deployment.deploymentId, status: "REJECTED" });
  } catch (error) {
    next(error);
  }
}

/** POST /api/deployments/:deploymentId/rollback */
export async function rollbackDeployment(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    deployment.status = "ROLLING_BACK";
    await deployment.save();

    const log = makeDeploymentLogger(deployment);
    log("info", "Preparing rollback…", "ROLLBACK", 10);
    emitProgress(deployment.projectId, "ROLLBACK_STARTED", {
      step: "ROLLING_BACK",
      progress: 10,
      message: "Rollback requested. Restoring the previous task definition revision…",
    });

    setTimeout(async () => {
      try {
        const project = await Project.findOne({ projectId: deployment.projectId });
        const connection = await getConnectionForProject(project.userId, project.projectId);
        const result = await rollbackEcsService({ deployment, project, connection, log });
        deployment.status = "ROLLED_BACK";
        deployment.errorMessage = null;
        await deployment.save();
        emitProgress(deployment.projectId, "ROLLBACK_COMPLETED", {
          step: "ROLLED_BACK",
          progress: 100,
          message: `Rolled back to ${result.taskDefinition}.`,
        });
      } catch (error) {
        deployment.status = "FAILED";
        deployment.errorMessage = sanitize(error);
        await deployment.save();
        emitProgress(deployment.projectId, "ROLLBACK_FAILED", {
          step: "FAILED",
          progress: 0,
          message: sanitize(error),
        });
      }
    }, 500);

    res.json({ deploymentId: deployment.deploymentId, status: "ROLLING_BACK" });
  } catch (error) {
    next(error);
  }
}

/** GET /api/deployments/:deploymentId */
export async function getDeployment(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    res.json(deployment);
  } catch (error) {
    next(error);
  }
}

/** GET /api/deployments/:deploymentId/logs */
export async function getDeploymentLogs(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    res.json({
      deploymentId: deployment.deploymentId,
      status: deployment.status,
      logs: deployment.logs,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOwnedDeployment(req) {
  const deployment = await Deployment.findOne({ deploymentId: req.params.deploymentId });
  if (!deployment) {
    const error = new Error("Deployment not found");
    error.status = 404;
    throw error;
  }
  // Ownership check through the parent project.
  await requireOwnedProject(req.user._id, deployment.projectId);
  return deployment;
}

/**
 * Real deployment runner. Executes the ECS pipeline and streams genuine
 * progress. Failures report the real reason (missing Docker, bad permission,
 * etc.) and never fake a success.
 */
async function runRealDeployment(deployment, project, connection, githubToken) {
  const projectId = deployment.projectId;
  const log = makeDeploymentLogger(deployment);

  try {
    const result = await deployToEcs({
      deployment,
      project,
      connection,
      githubToken,
      log,
    });

    deployment.status = "SUCCESS";
    deployment.progress = 100;
    deployment.completedAt = new Date();
    deployment.url = result.url ?? null;
    deployment.errorMessage = null;
    deployment.currentStep = "SUCCESS";
    deployment.logs.push({ type: "success", message: `${result.note ?? "Deployment completed."}`, step: "SUCCESS", progress: 100 });
    await deployment.save();

    await Project.findOneAndUpdate(
      { projectId },
      { status: "deployed", health: "healthy", url: result.url ?? "", lastDeployment: new Date() }
    );

    emitProgress(projectId, "DEPLOYMENT_COMPLETED", {
      step: "SUCCESS",
      progress: 100,
      message: result.note ?? "Deployment completed.",
      data: {
        imageTag: result.imageTag,
        taskDefinition: result.taskDefinition,
        clusterName: result.clusterName,
        serviceName: result.serviceName,
        region: result.region,
        accountId: result.accountId,
      },
    });
  } catch (error) {
    const reason = sanitize(error);
    deployment.status = "FAILED";
    deployment.currentStep = "FAILED";
    deployment.errorMessage = reason;
    deployment.logs.push({ type: "error", message: reason, step: "FAILED", progress: 0 });
    deployment.completedAt = new Date();
    await deployment.save();

    await Project.findOneAndUpdate({ projectId }, { status: "failed", health: "unhealthy", lastDeployment: null });

    emitProgress(projectId, "DEPLOYMENT_FAILED", {
      step: "FAILED",
      progress: 0,
      message: reason,
      blocked: error instanceof PrerequisiteError,
      fix: error instanceof PrerequisiteError ? error.fix : undefined,
    });
  }
}

/** Persists a deployment log line and broadcasts it over the WebSocket. */
function makeDeploymentLogger(deployment) {
  async function log(type, message, step, progress) {
    deployment.logs.push({ type, message, step, progress });
    await deployment.save().catch(() => {});
    emitProgress(deployment.projectId, "DEPLOYMENT_PROGRESS", { step, progress, message });
  }
  return log;
}

/** Displays the real failure reason without leaking secrets. */
function sanitize(error) {
  const raw = error?.message ?? String(error);
  // Never surface AWS parameter payloads (which may embed credentials).
  return raw.replace(/https:\/\//g, "https://").replace(/AKIA[0-9A-Z]{16}/g, "AKIA***").slice(0, 600);
}
