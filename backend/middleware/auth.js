import User from "../models/User.js";
import { AUTH_COOKIE, verifyToken } from "../services/authService.js";

function extractToken(req) {
  const header = req.headers.authorization ?? "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return req.cookies?.[AUTH_COOKIE] ?? null;
}

/**
 * Require a valid JWT (cookie or Authorization: Bearer header).
 * Attaches the Mongoose user document to `req.user`.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
