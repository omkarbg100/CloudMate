import { TONES } from "../../lib/status";

export function Badge({ tone = "muted", children, dot = false, className = "" }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${t.bg} ${t.border} ${t.text} ${className}`}
    >
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}

export function Dot({ tone = "muted", className = "" }) {
  const t = TONES[tone];
  return <span className={`inline-block h-2 w-2 rounded-full ${t.dot} ${className}`} aria-hidden="true" />;
}

export function ConnectionDot({ connected, className = "" }) {
  return (
    <Dot
      tone={connected === false ? "danger" : connected === true ? "success" : "muted"}
      className={className}
    />
  );
}