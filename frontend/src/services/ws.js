import { useDeployMateStore } from "../store/useDeployMateStore";

let socket = null;
let reconnectTimer = null;
let activeProjectId = null;

function deriveWsBase() {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, "");
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Connect to a project's real-time event stream. Reconnects automatically.
 * Returns a cleanup function.
 */
export function connectProjectSocket(projectId) {
  if (!projectId) return () => {};
  if (activeProjectId === projectId && socket && socket.readyState <= 1) {
    return () => {};
  }

  disconnectProjectSocket();
  activeProjectId = projectId;

  const { pushEvent, setDeploymentProgress } = useDeployMateStore.getState();
  socket = new WebSocket(`${deriveWsBase()}/projects/${projectId}`);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      pushEvent(data);
      if (typeof data.progress === "number") {
        setDeploymentProgress(data.progress);
      }
    } catch {
      // ignore malformed frames
    }
  };

  socket.onclose = () => {
    socket = null;
    if (activeProjectId === projectId) {
      reconnectTimer = setTimeout(() => connectProjectSocket(projectId), 3000);
    }
  };

  socket.onerror = () => {
    socket?.close();
  };

  return () => disconnectProjectSocket();
}

export function disconnectProjectSocket() {
  activeProjectId = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
}
