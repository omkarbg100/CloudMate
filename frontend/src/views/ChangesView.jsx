import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitCommit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { DiffViewer } from "../components/diff/DiffViewer";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/Panel";
import { EmptyState } from "../components/ui/EmptyState";
import { commitRepoFile, generateCode } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function ChangesView({ project, projectId, analysis }) {
  const queryClient = useQueryClient();
  const setRecentChanges = useDeployMateStore((state) => state.setRecentChanges);
  const recentChanges = useDeployMateStore((state) => state.recentChanges);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const [decisions, setDecisions] = useState({});
  const [commits, setCommits] = useState({});
  const [commitMessage, setCommitMessage] = useState("feat: apply AI-proposed improvement from DeployMate");

  const changes = recentChanges?.changes ?? [];
  const committedCount = changes.filter((c) => commits[c.file]?.committed).length;
  const branch = project?.branch ?? "main";

  const mutation = useMutation({
    mutationFn: (payload) => generateCode(projectId, payload),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["analysis", projectId] });
      setRecentChanges(data);
      setDecisions({});
      setCommits({});
    },
  });

  const commitMutation = useMutation({
    mutationFn: (payload) => commitRepoFile(projectId, payload),
  });

  const propose = (context) => {
    mutation.mutate({ context: context ?? undefined });
  };

  const accept = (change) => {
    const content = change.proposed ?? change.replacement ?? change.content;
    if (typeof content !== "string" || !content) {
      setCommits((prev) => ({
        ...prev,
        [change.file]: { error: "No full file content available to commit. Regenerate this change." },
      }));
      return;
    }
    setDecisions((d) => ({ ...d, [change.file]: "accepted" }));
    setCommits((prev) => ({ ...prev, [change.file]: { committing: true } }));
    commitMutation.mutate(
      { file: change.file, content, message: commitMessage },
      {
        onSuccess: (result) => {
          setCommits((prev) => ({ ...prev, [change.file]: { committed: true, sha: result.commitSha } }));
          queryClient.invalidateQueries({ queryKey: ["repo-tree", projectId] });
          queryClient.invalidateQueries({ queryKey: ["repo-file", projectId] });
          queryClient.invalidateQueries({ queryKey: ["analysis", projectId] });
        },
        onError: (error) => {
          setDecisions((d) => ({ ...d, [change.file]: undefined }));
          setCommits((prev) => ({ ...prev, [change.file]: { error: error.message } }));
        },
      }
    );
  };

  const reject = (file) => {
    setDecisions((d) => ({ ...d, [file]: "rejected" }));
  };

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <PageHeader
          title="Changes"
          subtitle={
            changes.length
              ? `AI-proposed fixes for your repository. Accepting applies a real commit to the ${branch} branch.`
              : "AI-generated fixes, staged as a code review. Accepting commits them to your repository."
          }
          actions={
            <Button variant="primary" disabled={mutation.isPending} isLoading={mutation.isPending} loadingLabel="Generating…" onClick={() => propose()}>
              {mutation.isPending ? null : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Generate changes
                </>
              )}
            </Button>
          }
        />

        {!projectId ? (
          <EmptyState title="No project selected" description="Choose a project first to propose changes against it." actionLabel="Open projects" onAction={() => setActiveView("projects")} />
        ) : mutation.isPending ? (
          <EmptyState title="Generating changes…" description="Reviewing the repository for issues it can safely fix." />
        ) : changes.length === 0 ? (
          <EmptyState
            title="No changes proposed yet"
            description="Ask for fixes — or we can review the code for common runtime and security issues automatically."
            actionLabel="Generate changes"
            onAction={() => propose({ context: "identify and fix common bugs, missing error handling and deployability issues" })}
          />
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-studio-line bg-studio-panel px-3 py-2">
              <p className="text-xs text-studio-muted">
                <span className="font-medium text-studio-text">{committedCount}</span> of{" "}
                <span className="font-medium text-studio-text">{changes.length}</span> change(s) committed
              </p>
              <span className="text-[11px] text-studio-faint">Accepting commits to <span className="font-mono">{branch}</span></span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-studio-line bg-studio-panel px-3 py-2">
              <label htmlFor="commit-message" className="flex items-center gap-1.5 text-[11px] font-medium text-studio-faint">
                <GitCommit className="h-3 w-3" aria-hidden="true" />
                COMMIT MESSAGE
              </label>
              <input
                id="commit-message"
                type="text"
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-studio-text outline-none placeholder:text-studio-faint"
                placeholder="Message used when you apply a change"
              />
            </div>

            {recentChanges?.explanation ? (
              <p className="rounded-lg border border-studio-line bg-studio-panel px-4 py-3 text-[13px] leading-6 text-studio-muted">
                {recentChanges.explanation}
              </p>
            ) : null}

            <div className="space-y-2">
              {changes.map((change) => {
                const decision = decisions[change.file];
                const commit = commits[change.file];
                return (
                  <DiffViewer
                    key={change.file}
                    file={change.file}
                    diff={change.diff}
                    replacement={change.proposed ?? change.replacement}
                    explanation={change.explanation ?? change.description}
                    decision={decision}
                    committing={commit?.committing}
                    committed={commit?.committed ? commit : undefined}
                    error={commit?.error}
                    onAccept={() => accept(change)}
                    onReject={() => reject(change.file)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}