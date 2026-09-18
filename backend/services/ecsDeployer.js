/**
 * Real ECS deployment pipeline.
 *
 * Everything here is genuine AWS API + Docker operations — there is no
 * simulation. If a prerequisite is missing in the runtime (e.g. no Docker CLI),
 * the run FAILS with the real reason instead of faking success.
 *
 * Pipeline: prereq checks -> GitHub source tarball -> ECR login -> build ->
 * push -> register task definition -> ECS service rollout -> stability wait,
 * with every stage streamed over WebSocket via the `log` callback.
 */

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ECRClient, DescribeRepositoriesCommand, CreateRepositoryCommand, GetAuthorizationTokenCommand } from "@aws-sdk/client-ecr";
import { EC2Client, DescribeSubnetsCommand } from "@aws-sdk/client-ec2";
import {
  ECSClient,
  CreateClusterCommand,
  CreateServiceCommand,
  DescribeClustersCommand,
  DescribeServicesCommand,
  ListClustersCommand,
  ListServicesCommand,
  ListTaskDefinitionsCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand,
} from "@aws-sdk/client-ecs";
import { decryptSecret } from "./awsCrypto.js";

const run = promisify(execFile);

const DEFAULT_MEMORY = 512;
const DEFAULT_CPU = 256;

/** Fails the run with the real missing-prerequisite reason. */
export class PrerequisiteError extends Error {
  constructor(message, fix) {
    super(`BLOCKED: ${message}`);
    this.name = "PrerequisiteError";
    this.fix = fix;
  }
}

async function dockerCliAvailable() {
  try {
    await run("docker", ["version", "--format", "{{.Server.Version}}"]);
    return true;
  } catch {
    return false;
  }
}

async function toJson(stream) {
  let out = "";
  for await (const chunk of stream) out += chunk;
  return JSON.parse(out);
}

/** Deterministic ECS resource names for a project (shared with monitoring). */
export function deploymentIdentifiers(project) {
  const slug = (project.projectId || "app").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  return {
    clusterName: `deploymate-${project.projectId}`,
    serviceName: `${slug}-app`,
    family: `${slug}-app`,
    logGroup: `/deploymate/${slug}-app`,
  };
}

/**
 * Runs the full pipeline for one approved deployment.
 * @param {Object} deps { deployment, project, connection, githubToken, log }
 */
export async function deployToEcs({ deployment, project, connection, githubToken, log }) {
  const branch = project.deploymateBranch || project.branch || "main";
  const repoName = `${(project.projectId || "app").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}-app`;
  const region = connection.region;

  log("info", "Checking deployment prerequisites…", "PREREQUISITES", 5);
  if (!(await dockerCliAvailable())) {
    throw new PrerequisiteError(
      "Docker CLI is not available in the backend runtime. Building and pushing the image to ECR requires the Docker engine.",
      "Install docker-cli in the backend image and expose the host Docker engine (e.g. mount /var/run/docker.sock in compose)."
    );
  }
  if (!githubToken) {
    throw new PrerequisiteError(
      "No GitHub token is available for this project, so the sources could not be pulled.",
      "Create the project from a real GitHub login (demo users cannot deploy)."
    );
  }

  const workspace = path.join(os.tmpdir(), "deploymate", `${project.projectId}-${Date.now()}`);
  await mkdir(workspace, { recursive: true });
  let contextBundle = path.join(os.tmpdir(), "deploymate", `ctx-${project.projectId}-${Date.now()}.tar.gz`);

  try {
    const credentials = {
      accessKeyId: connection.accessKeyId,
      secretAccessKey: decryptSecret(connection.encryptedSecretAccessKey),
    };

    // 1) Source tarball from the deploymate branch (no git CLI needed).
    log("info", `Pulling source from ${project.repoOwner}/${project.repoName}@${branch}…`, "SOURCE", 12);
    const tarballUrl = `https://codeload.github.com/${project.repoOwner}/${project.repoName}/tar.gz/refs/heads/${encodeURIComponent(branch)}`;
    const response = await fetch(tarballUrl, { headers: { "User-Agent": "DeployMate-Studio" }, redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Could not fetch repository source (HTTP ${response.status}).`);
    }
    const bundle = path.join(workspace, "source.tar.gz");
    await new Promise((resolve, reject) => {
      const file = createWriteStream(bundle);
      response.body.pipe(file);
      response.body.on("error", reject);
      file.on("finish", resolve);
      file.on("error", reject);
    });
    await run("tar", ["-xzf", bundle, "-C", workspace, "--strip-components=1"]);
    log("info", `Source extracted from ${branch}.`, "SOURCE", 18);

    // 2) ECR repository + login.
    log("info", `Ensuring ECR repository ${repoName}…`, "ECR", 22);
    const ecr = new ECRClient({ region, credentials });
    let repository;
    try {
      const existing = await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repoName] }));
      repository = existing.repositories?.[0];
    } catch (error) {
      if (!error?.name?.includes("RepositoryNotFound")) throw error;
      repository = await ecr.send(new CreateRepositoryCommand({ repositoryName: repoName }));
    }
    ecr.destroy();

    const authClient = new ECRClient({ region, credentials });
    const auth = await authClient.send(new GetAuthorizationTokenCommand({}));
    authClient.destroy();
    const tokenData = auth.authorizationData?.[0];
    if (!tokenData?.authorizationToken || !tokenData?.proxyEndpoint) {
      throw new Error("ECR authorization token was not returned.");
    }
    const registryHost = new URL(tokenData.proxyEndpoint).host;
    const password = Buffer.from(tokenData.authorizationToken, "base64").toString("utf8").split(":")[1];
    const imageTag = `${tokenData.proxyEndpoint.split("//")[1]}/${repoName}:${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Date.now() / 1000).toString(36)}`;

    log("info", `Authenticating Docker to ${registryHost}…`, "ECR", 26);
    await run("docker", ["login", "--username", "AWS", "--password", password, registryHost], { timeout: 120000 });

    // 3) Build + push.
    log("info", "Building container image…", "BUILD", 45);
    // Docker-outside-of-Docker: the host daemon cannot read the container's
    // filesystem, so stream the extracted workspace as a tarball over stdin.
    await run("tar", ["-czf", contextBundle, "-C", workspace, "."], { timeout: 5 * 60_000 });
    await buildFromTarball(imageTag, contextBundle);
    log("success", `Image built: ${imageTag}`, "BUILD", 60);

    log("info", "Pushing image to ECR…", "PUSH", 70);
    const pushOut = await run("docker", ["push", imageTag], { timeout: 15 * 60_000, maxBuffer: 8 * 1024 * 1024 });
    log("success", `Pushed image to ECR (${pushOut.stdout.trim().split("\n").slice(-2).join(" ")}).`, "PUSH", 80);

    // 4) Task definition.
    log("info", "Registering task definition…", "ECS", 85);
    const ecs = new ECSClient({ region, credentials });
    const taskDef = await ecs.send(
      new RegisterTaskDefinitionCommand({
        family: repoName,
        requiresCompatibilities: ["FARGATE"],
        networkMode: "awsvpc",
        cpu: String(DEFAULT_CPU),
        memory: String(DEFAULT_MEMORY),
        executionRoleArn: null, // Fargate uses the account default execution role when omitted
        containerDefinitions: [
          {
            name: "app",
            image: imageTag,
            essential: true,
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": `/deploymate/${repoName}`,
                "awslogs-region": region,
                "awslogs-stream-prefix": "app",
              },
            },
          },
        ],
      })
    );
    const taskDefinition = `${taskDef.taskDefinition.family}:${taskDef.taskDefinition.revision}`;

    // 5) Cluster (Fargate) + service.
    log("info", "Ensuring ECS cluster + service…", "ECS", 90);
    const clusterName = `deploymate-${project.projectId}`;
    let clusterArn = null;
    const clustersPage = await ecs.send(new ListClustersCommand({ maxResults: 20 }));
    for (const arn of clustersPage.clusterArns ?? []) {
      const described = await ecs.send(new DescribeClustersCommand({ clusters: [arn] }));
      if (described.clusters?.[0]?.clusterName === clusterName) {
        clusterArn = arn;
        break;
      }
    }
    if (!clusterArn) {
      const cluster = await ecs.send(new CreateClusterCommand({ clusterName, capacityProviders: ["FARGATE"] }));
      clusterArn = cluster.cluster?.clusterArn;
    }

    const subnetsRes = await new EC2Client({ region, credentials }).send(new DescribeSubnetsCommand({ MaxResults: 5 }));
    const subnets = (subnetsRes.subnets ?? []).filter((s) => s.AvailabilityZone?.includes(region.slice(-1)) || true).map((s) => s.SubnetId).slice(0, 3);
    if (subnets.length === 0) {
      throw new Error("No default VPC subnets found. Create subnets in the region or set a VPC configuration.");
    }

    const existingService = await findService(ecs, clusterName, repoName);
    if (existingService) {
      await ecs.send(new UpdateServiceCommand({ cluster: clusterName, service: repoName, taskDefinition, desiredCount: 1 }));
      log("info", "Service updated with the new task definition.", "ECS", 93);
    } else {
      await ecs.send(
        new CreateServiceCommand({
          cluster: clusterName,
          serviceName: repoName,
          taskDefinition,
          desiredCount: 1,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: { subnets, assignPublicIp: "ENABLED" },
          },
        })
      );
      log("info", "Service created on Fargate.", "ECS", 93);
    }

    log("info", "Waiting for ECS service to reach a stable state…", "HEALTH_CHECK", 96);
    await waitForServiceStable(ecs, clusterName, repoName, 10 * 60_000);
    log("success", "ECS service is running and stable.", "HEALTH_CHECK", 100);

    ecs.destroy();
    return {
      imageTag,
      taskDefinition,
      clusterName,
      serviceName: repoName,
      region,
      accountId: connection.accountId,
      // No load balancer is provisioned in this release, so a public URL is
      // not fabricated. The task can be reached through the cluster.
      url: null,
      note: "Service deployed on Fargate. A public URL requires a load balancer (not provisioned).",
    };
  } finally {
    await rm(workspace, { recursive: true, force: true }).catch(() => {});
    await rm(contextBundle, { force: true }).catch(() => {});
  }
}

/**
 * docker build -t <tag> -  reading the (gzipped) context tarball from stdin.
 * Works through the mounted host socket without the daemon seeing the
 * container's filesystem; captures real build output, fails on nonzero exit.
 */
function buildFromTarball(tag, bundlePath) {
  return new Promise((resolve, reject) => {
    let output = "";
    const child = spawn("docker", ["build", "-t", tag, "-"], { stdio: ["pipe", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout: output });
      reject(new Error(`docker build failed (exit ${code}): ${output.slice(-1500)}`));
    });
    createReadStream(bundlePath).pipe(child.stdin);
  });
}

async function findService(ecs, clusterName, serviceName) {
  const page = await ecs.send(new ListServicesCommand({ cluster: clusterName, maxResults: 20 }));
  const matches = (page.serviceArns ?? []).filter((arn) => arn.includes(`/${serviceName}$`));
  if (matches.length === 0) return null;
  const described = await ecs.send(new DescribeServicesCommand({ cluster: clusterName, services: matches }));
  return described.services?.[0] ?? null;
}

async function waitForServiceStable(ecs, cluster, service, timeoutMs) {
  const started = Date.now();
  for (;;) {
    const described = await ecs.send(new DescribeServicesCommand({ cluster, services: [service] }));
    const svc = described.services?.[0];
    if (!svc) throw new Error("Service disappeared during rollout.");
    const running = svc.deployments?.[0]?.runningCount ?? 0;
    const desired = svc.desiredCount ?? 1;
    if (svc.status === "ACTIVE" && svc.deployments?.[0]?.status === "PRIMARY" && running === desired) return;
    if (svc.deployments?.[0]?.rolloutState === "FAILED") {
      throw new Error("ECS service rollout failed (check task logs).");
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for the ECS service to become stable.");
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

/** Real rollback: point the service at the previous task definition revision. */
export async function rollbackEcsService({ deployment, project, connection, log }) {
  if (!connection || connection.status !== "connected") {
    throw new PrerequisiteError("the AWS connection for this project is not validated.", "Re-run Test Connection before trying again.");
  }
  const region = connection.region;
  const credentials = {
    accessKeyId: connection.accessKeyId,
    secretAccessKey: decryptSecret(connection.encryptedSecretAccessKey),
  };
  const serviceName = `${(project.projectId || "app").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}-app`;
  const clusterName = `deploymate-${project.projectId}`;

  log("info", `Rolling back service ${serviceName}…`, "ROLLBACK", 20);
  const ecs = new ECSClient({ region, credentials });
  const service = await findService(ecs, clusterName, serviceName);
  if (!service) {
    ecs.destroy();
    throw new PrerequisiteError("no ECS service exists for this project to roll back.", "Deploy this project once before requesting a rollback.");
  }
  const currentArn = service.taskDefinition;
  const familyName = currentArn.split("/")[1].split(":")[0];
  const versions = await ecs.send(new ListTaskDefinitionsCommand({ familyPrefix: familyName, status: "ACTIVE", sort: "DESC", maxResults: 5 }));
  const candidates = (versions.taskDefinitionArns ?? []).filter((arn) => arn !== currentArn);
  if (candidates.length === 0) {
    ecs.destroy();
    throw new PrerequisiteError("only one task definition revision exists, nothing to roll back to.", "");
  }

  await ecs.send(new UpdateServiceCommand({ cluster: clusterName, service: serviceName, taskDefinition: candidates[0], desiredCount: 1 }));
  await waitForServiceStable(ecs, clusterName, serviceName, 10 * 60_000);
  ecs.destroy();
  log("success", `Service rolled back to ${candidates[0]}.`, "ROLLBACK", 100);
  return { taskDefinition: candidates[0] };
}