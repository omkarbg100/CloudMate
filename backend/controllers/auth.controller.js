import {
  OAUTH_STATE_COOKIE,
  buildGithubAuthUrl,
  clearAuthCookie,
  clearOAuthStateCookie,
  ensureDemoUser,
  exchangeGithubCode,
  fetchGithubUser,
  githubConfigured,
  publicUser,
  setAuthCookie,
  setOAuthStateCookie,
  signToken,
  upsertGithubUser,
} from "../services/authService.js";
import { newId } from "../utils/ids.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

/** GET /api/auth/github — redirect to GitHub's OAuth consent screen. */
export function githubLogin(_req, res) {
  if (!githubConfigured()) {
    return res.status(503).json({ error: "GitHub OAuth is not configured" });
  }
  const state = newId("oauth");
  setOAuthStateCookie(res, state);
  res.redirect(buildGithubAuthUrl(state));
}

/** GET /api/auth/callback — exchange the code, upsert the user, issue a JWT. */
export async function githubCallback(req, res) {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  clearOAuthStateCookie(res);

  if (!code || !state || state !== expectedState) {
    return res.redirect(`${FRONTEND_ORIGIN}/?error=auth_failed`);
  }

  try {
    const accessToken = await exchangeGithubCode(code);
    const profile = await fetchGithubUser(accessToken);
    const user = await upsertGithubUser(profile, accessToken);
    setAuthCookie(res, signToken(user._id.toString()));
    res.redirect(FRONTEND_ORIGIN);
  } catch (error) {
    console.error("[auth] GitHub callback failed:", error.message);
    res.redirect(`${FRONTEND_ORIGIN}/?error=auth_failed`);
  }
}

/** POST /api/auth/demo — development login without GitHub credentials. */
export async function demoLogin(_req, res, next) {
  if ((process.env.DEV_DEMO_MODE ?? "true") !== "true") {
    return res.status(403).json({ error: "Demo login is disabled" });
  }
  try {
    const user = await ensureDemoUser();
    setAuthCookie(res, signToken(user._id.toString()));
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}

/** GET /api/auth/me — current user from the JWT. */
export function me(req, res) {
  res.json(publicUser(req.user));
}

/** POST /api/auth/logout — clear the auth cookie. */
export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully" });
}
