import { useQuery } from "@tanstack/react-query";
import { RefreshCw, SquareTerminal } from "lucide-react";
import { LogViewer } from "../components/logs/LogViewer";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { EmptyState } from "../components/ui/EmptyState";
import { getMetricsLogs } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function LogsView({ projectId, project, events }) {
  const clearEvents = useDeployMateStore((state) => state.clearEvents);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const activeTab = useDeployMateStore((state) => state.activeLogTab ?? "live");
  const setActiveLogTab = useDeployMateStore((state) => state.setActiveLogTab);

  const runtimeLogs = useQuery({
    queryKey: ["metrics-logs", projectId],
    queryFn: () => getMetricsLogs(projectId),
    enabled: Boolean(projectId) && project?.status === "deployed",
    refetchInterval: 15000,
  });

  const runtimeList = (runtimeLogs.data?.logs ?? []).map((log) => ({
    ...log,
    timestamp: log.timestamp ?? Date.now(),
    type: String(log.level ?? log.type ?? "info").toUpperCase(),
  }));

  const liveEvents = (events ?? []).map((event) => ({ ...event, timestamp: event.timestamp ?? Date.now() }));

  if (!projectId) {
    return (
      <EmptyState
        title="No project selected"
        description="Select a project to stream workflow and runtime logs."
        actionLabel="Open projects"
        onAction={() => setActiveView("projects")}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-studio-line bg-studio-panel px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-studio-text">
              <SquareTerminal className="h-4 w-4 text-studio-accent" aria-hidden="true" />
              Logs
            </h2>
            <p className="mt-0.5 text-xs text-studio-muted">
              {projectId ? `${project?.repoOwner}/${project?.repoName} · ${project?.branch}` : ""} — streamed in real time.
            </p>
          </div>
          <Tabs
            active={activeTab}
            onChange={setActiveLogTab}
            tabs={[
              { id: "live", label: "Workflow" },
              { id: "runtime", label: "Runtime" },
            ]}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5 pt-4">
        {activeTab === "runtime" ? (
          <div className="h-full">
            {runtimeLogs.isPending ? (
              <p className="flex items-center gap-2 py-10 text-center text-xs text-studio-faint">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading runtime logs…
              </p>
            ) : (
              <LogViewer events={runtimeList} />
            )}
          </div>
        ) : (
          <LogViewer events={liveEvents} onClear={clearEvents} />
        )}
      </div>
    </div>
  );
}