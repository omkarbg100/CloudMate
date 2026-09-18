/**
 * Central error handler. Returns a JSON error and never leaks stack traces.
 */
export function errorHandler(error, _req, res, _next) {
  const status = error.status ?? error.statusCode ?? 400;
  const message = error instanceof Error ? error.message : "Unknown error";
  if (status >= 500) {
    console.error("[backend] Unhandled error:", error);
  }
  res.status(status).json({ error: message });
}
