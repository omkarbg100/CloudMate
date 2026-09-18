import { Badge } from "./Badge";

const ENV_TONES = {
  development: "info",
  staging: "warning",
  production: "accent",
};

export function EnvironmentBadge({ env = "production" }) {
  const key = String(env).toLowerCase();
  return (
    <Badge tone={ENV_TONES[key] ?? "muted"} dot>
      {key}
    </Badge>
  );
}