import mongoose from "mongoose";

const awsConnectionSchema = new mongoose.Schema(
  {
    connectionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    // IAM user credentials. The secret is stored encrypted at rest (AES-256-GCM);
    // it is resolved only inside the AWS credential service, never serialized
    // in API responses, logs, AI prompts, WebSockets, or git.
    projectId: { type: String, default: null, index: true },
    accessKeyId: { type: String, default: null },
    encryptedSecretAccessKey: { type: String, default: null },
    region: { type: String, required: true, default: "ap-south-1" },
    accountId: { type: String, default: null },
    identityArn: { type: String, default: null },
    // Legacy role-based fields — kept for schema compatibility, no longer used.
    roleArn: { type: String, default: null },
    externalId: { type: String, default: null },
    lastDiscovery: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["pending", "connected", "failed", "disconnected"],
      default: "pending",
    },
    lastValidatedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

// A user has at most one active connection per project.
awsConnectionSchema.index({ userId: 1, projectId: 1 }, { unique: true, partialFilterExpression: { projectId: { $type: "string" } } });

export default mongoose.model("AwsConnection", awsConnectionSchema);