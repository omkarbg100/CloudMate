import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Cloud, FolderGit2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  connectAwsAccount,
  disconnectAwsAccount,
  getAwsConnections,
  testAwsConnection,
  discoverProjectAws,
} from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function AwsConnectionView({ projects = [], awsConnections = [] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [step, setStep] = useState(1);
  const [successMeta, setSuccessMeta] = useState(null);

  useEffect(() => {
    if (projects.length && !projectId) {
      setProjectId(projects[0].projectId);
      setProjectName(projects[0].name);
    }
  }, [projects, projectId]);

  const mutation = useMutation({
    mutationFn: (input) => connectAwsAccount(input),
    onSuccess: (data) => {
      setError("");
      setSuccessMeta(data?.connection);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["aws-connections"] });
    },
    onError: (err) => setError(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (pid) => disconnectAwsAccount(pid),
    onSuccess: () => {
      setSuccessMeta(null);
      queryClient.invalidateQueries({ queryKey: ["aws-connections"] });
    },
  });

  const discoveryMutation = useMutation({
    mutationFn: (pid) => discoverProjectAws(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-connections"] });
    },
  });

  const lookup = Object.fromEntries((awsConnections ?? []).map((c) => [c.projectId, c]));
  const activeProject = projects.find((p) => p.projectId === (successMeta?.projectId ?? projectId));
  const activeConnection = lookup[activeProject?.projectId] ?? null;

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <PageHeader
          title="AWS connection"
          subtitle="IAM user credentials are stored encrypted at rest (AES-256-GCM). The secret access key is never shown after saving. Scoped per project."
          actions={
            <Button variant="primary" onClick={() => setOpen(true)}>
              + Add connection
            </Button>
          }
        />

        {projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No projects"
              description="Create a project first. AWS connections are scoped to one project each."
              actionLabel="Go to Projects"
              onAction={() => useDeployMateStore.getState().setActiveView("projects")}
            />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Connect AWS Account">
              <div className="p-4 space-y-4">
                <p className="text-[13px] leading-6 text-studio-muted">
                  Enter IAM user access keys and a region. The credential is validated with STS GetCallerIdentity before saving.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="flex w-full items-center gap-3 rounded-md border border-dashed border-studio-line2 bg-studio-inset px-4 py-4 text-left transition-colors hover:border-studio-accent/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2">
                    <Cloud className="h-4 w-4 text-studio-muted" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-studio-text">Connect project to AWS…</span>
                  <span className="text-[10px] text-studio-faint">{region}</span>
                </button>
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
                    {awsConnections.map((conn) => {
                      const project = projects.find((p) => p.projectId === conn.projectId);
                      const isDisconnected = conn.status === "failed" || conn.status === "disconnected";
                      return (
                        <div key={conn.connectionId} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2 text-studio-muted">
                            <FolderGit2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-studio-text">{project?.name ?? conn.projectId}</p>
                            <p className="truncate font-mono text-[10px] text-studio-faint">
                              {conn.accountId ?? "—"} · {conn.region} · {conn.identityArn ?? "—"}
                            </p>
                          </div>
                          <StatusBadge status={conn.status} compact />
                          {!isDisconnected ? (
                            <div className="flex gap-1.5">
                              <Button size="xs" variant="ghost" onClick={() => discoveryMutation.mutate(conn.projectId)}>
                                Discover
                              </Button>
                              <Button size="xs" variant="ghost" onClick={() => disconnectMutation.mutate(conn.projectId)}>
                                Disconnect
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}
              <p className="text-[11px] leading-5 text-studio-faint">
                Every project is validated independently. Only connected projects are available for AWS discovery and deployment.
              </p>
            </div>
          </div>
        )}

        <Modal open={open} onClose={() => setOpen(false)} title="Connect AWS account">
          <ConnectionForm
            projects={projects}
            project={activeProject}
            projectId={projectId}
            setProjectId={setProjectId}
            projectName={projectName}
            setProjectName={setProjectName}
            region={region}
            setRegion={setRegion}
            submitting={mutation.isPending}
            error={error}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
}

function ConnectionForm({ projects, project, projectId, setProjectId, projectName, setProjectName, region, setRegion, submitting, error, onSubmit, onCancel }) {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const validAccessKey = /^AKIA[0-9A-Z]{16}$/.test(accessKeyId.trim());
  const validSecretKey = secretAccessKey.trim().length >= 16;
  const canSubmit = projectId && validAccessKey && validSecretKey && region.trim();

  function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      projectId,
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] leading-6 text-studio-muted">
        Enter IAM user credentials and a region. DeployMate validates the credentials via STS before saving. The secret key is encrypted at rest.
      </p>
      <label className="block text-xs text-studio-faint">
        Project
        <select
          value={projectId}
          onChange={(e) => {
            const p = projects.find((x) => x.projectId === e.target.value);
            setProjectId(e.target.value);
            setProjectName(p?.name ?? "");
          }}
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 text-sm text-studio-text outline-none focus:border-studio-accent/60"
        >
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name} ({p.repoOwner}/{p.repoName})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-studio-faint">
        AWS Access Key ID
        <input
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.target.value)}
          placeholder="AKIAIOSFODNN7EXAMPLE"
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
      </label>
      <label className="block text-xs text-studio-faint">
        AWS Secret Access Key
        <input
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
          type="password"
          placeholder="Enter secret access key"
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
        <span className="mt-1 block text-[10px] text-studio-faint">Encrypted at rest · never shown after saving.</span>
      </label>
      <label className="block text-xs text-studio-faint">
        AWS Region
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="ap-south-1"
          className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
        />
      </label>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={!canSubmit || submitting} isLoading={submitting} loadingLabel="Validating…">
          {submitting ? null : "Test & Save"}
        </Button>
      </div>
    </form>
  );
}