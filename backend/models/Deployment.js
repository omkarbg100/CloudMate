import mongoose from "mongoose";

const deploymentLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ["info", "success", "warning", "error"] },
  message: String,
  step: String,
  progress: Number,
});

const deploymentSchema = new mongoose.Schema(
  {
    deploymentId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    userId: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "PLANNING",
        "AWAITING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "BUILDING",
        "DEPLOYING",
        "HEALTH_CHECK",
        "SUCCESS",
        "FAILED",
        "ROLLING_BACK",
        "ROLLED_BACK",
      ],
      default: "PLANNING",
    },
    region: { type: String, default: "ap-south-1" },
    awsConnectionId: { type: String, default: null },
    steps: [{ type: String }],
    currentStep: { type: String, default: null },
    progress: { type: Number, default: 0 },
    logs: [deploymentLogSchema],
    url: { type: String, default: null },
    resources: [{ type: String }],
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Deployment", deploymentSchema);
