import { WebSocketServer, WebSocket } from "ws";

/** Map of projectId → Set of connected WebSocket clients */
const projectClients = new Map();

/**
 * Broadcast a JSON message to all WebSocket clients subscribed to a project.
 * @param {string} projectId
 * @param {object} message
 */
export function broadcastToProject(projectId, message) {
  const clients = projectClients.get(projectId);
  if (!clients) return;

  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Attach WebSocket server to an existing HTTP server.
 * Handles /ws/projects/:projectId connections.
 * @param {import("node:http").Server} server
 */
export function attachProjectWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "", `http://${host}`);

    if (!url.pathname.startsWith("/ws/projects/")) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws, request) => {
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "", `http://${host}`);
    const projectId = url.pathname.split("/").at(-1) ?? "unknown";

    // Register client
    if (!projectClients.has(projectId)) {
      projectClients.set(projectId, new Set());
    }
    projectClients.get(projectId).add(ws);

    // Send welcome
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        projectId,
        message: "DeployMate project event stream connected.",
        timestamp: new Date().toISOString(),
      })
    );

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30_000);

    ws.on("close", () => {
      clearInterval(heartbeat);
      const clients = projectClients.get(projectId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) projectClients.delete(projectId);
      }
    });

    ws.on("error", (err) => {
      console.error(`[WebSocket] Error for project ${projectId}:`, err.message);
    });

    // Handle incoming client messages (e.g., ping, subscribe)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore non-JSON messages
      }
    });
  });

  console.log("\x1b[32m✓\x1b[0m WebSocket server attached at /ws/projects/:projectId");
}