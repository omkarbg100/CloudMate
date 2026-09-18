import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    displayName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    email: { type: String, default: "" },
    accessToken: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
