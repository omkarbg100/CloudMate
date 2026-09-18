/**
 * Central error handler. Returns a JSON error and never leaks stack traces.
 * Every error is printed to the console so failures are always visible.
 */
export function errorHandler(error, _req, res, _next) {
  const status = error.status ?? error.statusCode ?? 400;
  const message = error instanceof Error ? error.message : "Unknown error";
  const label = status >= 500 ? "ERROR" : "HANDLED";
  if (status >= 500) {
    console.error(`[backend] ${label} (${status}):`, error);
  } else {
    console.error(`[backend] ${label} (${status}): ${message}`);
  }
  res.status(status).json({ error: message });
}
