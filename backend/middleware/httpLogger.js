/**
 * Request logger. Prints every API call to the console with method, path,
 * status, duration and (when authenticated) the caller id. Bodies are never
 * logged so secrets stay out of the console.
 */
export function httpLogger(req, res, next) {
  const startedAt = Date.now();
  let logged = false;

  const log = () => {
    if (logged) return;
    logged = true;
    const duration = Date.now() - startedAt;
    const user = req.user?.githubUsername ?? req.user?.username ?? req.user?._id ?? "";
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "OK";
    console.log(
      `[backend] ${level} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)` +
        (res.statusCode >= 400 ? " ERROR" : "") +
        (user ? ` user=${user}` : "")
    );
  };

  res.on("finish", log);
  res.on("close", log);
  next();
}