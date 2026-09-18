import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema({
  id: String,
  label: String,
  service: String,
  purpose: String,
  decision: { type: String, enum: ["create", "reuse", "modify"] },
  existingResourceId: String,
});

const edgeSchema = new mongoose.Schema({
  from: String,
  to: String,
  label: String,
});

const resourceDecisionSchema = new mongoose.Schema({
  id: String,
  service: String,
  action: { type: String, enum: ["create", "reuse", "modify"] },
  targetName: String,
  existingResourceId: String,
  reason: String,
  riskLevel: { type: String, enum: ["low", "medium", "high"] },
  approvalRequired: Boolean,
});

const architectureSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    awsConnectionId: String,
    region: { type: String, default: "ap-south-1" },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    rationale: [{ type: String }],
    resourceDecisions: [resourceDecisionSchema],
    status: { type: String, enum: ["pending", "generated", "approved"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Architecture", architectureSchema);
