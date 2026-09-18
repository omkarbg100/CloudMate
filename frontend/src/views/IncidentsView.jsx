import { useQuery } from "@tanstack/react-query";
import { Ghost } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { getAlerts } from "../services/api";

const INCIDENT_TYPES = ["INCIDENT", "ALERT", "MONITORING_ALERT", "DEPLOYMENT_FAILED", "FAIL"];

function incidentKey(event) {
  return `${event.timestamp}-${event.type}-${event.message}`;
}

export default function IncidentsView({ projectId, events }) {
  const [status, setStatus] = useState(null);
  const alertsQuery = useQuery({
    queryKey: ["incidents-alerts", projectId],
    queryFn: () => getAlerts(projectId),
    enabled: Boolean(projectId),
  });

  const alertIncidents = (alertsQuery.data?.alerts ?? []).map((a) => ({
    key: `alert-${a.id ?? a.timestamp}`,
    type: "MONITORING_ALERT",
    message: a.message ?? a.description ?? `${a.metric ?? "metric"} alert`,
    timestamp: a.timestamp ?? Date.now(),
    rawStatus: a.status ?? "open",
  }));
  const eventIncidents = (events ?? [])
    .filter((e) => INCIDENT_TYPES.some((t) => String(e.type ?? "").toUpperCase().includes(t)))
    .map((e) => ({ key: incidentKey(e), type: e.type, message: e.message, timestamp: e.timestamp ?? Date.now(), rawStatus: "open" }));

  const all = [...alertIncidents, ...eventIncidents]
    .filter((incident, index, arr) => arr.findIndex((other) => other.key === incident.key) === index)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filtered = status ? all.filter((incident) => incident.status === status) : all;
  const counts = { open: all.filter((i) => i.status !== "resolved").length, resolved: all.filter((i) => i.status === "resolved").length };

  function resolve(key) {
    const incident = all.find((i) => i.key === key);
    if (incident) incident.status = "resolved";
    setStatus(null);
  }

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <PageHeader title="Incidents" subtitle="Anomalies and failed steps, triaged and tracked. Incidents are ephemeral in this preview build." />

        {all.length === 0 ? (
          <EmptyState
            icon={Ghost}
            title="No incidents"
            description="Nothing has misbehaved. When an alert or failed step appears, it lands here with context from the deployment engine."
          />
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2">
              {[
                { id: null, label: `Open · ${counts.open}` },
                { id: "resolved", label: `Resolved · ${counts.resolved}` },
              ].map((filter) => (
                <Button key={filter.label} variant={status === filter.id ? "primary" : "secondary"} size="xs" onClick={() => setStatus(filter.id)}>
                  {filter.label}
                </Button>
              ))}
            </div>

            <Panel title={`Incidents · ${filtered.length}`}>
              <div className="divide-y divide-studio-line">
                {filtered.map((incident) => (
                  <div key={incident.key} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${incident.status === "resolved" ? "bg-emerald-400" : "bg-rose-400"}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-studio-text">{incident.type}</p>
                        <Badge tone={incident.status === "resolved" ? "success" : "danger"} compact>
                          {incident.status ?? incident.rawStatus ?? "open"}
                        </Badge>
                        <span className="font-mono text-[10px] text-studio-faint">{new Date(incident.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-studio-muted">{incident.message}</p>
                    </div>
                    {incident.status !== "resolved" ? (
                      <Button size="xs" variant="ghost" onClick={() => resolve(incident.key)}>
                        Mark resolved
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}