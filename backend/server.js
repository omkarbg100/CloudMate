import "dotenv/config";
import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { connectDB } from "./utils/db.js";
import { attachProjectWebSocket } from "./websocket/projectSocket.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { httpLogger } from "./middleware/httpLogger.js";

const app = express();
const port = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// Database (retries in the background; the API still serves /health without it)
connectDB();

// Middleware
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(httpLogger);

// Routes
app.use("/api", apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

// HTTP + WebSocket server
const server = http.createServer(app);
attachProjectWebSocket(server);

server.listen(port, () => {
  console.log(`[backend] DeployMate backend listening on http://localhost:${port}`);
  console.log(`[backend] AI engine URL: ${process.env.AI_ENGINE_URL ?? "http://localhost:8000"}`);
});
