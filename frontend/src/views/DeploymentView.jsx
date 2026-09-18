import { useMutation } from "@tanstack/react-query";
import { Boxes, CheckCircle2, CircleDot, ListChecks, RotateCcw, Ship, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ApprovalCard } from "../components/approval/ApprovalCard";
import { DeploymentPipeline } from "../components/timeline/LifecycleTimeline";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { approveDeployment, createDeploymentPlan, rejectDeployment, rollbackDeployment } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

const PIPELINE_STEPS = ["Validate", "Build", "Deploy", "Health check"];

export default function DeploymentView({ project, projectId, awsConnections, events, deploymentStatus }) {
  const plan = useDeployMateStore((state) => state.deploymentPlan);
  const setDeploymentPlan = useDeployMateStore((state) => state.setDeploymentPlan);
  const currentDeploymentId = useDeployMateStore((state) => state.currentDeploymentId);
  const setCurrentDeploymentId = useDeployMateStore((state) => state.setCurrentDeploymentId);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const deploymentProgress = useDeployMateStore((state) => state.deploymentProgress);
  const [error, setError] = useState(null);

  const connected = awsConnections.filter((c) => c.status !== "failed");
  const [awsConnectionId, setAwsConnectionId] = useState(connected[0]?.connectionId ?? "");

  const planMutation = useMutation({
    mutationFn: () => createDeploymentPlan(projectId, awsConnectionId),
    onSuccess: (data) => {
      setDeploymentPlan(data);
      setCurrentDeploymentId(data.deploymentId ?? data.planId ?? null);
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveDeployment(currentDeploymentId),
    onSuccess: (data) => {
      setDeploymentPlan(data);
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectDeployment(currentDeploymentId),
    onSuccess: (data) => {
      setDeploymentPlan(data);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: () => rollbackDeployment(currentDeploymentId),
    onSuccess: (data) => setDeploymentPlan(data),
    onError: (e) => setError(e.message),
  });

  const status = plan?.status ?? deploymentStatus ?? null;
  const live = ["BUILDING", "DEPLOYING", "HEALTH_CHECK", "SUCCESS", "FAILED"].includes(status) || deploymentStatus === "deploying";
  const planCreated = Boolean(plan);
  const steps = plan?.steps?.length ? plan.steps : PIPELINE_STEPS;

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <PageHeader
          title="Deployment"
          subtitle="Explicit, reversible releases. Every plan is created, reviewed and approved before anything touches AWS."
        />

        {!projectId ? (
          <EmptyState title="No project selected" description="Select a project to create its deployment plan." actionLabel="Open projects" onAction={() => setActiveView("projects")} />
        ) : connected.length === 0 ? (
          <EmptyState
            title="No connected AWS account"
            description="A deployment plan targets real resources. Connect an AWS account first."
            actionLabel="Connect AWS"
            onAction={() => setActiveView("aws")}
          />
        ) : !planCreated ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-studio-line bg-studio-panel px-4 py-3 text-[13px] leading-6 text-studio-muted">
              I’ll generate a step-by-step resource plan: what gets created, reused or modified — plus the exact
              deployment pipeline. You review it line by line before anything runs.
            </div>
            {connected.length > 1 ? (
              <label className="block text-xs text-studio-muted">
                <span className="mb-1.5 block text-studio-faint">AWS connection</span>
                <select
                  value={awsConnectionId}
                  onChange={(event) => setAwsConnectionId(event.target.value)}
                  className="h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 text-sm text-studio-text outline-none focus:border-studio-accent/60"
                >
                  {connected.map((c) => (
                    <option key={c.connectionId} value={c.connectionId}>
                      {c.region} · {c.accountId}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
            <Button variant="primary" disabled={planMutation.isPending || !awsConnectionId} isLoading={planMutation.isPending} loadingLabel="Planning…" onClick={() => planMutation.mutate()}>
              {planMutation.isPending ? null : (
                <>
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  Create deployment plan
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* State banner */}
            {status === "SUCCESS" || deploymentStatus === "deployed" ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <p className="text-sm text-emerald-200">Deployment succeeded and is live.</p>
              </div>
            ) : ["FAILED", "ROLLING_BACK", "ROLLED_BACK"].includes(status) ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-rose-400/30 bg-rose-400/[0.06] px-4 py-3">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                <p className="text-sm text-rose-200">
                  {status === "ROLLED_BACK" ? "Rolled back to the previous healthy release." : status === "ROLLING_BACK" ? "Rolling back…" : "Deployment failed."}
                </p>
              </div>
            ) : null}

            {/* Pipeline summary */}
            <PlanSummary plan={plan} />

            {/* Resources / actions */}
            {plan.resources?.length ? (
              <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
                <div className="flex h-9 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
                  <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                  RESOURCE PLAN
                </div>
                <div className="divide-y divide-studio-line">
                  {plan.resources.map((resource, index) => (
                    <div key={`${resource.type}-${resource.name}-${index}`} className="flex items-center gap-2.5 px-3 py-2">
                      <Badge tone={actionTone(resource.action)}>{String(resource.action ?? "create").toUpperCase()}</Badge>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-studio-text">{resource.name ?? resource.type}</span>
                      <span className="text-[11px] text-studio-faint">{resource.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Plan approval gate */}
            {status === "AWAITING_APPROVAL" || status === "PLANNING" || status === "APPROVED" ? (
              <ApprovalCard
                description={
                  plan.summary ??
                  "This will create, update and modify the resources listed above in your AWS account, then run the deployment pipeline shown below."
                }
                onApprove={() => approveMutation.mutate()}
                approving={approveMutation.isPending}
                extra={
                  rejectMutation.isPending ? null : (
                    <button type="button" onClick={() => rejectMutation.mutate()} className="text-[11px] text-studio-faint underline-offset-2 hover:text-studio-text hover:underline">
                      Reject plan instead
                    </button>
                  )
                }
              />
            ) : null}

            {status === "REJECTED" ? (
              <div className="rounded-lg border border-studio-line bg-studio-panel px-4 py-3 text-sm text-studio-muted">
                Plan rejected. Create a new plan when you're ready.
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => setDeploymentPlan(null)}>
                    New plan
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Live progress */}
            {live ? (
              <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
                <div className="flex h-9 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
                  <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                  PIPELINE
                </div>
                <div className="p-4">
                  <DeploymentPipeline steps={steps.map(formatStep)} currentStep={plan?.currentStep} status={status} />
                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-studio-panel2">
                      <div className="h-full rounded-full bg-studio-accent transition-all duration-500" style={{ width: `${Math.max(6, deploymentProgress)}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-studio-faint">{Math.round(deploymentProgress)}%</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Live events */}
            {live && events.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
                <div className="flex h-9 items-center justify-between border-b border-studio-line px-3">
                  <span className="flex items-center gap-2 text-[11px] font-medium text-studio-faint">
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                    LIVE ACTIVITY
                  </span>
                  <span className="text-[10px] text-studio-faint">streaming from deployment engine</span>
                </div>
                <div className="studio-scrollbar max-h-56 overflow-auto p-3">
                  <ul className="space-y-1.5">
                    {events.slice(-20).reverse().map((event, index) => (
                      <li key={`${event.timestamp}-${index}`} className="flex gap-2 text-[11px] leading-5">
                        <span className="shrink-0 font-mono text-studio-faint">{new Date(event.timestamp ?? Date.now()).toLocaleTimeString()}</span>
                        <span className="min-w-0 text-studio-muted">{event.message ?? event.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {/* Actions after success / failure */}
            {status === "SUCCESS" || deploymentStatus === "deployed" ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setActiveView("monitoring")}>
                  Open monitoring
                </Button>
                <Button variant="danger" disabled={rollbackMutation.isPending} isLoading={rollbackMutation.isPending} loadingLabel="Rolling back…" onClick={() => rollbackMutation.mutate()}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Roll back
                </Button>
              </div>
            ) : null}

            {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanSummary({ plan }) {
  const meta = [
    ["Deployment", plan.deploymentId ?? plan.planId ?? "—"],
    ["Region", plan.region ?? plan.awsRegion ?? "—"],
    ["Resources", plan.resources?.length ?? 0],
    ["Status", plan.status ?? "—"],
  ].filter(([, value]) => value !== "—");
  return (
    <div className="overflow-hidden rounded-lg border border-studio-line bg-studio-panel">
      <div className="flex h-9 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
        DEPLOYMENT PLAN
      </div>
      <div className="grid grid-cols-2 gap-px bg-studio-line sm:grid-cols-4">
        {meta.map(([label, value]) => (
          <div key={label} className="bg-studio-panel px-3 py-2.5">
            <p className="text-[10px] text-studio-faint">{label}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-studio-text">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function actionTone(action) {
  if (action === "create") return "accent";
  if (action === "modify") return "warning";
  if (action === "delete") return "danger";
  return "muted";
}

function formatStep(step) {
  if (typeof step === "string") return step;
  return step.label ?? step.step ?? step.name ?? String(step);
}