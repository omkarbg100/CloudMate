/**
 * Shared status vocabulary for the whole application.
 * Maps every state the UI can show to a visual "tone" so behaviour is
 * consistent across the sidebar, badges, timelines and empty states.
 */

export const TONES = {
  success: {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400",
    solid: "bg-emerald-500",
  },
  info: {
    text: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    dot: "bg-sky-400",
    solid: "bg-sky-500",
  },
  accent: {
    text: "text-studio-accentHi",
    bg: "bg-studio-accent/10",
    border: "border-studio-accent/30",
    dot: "bg-studio-accent",
    solid: "bg-studio-accent",
  },
  warning: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
    solid: "bg-amber-500",
  },
  danger: {
    text: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/30",
    dot: "bg-rose-400",
    solid: "bg-rose-500",
  },
  muted: {
    text: "text-studio-muted",
    bg: "bg-studio-muted/10",
    border: "border-studio-line2",
    dot: "bg-studio-faint",
    solid: "bg-studio-faint",
  },
};

const STATUS_TONE = {
  idle: "muted",
  connected: "success",
  connecting: "info",
  queued: "info",
  analyzing: "info",
  running: "info",
  generating: "info",
  success: "success",
  passed: "success",
  ready: "success",
  healthy: "success",
  deployed: "success",
  warning: "warning",
  reviewing: "accent",
  awaiting_approval: "warning",
  deploying: "info",
  failure: "danger",
  failed: "danger",
  blocked: "danger",
  error: "danger",
  unhealthy: "danger",
  unknown: "muted",
  pending: "muted",
  not_started: "muted",
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "muted",
};

export function statusTone(status) {
  const key = String(status ?? "").toLowerCase();
  return STATUS_TONE[key] ?? "muted";
}

export function toneClasses(status) {
  return TONES[statusTone(status)];
}

/** Human-readable label for a machine status value. */
export function statusLabel(status) {
  const labels = {
    connected: "Connected",
    connecting: "Connecting",
    queued: "Queued",
    analyzing: "Analyzing",
    running: "Running",
    generating: "Generating",
    success: "Success",
    passed: "Passed",
    ready: "Ready",
    healthy: "Healthy",
    deployed: "Deployed",
    warning: "Attention",
    reviewing: "Reviewing",
    awaiting_approval: "Awaiting approval",
    deploying: "Deploying",
    failed: "Failed",
    blocking: "Blocked",
    error: "Error",
    unhealthy: "Unhealthy",
    unknown: "Unknown",
    pending: "Pending",
    not_started: "Not started",
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    "setup incomplete": "Setup incomplete",
    "next step available": "Next step available",
    "action required": "Action required",
    "ready to deploy": "Ready to deploy",
    "awaiting approval": "Awaiting approval",
    "deployment failed": "Deployment failed",
  };
  return labels[String(status ?? "").toLowerCase()] ?? String(status ?? "");
}