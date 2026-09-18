import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Sparkles, Terminal } from "lucide-react";
import { Dot } from "../ui/Badge";

const AGENT_FROM_EVENT = [
  { type: "ANALYSIS", agent: "Repository Analyzer", summary: "Scans dependencies, frameworks, ports and deployment requirements." },
  { type: "ARCHITECTURE", agent: "Architecture Agent", summary: "Designs the AWS resource plan from the repository shape." },
  { type: "SECURITY", agent: "Security Agent", summary: "Checks for exposed secrets, unsafe config and container risks." },
  { type: "CODE", agent: "Code Agent", summary: "Proposes reviewer-ready changes to productionize the codebase." },
  { type: "VALIDATION", agent: "Validation Agent", summary: "Runs dependency, lint, build and container readiness checks." },
  { type: "DEPLOYMENT", agent: "Deployment Agent", summary: "Builds and verifies the approved deployment plan." },
  { type: "MONITORING", agent: "Ops Monitor", summary: "Watches health, metrics and alerts in production." },
];

function agentForEvent(event) {
  const matched = AGENT_FROM_EVENT.find((entry) => event.type.includes(entry.type));
  if (matched) return { name: matched.agent, summary: matched.summary };
  if (event.type.startsWith("CONNECTED")) return { name: "Event stream", summary: "Live WebSocket stream connected." };
  return { name: event.type.replaceAll("_", " ").toLowerCase(), summary: event.message ?? "" };
}

export function AIActivity({ events, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!events?.length) return null;

  const activeCount = events.filter((e) => ["_STARTED", "_RUNNING", "DEPLOYMENT_PROGRESS"].some((s) => e.type.endsWith(s))).length;

  return (
    <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Sparkles className="h-3.5 w-3.5 text-studio-accent" aria-hidden="true" />
        <span className="text-xs font-medium text-studio-text">AI Activity</span>
        {activeCount > 0 ? (
          <span className="flex items-center gap-1 text-[11px] text-studio-muted">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {activeCount} active agent(s)
          </span>
        ) : null}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-studio-faint transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="border-t border-studio-line">
          <div className="studio-scrollbar max-h-56 overflow-auto p-1.5">
            {events.slice(-20).map((event, index) => {
              const { name } = agentForEvent(event);
              const done = ["COMPLETED", "SUCCESS", "FAILED"].some((s) => event.type.includes(s));
              const failed = event.type.includes("FAILED");
              const running = ["STARTED", "PROGRESS", "GENERATION"].some((s) => event.type.includes(s)) && !done;
              return (
                <div key={`${event.timestamp}-${index}`} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-studio-panel2">
                  <span className="mt-0.5">
                    {failed ? (
                      <Dot tone="danger" className="h-2 w-2" />
                    ) : done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-studio-success" aria-hidden="true" />
                    ) : running ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-studio-accent" aria-hidden="true" />
                    ) : (
                      <Terminal className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs text-studio-text">
                      <span className="capitalize">{name}</span>
                      <span className="text-[10px] uppercase text-studio-faint">
                        {done ? (failed ? "failed" : "done") : running ? "running" : event.type.toLowerCase()}
                      </span>
                    </p>
                    {event.message ? (
                      <p className="truncate text-[11px] text-studio-muted">{event.message}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}