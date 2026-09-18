import { Check, Circle, Loader2, Plus, X, Pencil, TriangleAlert } from "lucide-react";
import { statusLabel, statusTone } from "../../lib/status";
import { Badge } from "./Badge";

const STAGE_ICONS = {
  success: Check,
  warning: TriangleAlert,
  danger: X,
  analyzing: Loader2,
  running: Loader2,
  deploying: Loader2,
  generating: Loader2,
  connecting: Loader2,
};

export function StatusBadge({ status, children, className = "" }) {
  const tone = statusTone(status);
  const Icon = STAGE_ICONS[tone];
  return (
    <Badge tone={tone} className={className}>
      {Icon ? (
        <Icon
          className={`h-3 w-3 ${tone === "running" || tone === "analyzing" || tone === "deploying" || tone === "generating" || tone === "connecting" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      ) : null}
      {children ?? statusLabel(status)}
    </Badge>
  );
}

export function DecisionBadge({ decision }) {
  const map = {
    create: { label: "CREATE", tone: "info", icon: Plus },
    reuse: { label: "REUSE", tone: "success", icon: Circle },
    modify: { label: "MODIFY", tone: "warning", icon: Pencil },
  };
  const entry = map[decision] ?? { label: decision, tone: "muted", icon: Circle };
  const Icon = entry.icon;
  return (
    <Badge tone={entry.tone}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {entry.label}
    </Badge>
  );
}