import mongoose from "mongoose";

const awsConnectionSchema = new mongoose.Schema(
  {
    connectionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    roleArn: { type: String, required: true },
    externalId: { type: String, required: true },
    region: { type: String, required: true, default: "ap-south-1" },
    accountId: { type: String, default: null },
    status: { type: String, enum: ["pending", "connected", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("AwsConnection", awsConnectionSchema);
