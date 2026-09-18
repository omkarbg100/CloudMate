import Project from "../models/Project.js";
import { requireOwnedProject } from "../services/projectService.js";
import { emitEvent } from "../utils/events.js";

/** GET /api/monitoring/:projectId/health */
export async function getHealth(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const status = project.health ?? "unknown";

    if (status === "unhealthy") {
      emitEvent(project.projectId, "MONITORING_ALERT", {
        severity: "high",
        message: "Application health check is failing.",
      });
    }

    res.json({
      projectId: project.projectId,
      status,
      url: project.url ?? null,
      lastDeployment: project.lastDeployment ?? null,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/metrics — simulated until CloudWatch is wired. */
export async function getMetrics(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    res.json({
      projectId: req.params.projectId,
      timestamp: new Date().toISOString(),
      requestCount: Math.floor(Math.random() * 500) + 100,
      errorRate: Number((Math.random() * 2).toFixed(2)),
      cpuUtilization: Number((Math.random() * 40 + 10).toFixed(1)),
      memoryUtilization: Number((Math.random() * 50 + 20).toFixed(1)),
      p99Latency: Math.floor(Math.random() * 200 + 50),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/logs */
export async function getLogs(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    const logs = [
      { timestamp: new Date().toISOString(), level: "INFO", message: "GET /health 200 4ms" },
      { timestamp: new Date().toISOString(), level: "INFO", message: "GET /api/users 200 12ms" },
      { timestamp: new Date().toISOString(), level: "WARN", message: "Query took 2400ms" },
    ];
    res.json({ projectId: req.params.projectId, logs });
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/alerts */
export async function getAlerts(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.params.projectId);
    res.json({ projectId: req.params.projectId, alerts: [] });
  } catch (error) {
    next(error);
  }
}
