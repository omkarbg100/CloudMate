import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, ShieldCheck, ShieldHalf } from "lucide-react";
import { useState } from "react";
import { FindingCard } from "../components/security/FindingCard";
import { Button } from "../components/ui/Button";
import { Panel, PageHeader, SectionLabel } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { runSecurityScan } from "../services/api";

const SEVERITIES = ["critical", "high", "medium", "low"];

export default function SecurityView({ project, projectId, security }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(null);
  const findings = security?.findings ?? [];
  const counts = { ...(security?.summary ?? {}), total: findings.length };
  const filtered = filter ? findings.filter((f) => String(f.severity).toLowerCase() === filter) : findings;
  const clean = counts.critical === 0 && counts.high === 0;

  const mutation = useMutation({
    mutationFn: () => runSecurityScan(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["security", projectId] }), 8000);
    },
  });

  const scanRequested = mutation.isPending;
  const isScanning = security?.scanStatus === "scanning" || scanRequested;
  const neverScanned = !security && !isScanning;

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <PageHeader
          title="Security"
          subtitle={
            security
              ? `${findings.length} finding(s) across the codebase — ${counts.critical ?? 0} critical, ${counts.high ?? 0} high.`
              : "Scan your repository for dependency, secret and configuration risks before deploying."
          }
          actions={
            <Button variant="primary" isLoading={isScanning} loadingLabel="Scanning…" disabled={isScanning} onClick={() => mutation.mutate()}>
              {!isScanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Run security scan
                </>
              ) : null}
            </Button>
          }
        />

        {isScanning && !security ? (
          <LoadingState
            title="Scanning for risks…"
            steps={[
              "Checking dependencies",
              "Scanning for hardcoded secrets",
              "Reviewing configuration",
              "Classifying findings by severity",
            ]}
          />
        ) : neverScanned ? (
          <EmptyState
            title="No security scan yet"
            description="Run a scan. It checks dependencies, secrets and infrastructure configuration against known risk patterns."
            actionLabel="Run security scan"
            onAction={() => mutation.mutate()}
          />
        ) : findings.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No findings"
            description="The scan found nothing it would flag. You can safely move to validation."
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Severity filter */}
            <aside className="space-y-4">
              <Panel title="Summary">
                <div className="space-y-1.5 p-3">
                  <SeverityRow label="Critical" value={counts.critical ?? 0} tone="danger" active={filter === "critical"} onClick={() => setFilter(filter === "critical" ? null : "critical")} />
                  <SeverityRow label="High" value={counts.high ?? 0} tone="danger" active={filter === "high"} onClick={() => setFilter(filter === "high" ? null : "high")} />
                  <SeverityRow label="Medium" value={counts.medium ?? 0} tone="warning" active={filter === "medium"} onClick={() => setFilter(filter === "medium" ? null : "medium")} />
                  <SeverityRow label="Low" value={counts.low ?? 0} tone="muted" active={filter === "low"} onClick={() => setFilter(filter === "low" ? null : "low")} />
                  <SeverityRow label="Total" value={counts.total} tone="accent" active={filter === null} onClick={() => setFilter(null)} />
                </div>
              </Panel>
              {clean ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2.5 text-xs text-emerald-300">
                  <ShieldHalf className="h-4 w-4 shrink-0" aria-hidden="true" />
                  No critical or high severity findings.
                </div>
              ) : null}
            </aside>

            <Panel title={`Findings${filter ? ` · ${filter}` : ""}`}>
              <div className="p-3">
                {filtered.length === 0 ? (
                  <p className="py-10 text-center text-sm text-studio-faint">
                    <AlertTriangle className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                    No {filter} findings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityRow({ label, value, tone, active, onClick }) {
  const dots = { danger: "bg-rose-400", warning: "bg-amber-400", muted: "bg-studio-faint", accent: "bg-studio-accent" };
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs ${active ? "bg-studio-panel2 text-studio-text" : "text-studio-muted hover:bg-studio-panel2/50"}`}>
      <span className={`h-2 w-2 rounded-full ${dots[tone]}`} aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      <span className={`font-mono ${active ? "text-studio-text" : "text-studio-faint"}`}>{value}</span>
    </button>
  );
}