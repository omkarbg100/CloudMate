import { useMutation } from "@tanstack/react-query";
import { CircleAlert, ListChecks, Rocket, ShieldCheck } from "lucide-react";
import { ValidationPipeline } from "../components/validation/ValidationStep";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { validateProject } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function ValidationView({ project, projectId, security }) {
  const recentValidation = useDeployMateStore((state) => state.recentValidation);
  const setRecentValidation = useDeployMateStore((state) => state.setRecentValidation);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);

  const mutation = useMutation({
    mutationFn: (payload) => validateProject(projectId, payload),
    onSuccess: setRecentValidation,
  });

  const running = mutation.isPending;
  const validation = running ? { ready: false, summary: "Running readiness checks…" } : recentValidation;
  const checks = validation?.checks ?? [];

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <PageHeader
          title="Validation"
          subtitle="Automated checks against your deployment plan. Blockers must be resolved before any plan can be created."
          actions={
            <Button
              variant="primary"
              disabled={running}
              isLoading={running}
              loadingLabel="Validating…"
              onClick={() => mutation.mutate({ includeSecurity: true })}
            >
              {running ? null : (
                <>
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  Run validation
                </>
              )}
            </Button>
          }
        />

        {!projectId ? (
          <EmptyState title="No project selected" description="Select a project to validate its deployment plan." actionLabel="Open projects" onAction={() => setActiveView("projects")} />
        ) : !validation ? (
          <EmptyState
            title="No validation run yet"
            description="Clean analysis, architecture and security clusters are a good sign, but confirmation never hurts. Run the checks when you're ready."
            actionLabel="Run validation"
            onAction={() => mutation.mutate({ includeSecurity: true })}
          />
        ) : (
          <div className="mt-5 space-y-4">
            {validation.ready ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <p className="text-sm text-emerald-200">
                  Ready. {validation.summary ?? "All readiness checks passed."}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3">
                <CircleAlert className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <p className="text-sm text-amber-200">
                  {validation.summary ?? "One or more checks need attention before deployment."}
                </p>
              </div>
            )}

            <Panel title={running ? "Checks running…" : `Checks · ${checks.filter((c) => c.status === "passed").length}/${checks.length} passed`}>
              <div className="p-4">{checks.length === 0 ? <p className="text-xs text-studio-faint">No checks reported yet.</p> : <ValidationPipeline checks={checks} overallStatus={validation.ready ? "passed" : "failed"} />}</div>
            </Panel>

            {validation.ready ? (
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setActiveView("deployment")}>
                  <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                  Create deployment plan
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}