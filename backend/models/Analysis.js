import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    languages: [{ type: String }],
    frontend: {
      framework: String,
      buildCommand: String,
      outputDir: String,
    },
    backend: {
      framework: String,
      runtime: String,
      port: Number,
      startCommand: String,
    },
    database: { type: String, default: null },
    docker: { type: Boolean, default: false },
    packageManager: { type: String, default: "npm" },
    ports: [{ type: Number }],
    environmentVariables: [{ type: String }],
    tests: [{ type: String }],
    rawFiles: { type: Map, of: String, default: {} },
    agentNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Analysis", analysisSchema);
