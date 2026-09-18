import { Activity, Cloud, GitBranch, ShieldCheck } from "lucide-react";

export function StatusRail({ project }) {
  const status = project?.status ?? "connected";
  const health = project?.health ?? "unknown";

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex h-8 items-center gap-2 border border-gray-700 bg-gray-800 px-3">
        <GitBranch className="h-4 w-4 text-teal-400" aria-hidden="true" />
        <span>{project?.branch ?? "main"}</span>
      </div>
      <div className="flex h-8 items-center gap-2 border border-gray-700 bg-gray-800 px-3">
        <ShieldCheck className="h-4 w-4 text-amber-400" aria-hidden="true" />
        <span>{status.replaceAll("_", " ")}</span>
      </div>
      <div className="flex h-8 items-center gap-2 border border-gray-700 bg-gray-800 px-3">
        <Activity className="h-4 w-4 text-teal-400" aria-hidden="true" />
        <span>{health}</span>
      </div>
      <div className="flex h-8 items-center gap-2 border border-gray-700 bg-gray-800 px-3">
        <Cloud className="h-4 w-4 text-gray-300" aria-hidden="true" />
        <span>{project?.url ? "live" : "not deployed"}</span>
      </div>
    </div>
  );
}
