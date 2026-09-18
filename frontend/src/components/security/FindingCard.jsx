import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "../ui/StatusBadge";

export function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const severity = String(finding.severity ?? "medium").toLowerCase();
  return (
    <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-studio-panel2/50">
        <StatusBadge status={severity} compact />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-studio-text">{finding.type}</p>
          <p className="truncate font-mono text-[11px] text-studio-faint">{finding.file}</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-studio-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="border-t border-studio-line bg-studio-inset px-3.5 py-3">
          {finding.description ? (
            <p className="text-xs leading-6 text-studio-muted">{finding.description}</p>
          ) : null}
          {finding.recommendation ? (
            <div className="mt-2 rounded-md border border-studio-line bg-studio-panel px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-studio-faint">Recommendation</p>
              <p className="mt-1 text-xs leading-6 text-studio-muted">{finding.recommendation}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}