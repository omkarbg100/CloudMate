import Project from "../models/Project.js";
import AwsConnection from "../models/AwsConnection.js";
import { requireOwnedProject } from "../services/projectService.js";
import { deploymentIdentifiers } from "../services/ecsDeployer.js";
import {
  clientsFor,
  awsErrorMessage,
  GetMetricDataCommand,
  DescribeAlarmsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  DescribeServicesCommand,
} from "../services/awsService.js";
import { emitEvent } from "../utils/events.js";

async function connectedConnection(req, project) {
  const connection = project.awsConnectionId
    ? await AwsConnection.findOne({ connectionId: project.awsConnectionId })
    : null;
  if (!connection || connection.status !== "connected") return null;
  return connection;
}

function notAvailable(res, projectId, reason) {
  return res.json({ projectId, available: false, reason });
}

/** GET /api/monitoring/:projectId/health */
export async function getHealth(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const connection = await connectedConnection(req, project);

    let status = project.health ?? "unknown";
    let detail = null;

    if (connection) {
      try {
        const clients = clientsFor(connection);
        const ident = deploymentIdentifiers(project);
        const described = await clients.ecs.send(new DescribeServicesCommand({ cluster: ident.clusterName, services: [ident.serviceName] }));
        clients.ecs.destroy();
        const service = described.services?.[0];
        if (service) {
          const running = service.runningCount ?? 0;
          const desired = service.desiredCount ?? 1;
          detail = { runningCount: running, desiredCount: desired, serviceStatus: service.status ?? "unknown" };
          status = service.status === "ACTIVE" && running === desired ? "healthy" : "warning";
        } else {
          detail = { reason: "No ECS service exists for this project yet." };
          status = "unknown";
        }
      } catch (error) {
        detail = { reason: awsErrorMessage(error) };
        status = "warning";
      }
    }

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
      detail,
      connected: Boolean(connection),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/metrics — real CloudWatch ECS metrics. */
export async function getMetrics(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const connection = await connectedConnection(req, project);
    if (!connection) {
      return notAvailable(res, project.projectId, "Connect this project to AWS (validated connection) to fetch live metrics.");
    }

    const clients = clientsFor(connection);
    const ident = deploymentIdentifiers(project);
    const end = new Date();
    const start = new Date(end.getTime() - 15 * 60 * 1000);

    try {
      const result = await clients.cloudwatch.send(
        new GetMetricDataCommand({
          StartTime: start,
          EndTime: end,
          MetricDataQueries: ["CPU", "Memory"].map((name, index) => ({
            Id: `m_${index + 1}`,
            Label: name === "CPU" ? "CPUUtilization" : "MemoryUtilization",
            MetricStat: {
              Metric: {
                Namespace: "AWS/ECS",
                MetricName: name === "CPU" ? "CPUUtilization" : "MemoryUtilization",
                Dimensions: [
                  { Name: "ClusterName", Value: ident.clusterName },
                  { Name: "ServiceName", Value: ident.serviceName },
                ],
              },
              Period: 300,
              Stat: "Average",
            },
          })),
        })
      );

      const series = (result.MetricDataResults ?? []).map((entry) => ({
        label: entry.Label,
        points: (entry.Timestamps ?? []).map((timestamp, i) => ({
          timestamp,
          value: entry.Values?.[i] ?? null,
        })),
      }));

      clients.cloudwatch.destroy();
      return res.json({
        projectId: project.projectId,
        available: true,
        timestamp: new Date().toISOString(),
        series,
        note: "Request-level metrics (requestCount/errorRate) require an Application Load Balancer, which this release does not provision.",
      });
    } catch (error) {
      clients.cloudwatch.destroy();
      return notAvailable(res, project.projectId, awsErrorMessage(error));
    }
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/logs — real CloudWatch Logs tail. */
export async function getLogs(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const connection = await connectedConnection(req, project);
    if (!connection) {
      return notAvailable(res, project.projectId, "Connect this project to AWS (validated connection) to fetch live logs.");
    }

    const clients = clientsFor(connection);
    const ident = deploymentIdentifiers(project);
    try {
      const streams = await clients.cloudwatchLogs.send(
        new DescribeLogStreamsCommand({ logGroupName: ident.logGroup, orderBy: "LastEventTime", descending: true, limit: 1 })
      );
      const stream = streams.logStreams?.[0];
      if (!stream) {
        clients.cloudwatchLogs.destroy();
        return res.json({ projectId: project.projectId, available: true, logs: [], note: "No log stream has emitted events yet." });
      }
      const events = await clients.cloudwatchLogs.send(
        new GetLogEventsCommand({
          logGroupName: ident.logGroup,
          logStreamName: stream.logStreamName,
          startFromHead: false,
          limit: 100,
        })
      );
      clients.cloudwatchLogs.destroy();
      const logs = (events.events ?? [])
        .reverse()
        .map((event) => ({ timestamp: new Date(event.timestamp ?? Date.now()).toISOString(), level: "INFO", message: event.message ?? "" }));
      return res.json({ projectId: project.projectId, available: true, logs });
    } catch (error) {
      clients.cloudwatchLogs.destroy();
      return notAvailable(res, project.projectId, awsErrorMessage(error));
    }
  } catch (error) {
    next(error);
  }
}

/** GET /api/monitoring/:projectId/alerts — real CloudWatch alarms. */
export async function getAlerts(req, res, next) {
  try {
    const project = await requireOwnedProject(req.user._id, req.params.projectId);
    const connection = await connectedConnection(req, project);
    if (!connection) {
      return notAvailable(res, project.projectId, "Connect this project to AWS (validated connection) to fetch alarms.");
    }

    const clients = clientsFor(connection);
    try {
      const alarms = await clients.cloudwatch.send(new DescribeAlarmsCommand({}));
      clients.cloudwatch.destroy();
      const normalized = [
        ...(alarms.MetricAlarms ?? []).map((alarm) => ({
          name: alarm.AlarmName,
          state: alarm.StateValue,
          reason: alarm.StateReason,
          updatedAt: alarm.StateUpdatedTimestamp,
          type: "metric",
        })),
        ...(alarms.CompositeAlarms ?? []).map((alarm) => ({
          name: alarm.AlarmName,
          state: alarm.StateValue,
          reason: alarm.StateReason,
          updatedAt: alarm.StateUpdatedTimestamp,
          type: "composite",
        })),
      ];
      res.json({ projectId: project.projectId, available: true, alerts: normalized });
    } catch (error) {
      clients.cloudwatch.destroy();
      return notAvailable(res, project.projectId, awsErrorMessage(error));
    }
  } catch (error) {
    next(error);
  }
}