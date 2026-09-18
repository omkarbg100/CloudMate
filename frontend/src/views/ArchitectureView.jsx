import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, CheckCircle2, FilePlus2, PencilLine, RefreshCw, Repeat, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";
import { ArchitectureDiagram } from "../components/architecture/ArchitectureDiagram";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { generateArchitecture } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

function nodeTone(node) {
  if (node.decision === "create") {
    return {
      label: "Create",
      icon: FilePlus2,
      chip: "border-sky-400/30 bg-sky-400/10 text-sky-400",
      desc: "Built as part of this deployment",
    };
  }
  if (node.decision === "modify") {
    return {
      label: "Modify",
      icon: PencilLine,
      chip: "border-amber-400/30 bg-amber-400/10 text-amber-400",
      desc: "An existing resource will change",
    };
  }
  return {
    label: "Reuse",
    icon: Repeat,
    chip: "border-studio-line2 bg-studio-panel2 text-studio-muted",
    desc: "Attached to an existing resource",
  };
}

export default function ArchitectureView({ project, projectId, architecture, awsConnections }) {
  const queryClient = useQueryClient();
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const [selectedId, setSelectedId] = useState(null);
  const selected = architecture?.nodes?.find((node) => node.id === selectedId) ?? null;

  const awsConnected = awsConnections.some((c) => c.status !== "failed");
  const hasArchitecture = Boolean(architecture?.nodes?.length);
  const count = (decision) => (architecture?.nodes ?? []).filter((node) => node.decision === decision).length;
  const approvals = (architecture?.resourceDecisions ?? []).filter((d) => d.approvalRequired).length;

  const mutation = useMutation({
    mutationFn: () => generateArchitecture(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["architecture", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <PageHeader
          title="Architecture"
          subtitle={hasArchitecture ? `Recommended target architecture for ${project.name} in ${architecture.region ?? project.awsRegion ?? "your AWS region"}.` : "Design the AWS resources needed to run your code safely."}
          actions={
            <Button
              variant="primary"
              disabled={mutation.isPending && !hasArchitecture}
              isLoading={mutation.isPending && !hasArchitecture}
              loadingLabel="Designing…"
              onClick={() => mutation.mutate()}
            >
              {hasArchitecture ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Design again
                </>
              ) : (
                <>
                  <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                  Generate architecture
                </>
              )}
            </Button>
          }
        />

        {!awsConnected ? (
          <EmptyState
            title="Connect your AWS account first"
            description="Architecture design targets real resources in your account, so an AWS connection is required."
            actionLabel="Connect AWS"
            onAction={() => setActiveView("aws")}
          />
        ) : mutation.isPending && !hasArchitecture ? (
          <LoadingState
            title="Designing your architecture…"
            steps={[
              "Deriving services from analysis",
              "Deciding create / reuse / modify",
              "Mapping traffic and data flow",
              "Writing rationale",
            ]}
          />
        ) : !hasArchitecture ? (
          <EmptyState
            title="No architecture yet"
            description="Run the analysis first, then generate an architecture for this repository."
            actionLabel="Generate architecture"
            onAction={() => mutation.mutate()}
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Diagram */}
            <div>
              <Panel title={`Resources · ${architecture?.nodes?.length ?? 0} nodes`}>
                <div className="p-4">
                  <ArchitectureDiagram
                    nodes={architecture?.nodes ?? []}
                    edges={architecture?.edges ?? []}
                    selectedId={selectedId}
                    onNodeSelect={(node) => setSelectedId(node.id)}
                  />
                </div>
              </Panel>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {["create", "reuse", "modify"].map((decision) => {
                    const info = nodeTone({ decision });
                    const Icon = info.icon;
                    return (
                      <span key={decision} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${info.chip}`}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {count(decision)} {info.label.toLowerCase()}
                      </span>
                    );
                  })}
                </div>
                {approvals > 0 ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    {approvals} change(s) will require your approval
                  </span>
                ) : null}
              </div>
            </div>

            {/* Details / rationale */}
            <div className="space-y-4">
              {selected ? (
                <Panel title={selected.label}>
                  <div className="p-4">
                    <NodeDetail node={selected} />
                  </div>
                </Panel>
              ) : (
                <Panel title="Rationale">
                  <div className="p-4 space-y-3">
                    {(architecture?.rationale ?? []).length > 0 ? (
                      architecture.rationale.map((line) => (
                        <p key={line} className="flex gap-2 text-[13px] leading-6 text-studio-muted">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-studio-success" aria-hidden="true" />
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs leading-6 text-studio-faint">Select a resource to see why the AI chose this configuration.</p>
                    )}
                  </div>
                </Panel>
              )}

              {(architecture?.resourceDecisions ?? []).length > 0 ? (
                <Panel title="Changes that need approval">
                  <div className="divide-y divide-studio-line">
                    {architecture.resourceDecisions.filter((d) => d.approvalRequired).map((decision) => {
                      const tone = decision.action === "create" ? "accent" : decision.action === "modify" ? "warning" : "muted";
                      return (
                        <div key={`${decision.service}-${decision.targetName}`} className="flex items-start gap-2.5 px-4 py-2.5">
                          <Badge tone={tone}>{String(decision.action).toUpperCase()}</Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-studio-text">{decision.service}</p>
                            <p className="mt-0.5 text-[11px] leading-5 text-studio-muted">{decision.reason ?? decision.targetName}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeDetail({ node }) {
  const info = nodeTone(node);
  const Icon = info.icon;
  return (
    <div className="space-y-3">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${info.chip}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {info.label}
      </span>
      <dl className="space-y-2 text-xs">
        <DetailRow label="Service" value={node.service} mono />
        {node.purpose ? <DetailRow label="Purpose" value={node.purpose} /> : null}
        {node.existingResourceId ? <DetailRow label="Resource" value={node.existingResourceId} mono /> : null}
      </dl>
      <p className="text-[11px] leading-5 text-studio-faint">{info.desc}.</p>
      <div className="flex items-center gap-1.5 rounded-md border border-studio-line bg-studio-inset px-2.5 py-2 text-[11px] text-studio-faint">
        <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
        Creating or modifying this resource requires explicit approval before deployment.
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-studio-faint">{label}</dt>
      <dd className={`min-w-0 text-studio-text ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}