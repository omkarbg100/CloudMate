import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Globe, Lock, Play, Rocket, ScanLine, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Badge } from "../components/ui/Badge";
import { Panel, SectionLabel } from "../components/ui/Panel";
import { MetricCard } from "../components/ui/MetricCard";
import { EmptyState, InlineEmpty } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { LifecycleTimeline } from "../components/timeline/LifecycleTimeline";
import { AIActivity } from "../components/ai/AIActivity";
import { projectLifecycle, projectStatus } from "../lib/lifecycle";
import { analyzeProject, getAlerts, getHealth, getMetrics } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";
import { EnvironmentBadge } from "../components/ui/EnvironmentBadge";

function inferEnvironment(project) {
  // Branch naming is the closest real signal we have until multi-env is wired.
  const branch = project?.branch ?? "";
  if (branch.startsWith("prod")) return "production";
  if (branch.startsWith("stage") || branch.startsWith("release")) return "staging";
  if (branch === "main") return "production";
  return "development";
}

export default function OverviewView(props) {
  const { project, projectId, analysis, architecture, security, awsConnections, events, user } = props;
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const recentChanges = useDeployMateStore((state) => state.recentChanges);
  const recentValidation = useDeployMateStore((state) => state.recentValidation);
  const deploymentPlan = useDeployMateStore((state) => state.deploymentPlan);
  const awsConnected = awsConnections.some((c) => c.status !== "failed");

  const healthQuery = useQuery({
    queryKey: ["overview-health", projectId],
    queryFn: () => getHealth(projectId),
    enabled: Boolean(projectId) && project?.status === "deployed",
    refetchInterval: 20000,
  });
  const metricsQuery = useQuery({
    queryKey: ["overview-metrics", projectId],
    queryFn: () => getMetrics(projectId),
    enabled: Boolean(projectId) && project?.status === "deployed",
    refetchInterval: 20000,
  });
  const alertsQuery = useQuery({
    queryKey: ["overview-alerts", projectId],
    queryFn: () => getAlerts(projectId),
    enabled: Boolean(projectId) && project?.status === "deployed",
  });

  const source = {
    project,
    analysis,
    architecture,
    security,
    changes: recentChanges,
    validation: recentValidation,
    deploymentPlan,
    deploymentEvents: events,
    health: { ...healthQuery.data, alerts: alertsQuery.data?.alerts },
  };

  const status = projectStatus(source);
  const stages = projectLifecycle(source);
  const metrics = metricsQuery.data;

  if (!projectId || !project) {
    return (
      <div className="studio-scrollbar h-full overflow-auto">
        <EmptyState
          title="No project selected"
          description="Create a project, connect your GitHub repository and an AWS account to start your deployment journey."
          actionLabel="Create project"
          onAction={() => setActiveView("projects")}
        />
      </div>
    );
  }

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <OverviewHeader
          project={project}
          status={status}
          awsConnected={awsConnected}
          env={inferEnvironment(project)}
          onAnalyze={() => setActiveView("repository")}
        />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <AIActionCard source={source} status={status} go={setActiveView} hasAnalysis={Boolean(analysis)} />

            {/* Deployment lifecycle */}
            <Panel title="Deployment lifecycle">
              <div className="p-4">
                <LifecycleTimeline stages={stages} />
              </div>
            </Panel>

            <AIActivity events={events} defaultOpen={events.length > 0} />
          </div>

          {/* Right rail: summary + attention + monitoring */}
          <div className="space-y-4">
            <ProjectSummary source={source} go={setActiveView} />

            <AttentionPanel source={source} go={setActiveView} />

            {project.status === "deployed" ? (
              <Panel title="Production status">
                <div className="grid grid-cols-2 gap-2 p-3">
                  <MetricCard label="Health" value={healthQuery.data?.status ?? "unknown"} tone={healthQuery.data?.status === "healthy" ? "success" : "warning"} />
                  <MetricCard label="Requests" value={metrics?.requestCount} hint="per 30s sample" />
                  <MetricCard label="Error rate" value={metrics ? `${metrics.errorRate}%` : "—"} tone={Number(metrics?.errorRate ?? 0) > 1 ? "danger" : "success"} />
                  <MetricCard label="CPU" value={metrics ? `${metrics.cpuUtilization}%` : "—"} />
                </div>
                {(alertsQuery.data?.alerts ?? []).length > 0 ? (
                  <div className="border-t border-studio-line px-3 py-2 text-xs text-amber-400">
                    {alertsQuery.data.alerts.length} active alert(s)
                  </div>
                ) : null}
                <div className="border-t border-studio-line px-3 py-2">
                  <Button variant="secondary" size="xs" onClick={() => setActiveView("monitoring")}>
                    Open monitoring
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              </Panel>
            ) : (
              <Panel title="What happens next">
                <div className="p-4">
                  <NextUp stages={stages} go={setActiveView} awsConnected={awsConnected} />
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewHeader({ project, status, awsConnected, env, onAnalyze }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold text-studio-text">{project.name}</h1>
          <StatusBadge status={status} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-studio-muted">
          <span className="font-mono">{project.repoOwner}/{project.repoName}</span>
          <Badge tone="muted">
            <GitBranch className="h-3 w-3" aria-hidden="true" />
            {project.branch}
          </Badge>
          <EnvironmentBadge env={env} />
          {project.url ? (
            <a href={project.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-studio-accentHi hover:underline">
              <Globe className="h-3 w-3" aria-hidden="true" />
              {project.url}
            </a>
          ) : null}
          {awsConnected ? (
            <Badge tone="success">
              <Lock className="h-3 w-3" aria-hidden="true" />
              AWS connected
            </Badge>
          ) : null}
        </div>
      </div>
      <Button variant="primary" onClick={onAnalyze}>
        <Play className="h-3.5 w-3.5" aria-hidden="true" />
        Analyze Repository
      </Button>
    </div>
  );
}

function AIActionCard({ source, status, go, hasAnalysis }) {
  const rec = recommend(source, status);
  if (!rec) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-studio-line2 bg-studio-panel">
      <div className="flex items-center gap-2 border-b border-studio-line px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-studio-accent" aria-hidden="true" />
        <span className="text-[13px] font-semibold text-studio-text">AI Deployment Engineer</span>
        <span className="ml-auto text-[11px] text-studio-faint">actions are gated on your approval</span>
      </div>
      <div className="p-4">
        <p className="text-sm text-studio-text">{rec.title}</p>
        {rec.description ? (
          <p className="mt-1.5 text-[13px] leading-6 text-studio-muted">{rec.description}</p>
        ) : null}

        <div className="mt-3 space-y-1.5">
          {rec.done.map((line) => (
            <p key={line} className="flex items-center gap-2 text-xs text-studio-success">
              <CheckMini />
              {line}
            </p>
          ))}
          {rec.issues.map((line) => (
            <p key={line} className="flex items-center gap-2 text-xs text-amber-400">
              <WarningMini />
              {line}
            </p>
          ))}
        </div>

        {rec.note ? <p className="mt-3 text-xs leading-5 text-studio-faint">{rec.note}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {rec.primary ? (
            <Button variant="primary" onClick={() => rec.primaryOnClick?.() ?? go(rec.primary.to)}>
              {rec.primary.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
          {rec.secondary ? (
            <Button variant="secondary" onClick={() => go(rec.secondary.to)}>
              {rec.secondary.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CheckMini() {
  return <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />;
}
function WarningMini() {
  return <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />;
}

/**
 * Turn the current project state into a single, human recommendation.
 * Answers: what the AI did, what it found, what to do next, what will change.
 */
function recommend({ project, analysis, architecture, security, validation, deploymentPlan, awsConnected }, status) {
  const findings = security?.findings ?? [];
  const openFindings = findings.filter((f) => ["critical", "high"].includes(f.severity));

  if (status === "DEPLOYED") {
    return {
      title: "Your service is deployed and operational.",
      description: "Monitoring is active below. I'll flag anomalies and propose reviewed fixes if something degrades.",
      done: ["Deployment live", "Monitoring active"],
      issues: [],
      note: "Nothing is changed in production without explicit approval.",
      primary: { label: "Open monitoring", to: "monitoring" },
      secondary: { label: "View deployment", to: "deployment" },
    };
  }

  if (deploymentPlan || project?.status === "awaiting_approval") {
    return {
      title: "Your deployment plan is ready for review.",
      description: "I've prepared the resource plan below. Review what changes, then approve explicitly.",
      done: ["Repository analyzed", "Architecture generated", "Deployment plan created"],
      issues: [],
      note: "Approving creates or modifies AWS resources. It happens only when you confirm.",
      primary: { label: "Review & approve", to: "deployment" },
      secondary: { label: "View architecture", to: "architecture" },
    };
  }

  if (!awsConnected) {
    return {
      title: "Connect your AWS account to continue.",
      description: "DeployMate assumes an IAM role with an external ID — permanent access keys are never stored.",
      done: analysis ? ["Repository analyzed"] : [],
      issues: [],
      primary: { label: "Connect AWS", to: "aws" },
    };
  }

  if (!analysis) {
    return {
      title: "Your repository is ready to be analyzed.",
      description: "I'll scan dependencies, frameworks, ports and deployment requirements to understand your app.",
      done: ["GitHub repository connected"],
      issues: [],
      primary: { label: "Analyze repository", to: "repository" },
    };
  }

  if (!architecture?.nodes?.length) {
    return {
      title: "Analysis complete — an architecture can be designed.",
      description: "I'll recommend which AWS resources to create, reuse or modify for this repository shape.",
      done: ["Repository analyzed"],
      issues: [],
      primary: { label: "Generate architecture", to: "architecture" },
    };
  }

  if (openFindings.length > 0) {
    return {
      title: `Your project is ready, but ${openFindings.length} ${openFindings.length === 1 ? "finding needs" : "findings need"} attention before deployment.`,
      description: "Address the critical and high severity findings first so nothing leaks into production.",
      done: ["Repository analyzed", "Architecture generated", "Security scan completed"],
      issues: openFindings.map((f) => `${severityName(f.severity)} · ${f.file} — ${f.description}`),
      primary: { label: "Review security", to: "security" },
      secondary: { label: "Review architecture", to: "architecture" },
    };
  }

  if (!validation) {
    return {
      title: "Security looks clean — run validation to confirm readiness.",
      description: "I'll run dependency, build and runtime checks against the deployment plan.",
      done: ["Repository analyzed", "Architecture generated", "Security scan passed", ...(findings.length ? [`${findings.length} low/medium finding(s)`] : [])],
      issues: [],
      primary: { label: "Run validation", to: "validation" },
      secondary: { label: "Review architecture", to: "architecture" },
    };
  }

  if (!validation.ready) {
    return {
      title: "Validation is blocked.",
      description: validation.summary ?? "One or more readiness checks failed.",
      done: ["Repository analyzed", "Architecture generated", "Validation ran"],
      issues: ["Validation did not pass"],
      primary: { label: "Review validation", to: "validation" },
    };
  }

  return {
    title: "Validation passed — your deployment plan can be created.",
    description: "Everything I check is green. I'll prepare the resource plan and walk you through it before anything runs.",
    done: ["Repository analyzed", "Architecture generated", "Security scan passed", "Validation passed"],
    issues: [],
    primary: { label: "Create deployment plan", to: "deployment" },
    secondary: { label: "Review validation", to: "validation" },
  };
}

function stackLabel(languages) {
  if (!languages) return "Unknown";
  if (Array.isArray(languages)) return languages.slice(0, 3).join(", ");
  if (typeof languages === "object") return Object.keys(languages).slice(0, 3).join(", ");
  return String(languages);
}

function severityName(severity) {
  return String(severity ?? "").toUpperCase();
}

function ProjectSummary({ source, go }) {
  const { project, analysis, architecture } = source;
  return (
    <Panel title="Project">
      <div className="divide-y divide-studio-line text-[13px]">
        <SummaryRow label="Repository" value={`${project.repoOwner}/${project.repoName}`} mono />
        <SummaryRow label="Branch" value={project.branch} />
        <SummaryRow label="Region" value={project.awsRegion ?? "—"} mono />
        <SummaryRow label="Stack" value={analysis ? stackLabel(analysis.languages) : "Not analyzed"} />
        <SummaryRow label="Database" value={analysis?.database ?? "—"} />
        <SummaryRow label="Docker" value={analysis ? (analysis.docker ? "Detected" : "Not detected") : "—"} />
        <SummaryRow label="Resources" value={architecture?.nodes?.length ? `${architecture.nodes.length} planned` : "—"} />
      </div>
      {!analysis && !architecture ? (
        <div className="px-3 pb-3">
          <Button variant="secondary" size="xs" className="w-full" onClick={() => go("repository")}>
            <ScanLine className="h-3 w-3" aria-hidden="true" />
            Inspect repository
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function SummaryRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-studio-faint">{label}</span>
      <span className={`min-w-0 truncate text-studio-text ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function AttentionPanel({ source, go }) {
  const { security } = source;
  const findings = security?.findings ?? [];
  const criticals = findings.filter((f) => ["critical", "high"].includes(f.severity));

  return (
    <Panel title="Needs attention">
      <div className="p-3">
        {criticals.length > 0 ? (
          <div className="space-y-2">
            {criticals.slice(0, 3).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => go("security")}
                className="w-full rounded border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-2 text-left hover:bg-amber-400/10"
              >
                <p className="text-xs font-medium text-amber-300">
                  {String(f.severity).toUpperCase()} · {f.file}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-studio-muted">{f.description}</p>
              </button>
            ))}
            <Button variant="secondary" size="xs" className="w-full" onClick={() => go("security")}>
              Review all findings
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <InlineEmpty
            title="Nothing needs your attention"
            description="The latest scan and readiness checks are clean. Next step: validation or deployment."
            className="mb-1"
          />
        )}
      </div>
    </Panel>
  );
}

function NextUp({ stages, go, awsConnected }) {
  const next = stages.find((stage) => stage.state === "not_started") ?? (stages.at(-1).state !== "not_started" ? null : stages.at(-1));
  if (!next) return null;
  return (
    <div className="space-y-2 text-xs text-studio-muted">
      <p className="flex items-center gap-2">
        <Rocket className="h-3.5 w-3.5 text-studio-accent" aria-hidden="true" />
        Next: <span className="font-medium text-studio-text">{next.label}</span>
      </p>
      <Button variant="secondary" size="xs" className="w-full" onClick={() => go(viewForStage(next.key))}>
        Open {next.label}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

function viewForStage(key) {
  const map = {
    repository: "repository",
    analysis: "repository",
    architecture: "architecture",
    security: "security",
    changes: "changes",
    validation: "validation",
    deployment: "deployment",
    monitoring: "monitoring",
  };
  return map[key];
}