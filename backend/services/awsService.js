/**
 * AWS credential service.
 *
 * Resolves a project's AWS connection (userId + projectId scoped), builds
 * AWS SDK clients from the stored IAM user credentials and NEVER serializes
 * the secret access key anywhere. Only the Access Key ID and safe metadata
 * leave this module.
 */

import {
  CloudWatchClient,
  GetMetricDataCommand,
  ListMetricsCommand,
  PutMetricAlarmCommand,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient, DescribeLogGroupsCommand, DescribeLogStreamsCommand, GetLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import {
  ECRClient,
  DescribeRepositoriesCommand,
  GetAuthorizationTokenCommand,
  CreateRepositoryCommand,
} from "@aws-sdk/client-ecr";
import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTaskDefinitionsCommand,
} from "@aws-sdk/client-ecs";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import AwsConnection from "../models/AwsConnection.js";
import { decryptSecret } from "./awsCrypto.js";

const MAX_RESULTS = 50;

/** Build STS/ECR/ECS/CloudWatch clients from a connection's decrypted credentials. */
function clientsFor(connection) {
  const region = connection.region ?? process.env.AWS_REGION ?? "ap-south-1";
  const secretAccessKey = decryptSecret(connection.encryptedSecretAccessKey);
  const credentials = {
    accessKeyId: connection.accessKeyId,
    secretAccessKey,
  };
  return {
    region,
    sts: new STSClient({ region, credentials }),
    ecr: new ECRClient({ region, credentials }),
    ecs: new ECSClient({ region, credentials }),
    cloudwatch: new CloudWatchClient({ region, credentials }),
    cloudwatchLogs: new CloudWatchLogsClient({ region, credentials }),
  };
}

/** Fetch the project-scoped connection for a user (throws 404/401 when missing). */
export async function getConnectionForProject(userId, projectId) {
  const connection = await AwsConnection.findOne({ userId: userId.toString(), projectId });
  if (!connection) {
    const error = new Error("No AWS connection for this project.");
    error.status = 404;
    throw error;
  }
  return connection;
}

/** Safe serialization of a connection for API responses (never the secret). */
export function safeConnection(connection) {
  return {
    connectionId: connection.connectionId,
    projectId: connection.projectId,
    userId: connection.userId,
    accessKeyId: connection.accessKeyId ?? "", // masked by the frontend
    region: connection.region,
    accountId: connection.accountId,
    identityArn: connection.identityArn,
    status: connection.status,
    lastValidatedAt: connection.lastValidatedAt,
    lastError: connection.lastError,
  };
}

/** Wraps an STS GetCallerIdentity call and returns safe identity metadata. */
export async function validateCredentials(connection) {
  const { sts, region } = clientsFor(connection);
  try {
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    const accountId = identity.Account;
    const arn = identity.Arn;
    return { connected: true, accountId: accountId ?? null, arn: arn ?? null, region };
  } finally {
    sts.destroy();
  }
}

/** Normalize AWS SDK errors into clean, sanitized messages (never secrets). */
export function awsErrorMessage(error) {
  const name = error?.name ?? "";
  const code = error?.message?.includes("InvalidClientTokenId")
    ? "invalid credentials"
    : error?.name?.includes("AccessDenied")
      ? "access denied"
      : "";
  const message = error?.message ?? "AWS operation failed";
  // Never leak request params (credentials, etc.).
  const reason = code || name || message.split("\n")[0] || "unknown error";
  return `AWS ${reason}`;
}

/**
 * Real AWS resource discovery restricted to what the connected credentials can
 * read. Every service is guarded so one denied service does not fail the scan;
 * the result reports permission state instead of inventing resources.
 */
export async function discoverResources(projectId, connection) {
  const clients = clientsFor(connection);
  const result = { projectId, region: clients.region, scannedAt: new Date().toISOString(), resources: [], errors: [] };

  async function attempt(label, fn) {
    try {
      await fn();
    } catch (error) {
      if (isAccessDenied(error)) {
        result.errors.push({ service: label, status: "denied", message: "Insufficient permissions to list resources." });
      } else {
        result.errors.push({ service: label, status: "error", message: awsErrorMessage(error) });
      }
    }
  }

  // ECR repositories
  await attempt("ECR", async () => {
    const page = await clients.ecr.send(new DescribeRepositoriesCommand({ maxResults: MAX_RESULTS }));
    for (const repo of page.repositories ?? []) {
      result.resources.push({
        type: "ECR",
        resourceId: repo.repositoryName,
        name: repo.repositoryName,
        region: clients.region,
        status: "active",
        arn: repo.repositoryArn,
      });
    }
  });

  // ECS clusters + services
  await attempt("ECS", async () => {
    const clusterPage = await clients.ecs.send(new ListClustersCommand({ maxResults: MAX_RESULTS }));
    const clusterArns = clusterPage.clusterArns ?? [];
    const clusters = clusterArns.length
      ? await clients.ecs.send(new DescribeClustersCommand({ clusters: clusterArns }))
      : { clusters: [] };
    for (const cluster of clusters.clusters ?? []) {
      result.resources.push({
        type: "ECS Cluster",
        resourceId: cluster.clusterName,
        name: cluster.clusterName,
        region: clients.region,
        status: cluster.status ?? "unknown",
        arn: cluster.clusterArn,
      });
      const servicesPage = await clients.ecs.send(new ListServicesCommand({ cluster: cluster.clusterName, maxResults: MAX_RESULTS }));
      if (servicesPage.serviceArns?.length) {
        const services = await clients.ecs.send(new DescribeServicesCommand({ cluster: cluster.clusterName, services: servicesPage.serviceArns }));
        for (const service of services.services ?? []) {
          result.resources.push({
            type: "ECS Service",
            resourceId: service.serviceName,
            name: service.serviceName,
            region: clients.region,
            status: service.status ?? "unknown",
            arn: service.serviceArn,
            desiredCount: service.desiredCount,
            runningCount: service.runningCount,
          });
        }
      }
    }
  });

  // CloudWatch Logs groups
  await attempt("CloudWatch Logs", async () => {
    const page = await clients.cloudwatchLogs.send(new DescribeLogGroupsCommand({ limit: MAX_RESULTS }));
    for (const group of page.logGroups ?? []) {
      result.resources.push({
        type: "CloudWatch Log Group",
        resourceId: group.logGroupName,
        name: group.logGroupName,
        region: clients.region,
        status: String(group.storedBytes ?? 0) === "0" ? "empty" : "active",
        arn: group.arn,
      });
    }
  });

  // CloudWatch metrics (sample up to maxResults namespaces)
  await attempt("CloudWatch", async () => {
    const page = await clients.cloudwatch.send(new ListMetricsCommand({ MaxRecords: MAX_RESULTS }));
    const namespaces = new Map();
    for (const metric of page.metrics ?? []) {
      if (namespaces.size >= 10) break;
      if (!namespaces.has(metric.Namespace)) {
        namespaces.set(metric.Namespace, { type: "CloudWatch Metric", resourceId: metric.Namespace, name: metric.Namespace, region: clients.region, status: "available", metricCount: 0 });
      }
      const entry = namespaces.get(metric.Namespace);
      entry.metricCount += 1;
    }
    result.resources.push(...namespaces.values());
  });

  for (const client of [clients.ecr, clients.ecs, clients.cloudwatch, clients.cloudwatchLogs]) client.destroy();
  return result;
}

function isAccessDenied(error) {
  const name = error?.name ?? "";
  const message = error?.message ?? "";
  return name.includes("AccessDenied") || message.includes("Access Denied") || name === "CredentialsProviderError";
}

/** ECR login helpers — the runner authenticates Docker to ECR before pushing. */
export async function getEcrAuthorizationToken(connection) {
  const clients = clientsFor(connection);
  try {
    const result = await clients.ecr.send(new GetAuthorizationTokenCommand({}));
    clients.ecr.destroy();
    return result.authorizationData?.[0] ?? null;
  } catch (error) {
    clients.ecr.destroy();
    throw error;
  }
}

export async function ensureEcrRepository(connection, repositoryName) {
  const clients = clientsFor(connection);
  try {
    try {
      const existing = await clients.ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] }));
      return existing.repositories?.[0];
    } catch (error) {
      if (!error?.name?.includes("RepositoryNotFound")) throw error;
    }
    const created = await clients.ecr.send(new CreateRepositoryCommand({ repositoryName }));
    return created.repository;
  } finally {
    clients.ecr.destroy();
  }
}

export { clientsFor, ECRClient, ECSClient, CloudWatchLogsClient, CloudWatchClient, GetMetricDataCommand, DescribeAlarmsCommand, PutMetricAlarmCommand, GetLogEventsCommand, DescribeLogStreamsCommand, ListTaskDefinitionsCommand, ListServicesCommand, DescribeServicesCommand, DescribeClustersCommand, ListClustersCommand, GetCallerIdentityCommand };