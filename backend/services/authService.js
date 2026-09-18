import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { newId } from "../utils/ids.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "deploymate-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export const AUTH_COOKIE = "dm_token";
export const OAUTH_STATE_COOKIE = "dm_oauth_state";

const github = {
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  callbackUrl: process.env.GITHUB_CALLBACK_URL ?? "http://localhost:4000/api/auth/callback",
};

export function githubConfigured() {
  return Boolean(github.clientId && github.clientSecret);
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Cookies are only marked Secure when explicitly enabled (COOKIE_SECURE=true).
// This app currently runs over plain HTTP, so a Secure flag derived from
// NODE_ENV would silently break auth cookies on http://localhost.
const cookieBase = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase);
}

export function setOAuthStateCookie(res, state) {
  res.cookie(OAUTH_STATE_COOKIE, state, { ...cookieBase, maxAge: 10 * 60 * 1000 });
}

export function clearOAuthStateCookie(res) {
  res.clearCookie(OAUTH_STATE_COOKIE, cookieBase);
}

// ─── GitHub OAuth (manual code exchange — no session store needed) ────────────

export function buildGithubAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: github.clientId,
    redirect_uri: github.callbackUrl,
    scope: "read:user user:email repo",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(code) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: github.clientId,
      client_secret: github.clientSecret,
      code,
      redirect_uri: github.callbackUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? "GitHub code exchange failed");
  }
  return data.access_token;
}

export async function fetchGithubUser(accessToken) {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub user request failed: ${response.status}`);
  }
  const profile = await response.json();

  if (!profile.email) {
    try {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primary = emails.find((entry) => entry.primary) ?? emails[0];
        profile.email = primary?.email ?? "";
      }
    } catch {
      profile.email = "";
    }
  }
  return profile;
}

export async function upsertGithubUser(profile, accessToken) {
  const githubId = String(profile.id);
  const update = {
    username: profile.login ?? "unknown",
    displayName: profile.name ?? profile.login ?? "Unknown",
    avatar: profile.avatar_url ?? "",
    email: profile.email ?? "",
    accessToken,
  };

  return User.findOneAndUpdate(
    { githubId },
    { $set: update, $setOnInsert: { githubId } },
    { upsert: true, new: true }
  );
}

export async function ensureDemoUser() {
  const githubId = "demo-user";
  return User.findOneAndUpdate(
    { githubId },
    {
      $set: {
        username: "demo",
        displayName: "Demo Developer",
        avatar: "",
        email: "demo@deploymate.local",
        accessToken: "",
      },
      $setOnInsert: { githubId },
    },
    { upsert: true, new: true }
  );
}

// ─── Serialization ────────────────────────────────────────────────────────────

/** Public user shape — never exposes the GitHub access token. */
export function publicUser(user) {
  return {
    id: user._id.toString(),
    githubId: user.githubId,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    email: user.email,
  };
}
