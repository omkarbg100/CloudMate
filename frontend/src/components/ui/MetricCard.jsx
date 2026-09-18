export function MetricCard({ label, value, hint, icon: Icon, tone = "default", className = "" }) {
  const valueClass =
    tone === "success"
      ? "text-studio-success"
      : tone === "warning"
        ? "text-studio-warning"
        : tone === "danger"
          ? "text-studio-danger"
          : "text-studio-text";

  return (
    <div className={`rounded-lg border border-studio-line bg-studio-panel px-3.5 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-studio-faint">{label}</p>
        {Icon ? <Icon className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" /> : null}
      </div>
      <p className={`mt-1 truncate text-xl font-semibold ${valueClass}`}>{value ?? "—"}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-studio-faint">{hint}</p> : null}
    </div>
  );
}