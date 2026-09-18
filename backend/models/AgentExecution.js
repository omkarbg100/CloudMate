import mongoose from "mongoose";

const agentExecutionSchema = new mongoose.Schema(
  {
    executionId: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    agentName: {
      type: String,
      enum: [
        "orchestrator",
        "repository",
        "architecture",
        "security",
        "code",
        "validation",
        "deployment",
        "monitoring",
      ],
      required: true,
    },
    trigger: { type: String, default: "user" }, // user | system | workflow
    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
    durationMs: { type: Number, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AgentExecution", agentExecutionSchema);
