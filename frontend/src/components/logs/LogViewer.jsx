import { useMemo, useRef, useState } from "react";
import { Copy, Eraser, Pause, Play, Search } from "lucide-react";
import { Button } from "../ui/Button";

const SEVERITY_COLOR = {
  info: "text-studio-info",
  success: "text-studio-success",
  warning: "text-studio-warning",
  error: "text-studio-danger",
};

function severityOf(type = "") {
  const t = String(type).toUpperCase();
  if (t.includes("FAIL") || t.includes("ERROR")) return "error";
  if (t.includes("DONE") || t.includes("COMPLETED") || t.includes("SUCCESS")) return "success";
  if (t.includes("WARN") || t.includes("REVIEW") || t.includes("STARTED") || t.includes("PROGRESS")) return "warning";
  return "info";
}

export function LogViewer({ events = [], onClear }) {
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [onlySeverity, setOnlySeverity] = useState(null);
  const frozen = useRef([]);

  if (paused) frozen.current = events;

  const filtered = useMemo(() => {
    const source = paused ? frozen.current : events;
    const seen = new Set();
    return source.filter((event) => {
      const key = `${event.timestamp}-${event.type}-${event.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      const text = `${event.type} ${event.message} ${event.step ?? ""}`.toLowerCase();
      if (query && !text.includes(query.toLowerCase())) return false;
      if (onlySeverity && severityOf(event.type) !== onlySeverity) return false;
      return true;
    });
  }, [events, query, paused, onlySeverity]);

  function copyAll() {
    const text = filtered
      .map((e) => `${new Date(e.timestamp ?? Date.now()).toISOString()} [${e.type}] ${e.message ?? ""}`)
      .join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-studio-line bg-studio-inset">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-studio-line bg-studio-panel px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded border border-studio-line2 bg-studio-inset px-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter logs…"
            className="h-6 w-full bg-transparent text-xs text-studio-text outline-none placeholder:text-studio-faint"
          />
        </div>
        <div className="flex items-center gap-0.5">
          {["info", "success", "warning", "error"].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setOnlySeverity(onlySeverity === level ? null : level)}
              className={`h-6 rounded px-1.5 text-[10px] font-semibold uppercase transition-colors ${
                onlySeverity === level
                  ? "bg-studio-panel2 text-studio-text"
                  : "text-studio-faint hover:text-studio-text"
              }`}
            >
              {level.slice(0, 3)}
            </button>
          ))}
        </div>
        <Button size="xs" variant="ghost" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Resume" : "Pause"}>
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </Button>
        <Button size="xs" variant="ghost" onClick={copyAll} aria-label="Copy logs">
          <Copy className="h-3 w-3" />
        </Button>
        {onClear ? (
          <Button size="xs" variant="ghost" onClick={onClear} aria-label="Clear logs">
            <Eraser className="h-3 w-3" />
          </Button>
        ) : null}
      </div>

      <div className="studio-scrollbar log-mono min-h-0 flex-1 overflow-auto px-3 py-2 text-[11.5px]">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-studio-faint">
            {events.length === 0 ? "No events yet. Actions stream here in real time." : "No matching log lines."}
          </p>
        ) : (
          filtered.map((event, index) => {
            const severity = severityOf(event.type);
            return (
              <div key={`${event.timestamp}-${index}`} className="flex gap-2 py-[1px]">
                <span className="shrink-0 text-studio-faint">
                  {new Date(event.timestamp ?? Date.now()).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 font-semibold ${SEVERITY_COLOR[severity]}`}>[{event.type}]</span>
                <span className="min-w-0 flex-1 text-studio-muted">{event.message ?? ""}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}