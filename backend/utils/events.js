import { broadcastToProject } from "../websocket/projectSocket.js";

/**
 * Broadcast a real-time project event over WebSocket with a timestamp.
 * @param {string} projectId
 * @param {string} type event name, e.g. ANALYSIS_STARTED
 * @param {object} payload extra fields (step, progress, message, data, url...)
 */
export function emitEvent(projectId, type, payload = {}) {
  broadcastToProject(projectId, {
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

/** Standard progress event with step/progress/message. */
export function emitProgress(projectId, type, { step, progress, message, ...rest } = {}) {
  emitEvent(projectId, type, { step, progress, message, ...rest });
}
