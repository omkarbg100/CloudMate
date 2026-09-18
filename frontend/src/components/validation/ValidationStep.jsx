import { Check, ChevronDown, Circle, Loader2, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { toneClasses } from "../../lib/status";

const STATUS_ICON = {
  passed: Check,
  failed: X,
  warning: TriangleAlert,
  running: Loader2,
  pending: Circle,
};

export function ValidationStep({ name, status = "pending", message, children }) {
  const [open, setOpen] = useState(false);
  const t = toneClasses(status);
  const Icon = STATUS_ICON[status] ?? Circle;
  const spinning = status === "running";

  return (
    <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-studio-panel2/50">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${t.border} ${t.bg}`}>
          <Icon className={`h-3 w-3 ${t.text} ${spinning ? "animate-spin" : ""}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-studio-text">{name}</span>
        {message && status !== "running" ? (
          <span className="hidden max-w-[40%] truncate text-[11px] text-studio-faint sm:block">{message}</span>
        ) : null}
        {children ? (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-studio-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        ) : null}
      </button>
      {children && open ? (
        <div className="border-t border-studio-line bg-studio-inset px-4 py-3 text-xs leading-6 text-studio-muted">{children}</div>
      ) : null}
    </div>
  );
}

export function ValidationPipeline({ checks = [], overallStatus, summary }) {
  const t = toneClasses(overallStatus ?? "pending");
  return (
    <div className="space-y-2">
      {summary ? (
        <div className={`mb-3 rounded-lg border px-3 py-2.5 text-[13px] ${t.border} ${t.bg}`}>
          <span className={`flex items-center gap-2 font-medium ${t.text}`}>
            {overallStatus === "passed" ? <Check className="h-4 w-4" /> : overallStatus === "failed" ? <X className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
            {summary}
          </span>
        </div>
      ) : null}
      {checks.map((check, index) => (
        <ValidationStep key={`${check.name}-${index}`} {...check} />
      ))}
    </div>
  );
}