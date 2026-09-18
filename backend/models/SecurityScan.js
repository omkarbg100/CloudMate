import mongoose from "mongoose";

const findingSchema = new mongoose.Schema({
  id: String,
  severity: { type: String, enum: ["critical", "high", "medium", "low"] },
  file: String,
  type: String,
  description: String,
  recommendation: String,
});

const securityScanSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, index: true },
    findings: [findingSchema],
    scanStatus: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    summary: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("SecurityScan", securityScanSchema);
