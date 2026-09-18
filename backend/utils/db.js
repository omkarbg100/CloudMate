import mongoose from "mongoose";

mongoose.set("bufferCommands", false);

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/deploymate";

const CONNECT_OPTS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
};

let connecting = false;
let attempt = 0;
const MAX_RETRY_BACKOFF_MS = 60000;

function redact(uri) {
  try {
    const url = new URL(uri);
    return `${url.protocol}//****:****@${url.host}${url.pathname}${url.search}`;
  } catch {
    return uri.replace(/:\/\/[^@/]+@/, "://****:****@");
  }
}

/**
 * Connect to MongoDB with simple retry. The API stays up even if the database
 * is not reachable yet (only database-backed routes will fail).
 */
export async function connectDB() {
  if (connecting) return;
  connecting = true;
  try {
    await mongoose.connect(MONGODB_URI, CONNECT_OPTS);
    attempt = 0;
    console.log(
      `[backend] MongoDB connected: ${redact(MONGODB_URI)} (host ${mongoose.connection.host})`
    );
  } catch (error) {
    console.error(
      `[backend] MongoDB connection failed (attempt ${attempt + 1}): ${error.message}`
    );
    scheduleRetry();
  } finally {
    connecting = false;
  }
}

function scheduleRetry() {
  const delay = Math.min(5000 * 2 ** attempt, MAX_RETRY_BACKOFF_MS);
  attempt += 1;
  setTimeout(connectDB, delay);
}

mongoose.connection.on("disconnected", () => {
  console.warn("[backend] MongoDB disconnected. Retrying...");
  scheduleRetry();
});

mongoose.connection.on("error", (err) => {
  console.error("[backend] MongoDB error:", err.message);
});