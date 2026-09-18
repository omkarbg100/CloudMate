import AwsConnection from "../models/AwsConnection.js";
import { newId } from "../utils/ids.js";

/** GET /api/aws/connections */
export async function listConnections(req, res, next) {
  try {
    const connections = await AwsConnection.find({ userId: req.user._id.toString() }).sort({
      createdAt: -1,
    });
    res.json(connections);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/aws/connections
 * Stores connection *metadata* only (IAM Role ARN + External ID + region).
 * Permanent AWS access keys are never accepted or stored. In production the
 * role is validated with STS AssumeRole before discovery runs.
 */
export async function createConnection(req, res, next) {
  try {
    const { roleArn, externalId, region } = req.body;
    const accountId = roleArn.split(":")[4] ?? null;

    const connection = await AwsConnection.create({
      connectionId: newId("aws_conn"),
      userId: req.user._id.toString(),
      roleArn,
      externalId,
      region,
      accountId,
      status: "pending",
    });

    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
}
