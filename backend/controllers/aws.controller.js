import AwsConnection from "../models/AwsConnection.js";
import Project from "../models/Project.js";
import { requireOwnedProject } from "../services/projectService.js";
import {
  awsErrorMessage,
  discoverResources,
  getConnectionForProject,
  safeConnection,
  validateCredentials,
} from "../services/awsService.js";
import { encryptSecret } from "../services/awsCrypto.js";
import { newId } from "../utils/ids.js";

/** GET /api/aws/connections — safe metadata list (secrets never serialized). */
export async function listConnections(req, res, next) {
  try {
    const connections = await AwsConnection.find({ userId: req.user._id.toString() }).sort({
      createdAt: -1,
    });
    res.json(connections.map(safeConnection));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/aws/connect
 * Validates IAM user access keys with STS GetCallerIdentity BEFORE storing.
 * The secret access key is encrypted at rest (AES-256-GCM); only the
 * Access Key ID and validated identity metadata are ever returned or logged.
 */
export async function connectAwsAccount(req, res, next) {
  try {
    const { projectId, accessKeyId, secretAccessKey, region } = req.body;
    await requireOwnedProject(req.user._id, projectId);

    const provisional = new AwsConnection({
      userId: req.user._id.toString(),
      projectId,
      accessKeyId,
      encryptedSecretAccessKey: null,
      region,
      status: "pending",
    });

    let validation;
    try {
      validation = await validateCredentials(provisional);
    } catch (error) {
      return res.status(401).json({ connected: false, error: awsErrorMessage(error) });
    }

    const connectionId = newId("aws_conn");
    const connection = await AwsConnection.findOneAndUpdate(
      { userId: req.user._id.toString(), projectId },
      {
        $set: {
          connectionId,
          accessKeyId,
          encryptedSecretAccessKey: encryptSecret(secretAccessKey),
          region,
          accountId: validation.accountId,
          identityArn: validation.arn,
          status: "connected",
          lastValidatedAt: new Date(),
          lastError: null,
        },
      },
      { upsert: true, new: true }
    );

    await Project.updateOne({ projectId, userId: req.user._id.toString() }, { $set: { awsConnectionId: connection.connectionId, awsRegion: region } });

    res.json({ connected: true, connection: safeConnection(connection) });
  } catch (error) {
    next(error);
  }
}

/** GET /api/aws/status?projectId= — the project's connection state (never the secret). */
export async function getAwsStatus(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.query.projectId);
    const connection = await getConnectionForProject(req.user._id, req.query.projectId);
    res.json({ connected: connection.status === "connected", connection: safeConnection(connection) });
  } catch (error) {
    next(error);
  }
}

/** POST /api/aws/test — re-validates the stored credentials with STS. */
export async function testAwsConnection(req, res, next) {
  try {
    const { projectId } = req.body;
    const connection = await getConnectionForProject(req.user._id, projectId);

    let validation;
    try {
      validation = await validateCredentials(connection);
    } catch (error) {
      connection.status = "failed";
      connection.lastError = awsErrorMessage(error);
      connection.lastValidatedAt = null;
      await connection.save();
      return res.json({ connected: false, connection: safeConnection(connection) });
    }

    connection.status = "connected";
    connection.accountId = validation.accountId;
    connection.identityArn = validation.arn;
    connection.region = validation.region;
    connection.lastValidatedAt = new Date();
    connection.lastError = null;
    await connection.save();

    res.json({ connected: true, connection: safeConnection(connection) });
  } catch (error) {
    next(error);
  }
}

/** POST /api/aws/discover — real ECR/ECS/CloudWatch discovery within permitted services. */
export async function discoverProjectAws(req, res, next) {
  try {
    const { projectId } = req.body;
    const project = await requireOwnedProject(req.user._id, projectId);
    const connection = await getConnectionForProject(req.user._id, projectId);

    if (connection.status !== "connected") {
      const error = new Error("AWS connection is not validated. Re-run 'Test Connection' first.");
      error.status = 409;
      throw error;
    }

    const discovery = await discoverResources(projectId, connection);
    connection.lastDiscovery = discovery;
    await connection.save();
    if (!project.awsRegion) {
      project.awsRegion = connection.region;
      await project.save();
    }

    res.json(discovery);
  } catch (error) {
    next(error);
  }
}

/** GET /api/aws/resources?projectId= — last discovery result (persisted, never re-simulated). */
export async function getAwsResources(req, res, next) {
  try {
    await requireOwnedProject(req.user._id, req.query.projectId);
    const connection = await getConnectionForProject(req.user._id, req.query.projectId);
    if (connection.lastDiscovery) {
      return res.json(connection.lastDiscovery);
    }
    res.status(404).json({ scannedAt: null, resources: [], message: "No discovery has run for this project yet. Run AWS discovery first." });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/aws/disconnect — removes the project's stored credentials. */
export async function disconnectAwsAccount(req, res, next) {
  try {
    const { projectId } = req.body;
    const connection = await getConnectionForProject(req.user._id, projectId);
    await connection.deleteOne();
    await Project.updateOne({ projectId, userId: req.user._id.toString() }, { $unset: { awsConnectionId: "", awsRegion: "" } });
    res.json({ disconnected: true });
  } catch (error) {
    next(error);
  }
}