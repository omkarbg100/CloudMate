import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, ArrowRight, Bot, Gauge, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { MetricCard } from "../components/ui/MetricCard";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { getHealth, getMetrics, getMetricsLogs, getAlerts } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function MonitoringView({ projectId, project }) {
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const deployed = project?.status === "deployed";

  const health = useQuery({
    queryKey: ["health", projectId],
    queryFn: () => getHealth(projectId),
    enabled: Boolean(projectId) && deployed,
    refetchInterval: 15000,
  });
  const metrics = useQuery({
    queryKey: ["metrics", projectId],
    queryFn: () => getMetrics(projectId),
    enabled: Boolean(projectId) && deployed,
    refetchInterval: 15000,
  });
  const logs = useQuery({
    queryKey: ["metrics-logs", projectId],
    queryFn: () => getMetricsLogs(projectId),
    enabled: Boolean(projectId) && deployed,
    refetchInterval: 20000,
  });
  const alerts = useQuery({
    queryKey: ["alerts", projectId],
    queryFn: () => getAlerts(projectId),
    enabled: Boolean(projectId) && deployed,
  });

  const reread = useMutation({
    mutationFn: async () => {
      await Promise.all([health.refetch(), metrics.refetch(), logs.refetch(), alerts.refetch()]);
    },
  });

  if (!projectId || !deployed) {
    return (
      <EmptyState
        title="Monitoring requires a live deployment"
        description="Once this project is deployed, health, metrics, logs and alerts will stream here."
        actionLabel="Open deployment"
        onAction={() => setActiveView("deployment")}
      />
    );
  }

  const m = metrics.data ?? {};
  const activeAlerts = (alerts.data?.alerts ?? []).filter((a) => a.status !== "resolved");
  const healthy = health.data?.status === "healthy";

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Monitoring" subtitle={`Live health, metrics and logs for ${project.name}.`} />
          <Button variant="secondary" size="sm" disabled={reread.isPending} isLoading={reread.isPending} loadingLabel="Refreshing…" onClick={() => reread.mutate()}>
            {reread.isPending ? null : (
              <>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {!healthy ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-rose-400/30 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">
            <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
            Instance is {health.data?.status ?? "unknown"}. {health.data?.message ?? ""}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard label="Health" value={health.data?.status ?? "—"} tone={healthy ? "success" : "danger"} />
          <MetricCard label="Requests" value={m.requestCount ?? "—"} hint="per sample" />
          <MetricCard label="Error rate" value={m.errorRate != null ? `${m.errorRate}%` : "—"} tone={Number(m.errorRate ?? 0) > 1 ? "danger" : "success"} />
          <MetricCard label="p99 latency" value={m.p99Latency != null ? `${m.p99Latency}ms` : "—"} />
        </div>

        <div className="mt-4 space-y-4">
          <AIOpsAssistant
            metrics={m}
            healthy={healthy}
            activeAlerts={activeAlerts}
            onViewLogs={() => setActiveView("logs")}
            onViewDeployment={() => setActiveView("deployment")}
          />

          {activeAlerts.length > 0 ? (
            <Panel title={`Active alerts · ${activeAlerts.length}`}>
              <div className="divide-y divide-studio-line">
                {activeAlerts.map((alert, index) => (
                  <div key={`${alert.id ?? alert.timestamp}-${index}`} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-studio-text">{alert.metric ?? alert.title ?? "Metric alert"}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-studio-muted">{alert.message ?? alert.description}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-studio-faint">{new Date(alert.timestamp ?? Date.now()).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel title="Recent log lines">
            <div className="studio-scrollbar max-h-72 overflow-auto p-3">
              {(logs.data?.logs ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-studio-faint">No runtime logs captured yet.</p>
              ) : (
                <ul className="log-mono space-y-1 text-[11px]">
                  {logs.data.logs.slice(-60).reverse().map((log, index) => (
                    <li key={`${log.timestamp}-${index}`} className="flex gap-2">
                      <span className="shrink-0 text-studio-faint">{new Date(log.timestamp ?? Date.now()).toLocaleTimeString()}</span>
                      <span className="shrink-0 font-semibold text-studio-muted">{String(log.level ?? log.type ?? "info").toUpperCase()}</span>
                      <span className="min-w-0 text-studio-muted">{log.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MetricCard label="CPU" value={m.cpuUtilization != null ? `${m.cpuUtilization}%` : "—"} icon={Gauge} />
            <MetricCard label="Memory" value={m.memoryUtilization != null ? `${m.memoryUtilization}%` : "—"} icon={Gauge} />
            <MetricCard label="Error rate" value={m.errorRate != null ? `${m.errorRate}%` : "—"} icon={Activity} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AIOpsAssistant({ metrics, healthy, activeAlerts, onViewLogs, onViewDeployment }) {
  const busy = Number(metrics.cpuUtilization ?? 0) > 75 || Number(metrics.errorRate ?? 0) > 5;
  const text = busy
    ? `I'm watching unusual activity: load is high. Nothing has broken, but you may want to scale or inspect the error logs.`
    : `Everything looks nominal — ${healthy ? "health is green" : "health is degraded"}. I'll page you only when a real signal appears.`;
  return (
    <div className="overflow-hidden rounded-lg border border-studio-line2 bg-studio-panel">
      <div className="flex items-center gap-2 border-b border-studio-line px-4 py-2.5">
        <Bot className="h-4 w-4 text-studio-accent" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-studio-text">AI Operations Assistant</span>
        <span className="ml-auto text-[11px] text-studio-faint">{activeAlerts.length} active alert(s), 0 unresolved incidents</span>
      </div>
      <div className="p-4">
        <p className="text-[13px] leading-6 text-studio-muted">{text}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="xs" onClick={onViewLogs}>
            Inspect logs
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="xs" onClick={onViewDeployment}>
            Deployment history
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}