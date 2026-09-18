import Analysis from "../models/Analysis.js";
import Architecture from "../models/Architecture.js";
import Deployment from "../models/Deployment.js";
import Project from "../models/Project.js";
import { askAiEngine } from "../services/aiEngineClient.js";
import { requireOwnedProject } from "../services/projectService.js";
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
    deployment.status = "APPROVED";
    deployment.approvedBy = req.user._id.toString();
    deployment.approvedAt = new Date();
    await deployment.save();

    const project = await requireOwnedProject(req.user._id, deployment.projectId);
    project.status = "deploying";
    await project.save();

    const jobId = newId("job");
    runDeploymentSimulation(deployment);

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

    emitProgress(deployment.projectId, "DEPLOYMENT_FAILED", {
      step: "REJECTED",
      progress: 0,
      message: "Deployment rejected by the user. No resources were created.",
    });

    res.json({ deploymentId: deployment.deploymentId, status: "REJECTED" });
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

/** POST /api/deployments/:deploymentId/rollback */
export async function rollbackDeployment(req, res, next) {
  try {
    const deployment = await findOwnedDeployment(req);
    deployment.status = "ROLLING_BACK";
    await deployment.save();

    setTimeout(async () => {
      deployment.status = "ROLLED_BACK";
      await deployment.save();
      emitProgress(deployment.projectId, "ROLLBACK_COMPLETED", {
        step: "ROLLED_BACK",
        progress: 100,
        message: "Rollback completed.",
      });
    }, 4000);

    res.json({ deploymentId: deployment.deploymentId, status: "ROLLING_BACK" });
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
 * Simulated deployment progression. Replace the body with the AI engine's
 * approved AWS execution endpoint when real AWS execution is wired up.
 */
async function runDeploymentSimulation(deployment) {
  const projectId = deployment.projectId;
  const steps = [
    { type: "DEPLOYMENT_STARTED", status: "DEPLOYING", progress: 10, message: "Deployment started." },
    { type: "BUILD_STARTED", status: "BUILDING", progress: 25, message: "Building container image..." },
    { type: "BUILD_COMPLETED", status: "BUILDING", progress: 45, message: "Container image built." },
    { type: "DEPLOYMENT_PROGRESS", status: "DEPLOYING", progress: 70, message: "Provisioning compute and injecting secrets..." },
    { type: "HEALTH_CHECK", status: "HEALTH_CHECK", progress: 90, message: "Running health check..." },
    { type: "DEPLOYMENT_COMPLETED", status: "SUCCESS", progress: 100, message: "Deployment completed." },
  ];

  try {
    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      deployment.status = step.status;
      deployment.currentStep = step.status;
      deployment.progress = step.progress;
      deployment.logs.push({
        type: step.type === "DEPLOYMENT_FAILED" ? "error" : "info",
        message: step.message,
        step: step.status,
        progress: step.progress,
      });
      await deployment.save();
      emitProgress(projectId, step.type, {
        step: step.status,
        progress: step.progress,
        message: step.message,
      });
    }

    deployment.url = `https://deploymate-demo.ap-south-1.amazonaws.com`;
    deployment.completedAt = new Date();
    await deployment.save();

    await Project.findOneAndUpdate(
      { projectId },
      { status: "deployed", health: "healthy", url: deployment.url, lastDeployment: new Date() }
    );
  } catch (error) {
    deployment.status = "FAILED";
    deployment.errorMessage = error.message;
    await deployment.save();
    emitProgress(projectId, "DEPLOYMENT_FAILED", {
      step: "FAILED",
      progress: 0,
      message: error.message,
    });
  }
}
