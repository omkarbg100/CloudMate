import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Cloud, KeyRound, ShieldCheck, User2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { createAwsConnection, getAwsConnections } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

const STEPS = [
  { icon: ShieldCheck, label: "Create an IAM role" },
  { icon: User2, label: "Name the role in DeployMate" },
  { icon: KeyRound, label: "Paste role ARN + external ID" },
  { icon: CheckCircle2, label: "Confirm details" },
  { icon: Cloud, label: "Explicit deployment approval", done: true },
];

export default function AwsConnectionView({ awsConnections }) {
  const queryClient = useQueryClient();
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const mutation = useMutation({
    mutationFn: createAwsConnection,
    onSuccess: () => {
      setOpen(false);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["aws-connections"] });
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <PageHeader
          title="AWS connection"
          subtitle="Role-based access: DeployMate assumes an IAM role you control. Permanent access keys are never requested or stored."
          actions={
            <Button variant="primary" onClick={() => setOpen(true)}>
              + Add connection
            </Button>
          }
        />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Trust flow">
            <div className="p-4">
              <ol className="space-y-0">
                {STEPS.map((flow, index) => (
                  <li key={flow.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${flow.done ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : index + 1 === step ? "border-studio-accent bg-studio-accent/10 text-studio-accent" : "border-studio-line2 bg-studio-panel2 text-studio-faint"}`}>
                        <flow.icon className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {index < STEPS.length - 1 ? <span className="my-1 w-px flex-1 bg-studio-line2" /> : null}
                    </div>
                    <div className="min-w-0 pb-5">
                      <p className={`text-[13px] ${flow.done ? "text-studio-text" : "text-studio-muted"}`}>{flow.label}</p>
                      {index === 0 ? (
                        <p className="mt-1 text-[11px] leading-5 text-studio-faint">
                          The role only needs the permissions DeployMate asks for (ECR, ECS, etc.). You can scope it per project.
                        </p>
                      ) : null}
                      {index === 1 ? (
                        <p className="mt-1 text-[11px] leading-5 text-studio-faint">
                          The external ID is generated per connection, so even compromised metadata can't be used to assume the role from elsewhere.
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

          <div className="space-y-3">
            {awsConnections.length === 0 ? (
              <EmptyState
                title="No connections yet"
                description="Add one to let the engineer target real infrastructure. It only assumes the role when you approve a deployment."
                actionLabel="Add connection"
                onAction={() => setOpen(true)}
              />
            ) : (
              <Panel title={`Connections · ${awsConnections.length}`}>
                <div className="divide-y divide-studio-line">
                  {awsConnections.map((connection) => (
                    <div key={connection.connectionId} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2 text-studio-muted">
                        <Cloud className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-studio-text">{connection.accountId ?? connection.connectionId}</p>
                        <p className="text-[11px] text-studio-faint">
                          {connection.region} · {connection.roleArn}
                        </p>
                      </div>
                      <Badge tone={connection.status === "failed" ? "danger" : connection.status === "connected" ? "success" : "warning"}>
                        {connection.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            <p className="text-[11px] leading-5 text-studio-faint">
              In this preview build, connections are stored as metadata and marked pending until production STS
              validation is enabled. Pending connections are already usable in the deployment flow.
            </p>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Connect your AWS account">
        <ConnectionForm
          submitting={mutation.isPending}
          error={error}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

function ConnectionForm({ submitting, error, onSubmit, onCancel }) {
  const [form, setForm] = useState({ roleArn: "", externalId: "", region: "us-east-1" });
  const invalidExternalId = form.externalId.trim().length > 0 && form.externalId.trim().length < 12;
  const canSubmit = /^arn:aws:iam::\d{12}:role\/.+$/.test(form.roleArn.trim()) && form.externalId.trim().length >= 12 && form.region.trim();

  function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ roleArn: form.roleArn.trim(), externalId: form.externalId.trim(), region: form.region.trim() });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] leading-6 text-studio-muted">
        The external ID is a secret you generate once per connection. DeployMate includes it when assuming the role, so
        only this project can assume it.
      </p>
      <label className="block text-xs text-studio-faint">
        IAM role ARN
        <input
          value={form.roleArn}
          onChange={(event) => setForm({ ...form, roleArn: event.target.value })}
          placeholder="arn:aws:iam::123456789012:role/DeployMate"
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
      </label>
      <label className="block text-xs text-studio-faint">
        External ID
        <input
          value={form.externalId}
          onChange={(event) => setForm({ ...form, externalId: event.target.value })}
          placeholder="at least 12 characters"
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
        {invalidExternalId ? <span className="mt-1 block text-[10px] text-rose-400">Minimum 12 characters.</span> : null}
      </label>
      <label className="block text-xs text-studio-faint">
        Region
        <input
          value={form.region}
          onChange={(event) => setForm({ ...form, region: event.target.value })}
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
      </label>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={!canSubmit || submitting} isLoading={submitting} loadingLabel="Saving…">
          {submitting ? null : "Save connection"}
        </Button>
      </div>
    </form>
  );
}