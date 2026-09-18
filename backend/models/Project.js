import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    repoOwner: { type: String, required: true },
    repoName: { type: String, required: true },
    branch: { type: String, default: "main" },
    // GitHub branch the DeployMate coding agent operates on. AI proposals are
    // always committed HERE (src of truth: deploymate), never to main/master.
    defaultBranch: { type: String, default: "main" },
    deploymateBranch: { type: String, default: "deploymate" },
    lastCommitSha: { type: String, default: null },
    status: {
      type: String,
      enum: ["connected", "analyzing", "analyzed", "awaiting_approval", "deploying", "deployed", "failed"],
      default: "connected",
    },
    health: {
      type: String,
      enum: ["healthy", "warning", "unknown", "unhealthy"],
      default: "unknown",
    },
    url: { type: String, default: null },
    lastDeployment: { type: Date, default: null },
    awsRegion: { type: String, default: "ap-south-1" },
    awsConnectionId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
