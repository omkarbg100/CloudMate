import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderGit2, Github, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Panel, PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { createProject, deleteProject, getRepos } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function ProjectsView({ projects }) {
  const queryClient = useQueryClient();
  const setSelectedProjectId = useDeployMateStore((state) => state.setSelectedProjectId);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const [step, setStep] = useState("setup");
  const [repo, setRepo] = useState(null);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("main");
  const [error, setError] = useState("");

  const reposQuery = useQuery({ queryKey: ["repos"], queryFn: getRepos, retry: false });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      setSelectedProjectId(project.projectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setActiveView("overview");
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  function pickRepo(repository) {
    setRepo(repository);
    setName(repository.name || repository.full_name?.split("/")[1] || "");
    setError("");
    setStep("review");
  }

  function submit() {
    setError("");
    createMutation.mutate({
      name: name.trim() || `${repo.owner?.login ?? repo.owner ?? repo.full_name?.split("/")[0]}/${repo.name}`,
      repoOwner: repo.owner?.login ?? repo.owner ?? repo.full_name?.split("/")[0],
      repoName: repo.name,
      branch: branch.trim() || "main",
    });
  }

  const repoPool = reposQuery.data?.repositories ?? reposQuery.data?.repos ?? reposQuery.data ?? [];

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <PageHeader title="Projects" subtitle="Each project connects one repository to one isolated deployment target." />

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="New project">
              <div className="p-4">
                {step === "setup" ? (
                  <ChooseRepo repos={repoPool} loading={reposQuery.isLoading} error={reposQuery.error?.message} onPick={pickRepo} onManual={() => setStep("manual")} />
                ) : step === "manual" ? (
                  <ManualRepo onBack={() => setStep("setup")} onPick={pickRepo} />
                ) : (
                  <ReviewRepo repo={repo} name={name} setName={setName} branch={branch} setBranch={setBranch} onBack={() => setStep("setup")} onSubmit={submit} creating={createMutation.isPending} error={error} />
                )}
              </div>
            </Panel>

            <div className="space-y-3">
              <Panel title={`Workspace · ${projects.length}`}>
                <div className="p-2">
                  {projects.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-studio-faint">No projects yet. Create your first one to get started.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {projects.map((project) => (
                        <div key={project.projectId} className="group flex items-center gap-2.5 rounded-md border border-studio-line bg-studio-panel px-3 py-2 hover:border-studio-line2">
                          <FolderGit2 className="h-4 w-4 shrink-0 text-studio-accent" aria-hidden="true" />
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedProjectId(project.projectId)}>
                            <p className="truncate text-xs font-medium text-studio-text">{project.name}</p>
                            <p className="truncate font-mono text-[10px] text-studio-faint">
                              {project.repoOwner}/{project.repoName} · {project.branch}
                            </p>
                          </button>
                          <StatusBadge status={project.status} compact />
                          <button
                            type="button"
                            aria-label={`Delete ${project.name}`}
                            onClick={() => {
                              if (confirm(`Delete project "${project.name}"?`)) deleteMutation.mutate(project.projectId);
                            }}
                            className="text-studio-faint opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
              <p className="text-[11px] leading-5 text-studio-faint">
                Note: projects are stored server-side. Deleting one only removes the project record.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChooseRepo({ repos, loading, error, onPick, onManual }) {
  const [query, setQuery] = useState("");
  const filtered = (Array.isArray(repos) ? repos : []).filter((r) => {
    const text = `${r.name} ${r.full_name}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[13px] leading-6 text-studio-muted">
        Pick a repository from your GitHub account. The engineer will analyze it, design infrastructure, and propose
        changes before anything deploys.
      </p>
      {loading ? (
        <p className="py-8 text-center text-xs text-studio-faint">Loading repositories from GitHub…</p>
      ) : error ? (
        <p className="py-8 text-center text-xs text-studio-faint">
          Couldn't load repositories ({error}). Use manual entry instead.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-1.5 rounded border border-studio-line2 bg-studio-inset px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories…"
              className="h-7 w-full bg-transparent text-xs text-studio-text outline-none placeholder:text-studio-faint"
            />
          </div>
          <div className="studio-scrollbar mt-2 min-h-0 flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-studio-faint">No repositories match.</p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((repository) => (
                  <li key={repository.id ?? repository.full_name}>
                    <button type="button" onClick={() => onPick(repository)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-studio-panel2">
                      <Github className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-studio-text">{repository.full_name ?? repository.name}</span>
                      {repository.private ? <span className="text-[10px] text-studio-faint">private</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <Button variant="ghost" size="xs" className="mt-2 self-start" onClick={onManual}>
        <Plus className="h-3 w-3" aria-hidden="true" />
        Enter repository manually
      </Button>
    </div>
  );
}

function ManualRepo({ onBack, onPick }) {
  const [form, setForm] = useState({ owner: "", name: "" });
  const [error, setError] = useState("");
  return (
    <div>
      <p className="mb-3 text-[13px] leading-6 text-studio-muted">
        Enter any public repository. Example: <span className="font-mono text-studio-text">omkarbg100 / Codebase-Chat-Assistant</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Owner" value={form.owner} placeholder="omkarbg100" onChange={(v) => setForm({ ...form, owner: v })} />
        <Field label="Repository" value={form.name} placeholder="Codebase-Chat-Assistant" onChange={(v) => setForm({ ...form, name: v })} />
      </div>
      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <Button size="xs" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          Back
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!form.name.trim()}
          onClick={() => {
            if (!form.owner.trim() && !form.name.includes("/")) setError("Enter an owner or use owner/name format.");
            else {
              const [owner, name] = form.name.includes("/") ? form.name.split("/") : [form.owner.trim(), form.name.trim()];
              if (owner && name) onPick({ owner: { login: owner }, name, full_name: `${owner}/${name}` });
              else setError("Owner and repository are required.");
            }
          }}
        >
          Review
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ReviewRepo({ repo, name, setName, branch, setBranch, onBack, onSubmit, creating, error }) {
  return (
    <div>
      <p className="mb-3 text-[13px] leading-6 text-studio-muted">
        Confirm how this repository maps to a project.
      </p>
      <div className="space-y-3">
        <Field label="Project name" value={name} onChange={setName} />
        <label className="block text-xs text-studio-faint">
          Branch
          <input value={branch} onChange={(event) => setBranch(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 text-sm text-studio-text outline-none focus:border-studio-accent/60" />
        </label>
        <div className="rounded-md border border-studio-line bg-studio-inset px-3 py-2 font-mono text-xs text-studio-muted">
          {repo.owner?.login ?? repo.full_name?.split("/")[0]}/{repo.name}
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
      <div className="mt-4 flex items-center justify-between">
        <Button size="xs" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          Back
        </Button>
        <Button size="sm" variant="primary" disabled={creating || !name.trim()} isLoading={creating} loadingLabel="Creating…" onClick={onSubmit}>
          {creating ? null : (
            <>
              Connect repository
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-xs text-studio-faint">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-studio-line2 bg-studio-inset px-3 text-sm text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60"
      />
    </label>
  );
}