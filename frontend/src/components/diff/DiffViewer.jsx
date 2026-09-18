import { useState } from "react";
import { Check, ChevronDown, ChevronRight, FileCode2, Loader2, Search, X } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Renders a proposed file change as a unified diff-style review. Accept commits
 * the change to the repository; reject drops it. Nothing is applied unless the
 * user explicitly accepts.
 */
export function DiffViewer({ file, diff, replacement, explanation, decision, committing, committed, error, onAccept, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const lines = Array.isArray(diff) ? diff : String(diff ?? "").split("\n");
  const showDiff = lines.some((line) => line && !line.startsWith("\u0000"));

  return (
    <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          )}
          <FileCode2 className="h-4 w-4 shrink-0 text-studio-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-studio-text">{file}</span>
        </button>
        <Button size="xs" variant="ghost" onClick={() => setExpanded((value) => !value)}>
          <Search className="h-3 w-3" aria-hidden="true" />
          {expanded ? "Hide" : "View"}
        </Button>
      </div>

      {expanded ? (
        <div className="border-t border-studio-line">
          {explanation ? (
            <p className="border-b border-studio-line bg-studio-inset px-3 py-2 text-xs leading-5 text-studio-muted">
              {explanation}
            </p>
          ) : null}
          <div className="studio-scrollbar max-h-72 overflow-auto bg-studio-inset">
            <pre className="log-mono p-3 text-[11.5px] leading-[1.7] text-studio-muted">
              {showDiff && lines.length ? (
                lines.map((line, index) => {
                  const added = line.startsWith("+");
                  const removed = line.startsWith("-");
                  const className = added
                    ? "text-emerald-300/90 bg-emerald-400/[0.07]"
                    : removed
                      ? "text-rose-300/80 bg-rose-400/[0.06]"
                      : "text-studio-faint";
                  return (
                    <div key={index} className={`-mx-3 -my-0 px-3 ${className}`}>
                      {line || " "}
                    </div>
                  );
                })
              ) : replacement ? (
                <code>{replacement}</code>
              ) : (
                <span className="text-studio-faint">No preview available.</span>
              )}
            </pre>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-studio-line px-3 py-2">
        {committed ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-300">
            <Check className="h-3 w-3" aria-hidden="true" />
            Committed{" "}
            {committed.sha ? (
              <code className="font-mono text-[10px] text-emerald-300/80">{committed.sha.slice(0, 7)}</code>
            ) : null}
          </span>
        ) : decision === "rejected" ? (
          <span className="flex items-center gap-1.5 text-xs text-studio-faint">
            <X className="h-3 w-3" aria-hidden="true" />
            Rejected
          </span>
        ) : decision === "accepted" ? (
          <span className="flex items-center gap-1.5 text-xs text-amber-300">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {committing ? "Committing to branch…" : "Accepted"}
          </span>
        ) : error ? (
          <span className="min-w-0 flex-1 truncate text-xs text-rose-300" title={error}>
            {error}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {!committed && !committing && decision !== "rejected" ? (
            <>
              <Button size="xs" variant="danger" disabled={committing} onClick={onReject}>
                <X className="h-3 w-3" aria-hidden="true" />
                Reject
              </Button>
              <Button size="xs" variant="primary" disabled={committing || !onAccept} onClick={onAccept}>
                <Check className="h-3 w-3" aria-hidden="true" />
                {committing ? "Committing…" : "Apply commit"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}