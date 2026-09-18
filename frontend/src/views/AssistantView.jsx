import { useMutation } from "@tanstack/react-query";
import { Bot, History, Send, Sparkles, SquarePen } from "lucide-react";
import { useState } from "react";
import { AIMessage } from "../components/ai/AIMessage";
import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Panel";
import { sendChatMessage } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

const ACTION_VIEW = {
  "analyze the repository": "repository",
  "discover aws resources": "aws",
  "connect aws": "aws",
  "design an architecture": "architecture",
  "review security": "security",
  "run validation": "validation",
  "review deployment plan": "deployment",
  "deployment plan": "deployment",
};

export default function AssistantView({ project, projectId, analysis, awsConnections, events }) {
  const messages = useDeployMateStore((state) => state.messages);
  const addMessage = useDeployMateStore((state) => state.addMessage);
  const clearMessages = useDeployMateStore((state) => state.clearMessages);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const setRecentValidation = useDeployMateStore((state) => state.setRecentValidation);
  const validation = useDeployMateStore((state) => state.recentValidation);
  const [input, setInput] = useState("");

  const awsConnected = awsConnections.some((c) => c.status !== "failed");
  const analysisDone = Boolean(analysis);

  const mutation = useMutation({
    mutationFn: (message) => sendChatMessage(projectId, message),
    onSuccess: (data) => {
      if (data.result && typeof data.result === "object") setRecentValidation(data.result);
      addMessage({
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.message ?? data.result?.summary ?? "Got it — I've recorded that.",
        nextActions: data.nextActions ?? [],
        approvalRequired: Boolean(data.approvalRequired),
        approvalMessage: data.approvalRequired ? data.note : undefined,
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error) => {
      addMessage({
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `I hit an error: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    },
  });

  function submit(text = input) {
    const trimmed = text.trim();
    if (!trimmed || !projectId) return;
    addMessage({ id: `msg_${Date.now()}`, role: "user", content: trimmed, timestamp: new Date().toISOString() });
    setInput("");
    mutation.mutate(trimmed);
  }

  function handleAction(action) {
    const key = action.toLowerCase();
    const target = ACTION_VIEW[key] ?? Object.entries(ACTION_VIEW).find(([k]) => key.includes(k))?.[1];
    if (target) setActiveView(target);
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
      {/* History rail */}
      <aside className="hidden min-h-0 flex-col border-r border-studio-line bg-studio-panel lg:flex">
        <div className="flex h-9 items-center justify-between border-b border-studio-line px-3">
          <span className="flex items-center gap-2 text-[11px] font-medium text-studio-faint">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            SESSIONS
          </span>
          <button type="button" className="text-[11px] text-studio-faint hover:text-studio-text" onClick={clearMessages}>
            Clear
          </button>
        </div>
        <div className="studio-scrollbar min-h-0 flex-1 overflow-auto p-2">
          <button
            type="button"
            onClick={clearMessages}
            className="flex w-full items-center gap-2 rounded-md border border-studio-line2 bg-studio-panel2 px-2.5 py-2 text-left hover:border-studio-faint"
          >
            <SquarePen className="h-3.5 w-3.5 shrink-0 text-studio-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-studio-text">New conversation</p>
              <p className="truncate text-[10px] text-studio-faint">Start fresh thread</p>
            </div>
          </button>
          <p className="mt-3 px-2 text-[11px] leading-5 text-studio-faint">
            One conversation per session for now. I keep the full deployment context in mind.
          </p>
        </div>
      </aside>

      {/* Conversation */}
      <main className="flex min-h-0 flex-col">
        <div className="studio-scrollbar min-h-0 flex-1 overflow-auto px-5 py-5">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message) => (
              <AIMessage
                key={message.id}
                message={message}
                onAction={handleAction}
                onApprove={() => setActiveView("deployment")}
                onReject={() => {}}
                approving={false}
              />
            ))}
            {mutation.isPending ? (
              <AIMessage
                message={{ id: "typing", role: "assistant", content: "Working on it…", timestamp: new Date().toISOString() }}
                onAction={() => {}}
              />
            ) : null}
          </div>
        </div>
        <div className="shrink-0 border-t border-studio-line bg-studio-panel px-5 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={projectId ? "Ask about analysis, architecture, security or deployment…" : "Select a project to start a conversation."}
              disabled={!projectId}
              className="studio-scrollbar min-h-[52px] w-full resize-none rounded-md border border-studio-line2 bg-studio-inset px-3 py-2 text-sm text-studio-text outline-none placeholder:text-studio-faint focus:border-studio-accent/60 disabled:opacity-50"
            />
            <Button variant="primary" size="md" disabled={!projectId || !input.trim() || mutation.isPending} onClick={() => submit()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </Button>
          </div>
          <p className="mx-auto mt-1.5 max-w-3xl text-[10px] text-studio-faint">
            The engineer proposes; you decide. Anything that changes infra requires explicit approval.
          </p>
        </div>
      </main>

      {/* Context panel */}
      <aside className="hidden min-h-0 flex-col border-l border-studio-line bg-studio-panel lg:flex">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-studio-line px-3 text-[11px] font-medium text-studio-faint">
          <Bot className="h-3.5 w-3.5 text-studio-accent" aria-hidden="true" />
          DEPLOYMENT CONTEXT
        </div>
        <div className="studio-scrollbar min-h-0 flex-1 space-y-3 overflow-auto p-3">
          <ContextRow label="Repository" value={project ? `${project.repoOwner}/${project.repoName}` : "—"} mono />
          <ContextRow label="Branch" value={project?.branch ?? "—"} />
          <ContextRow label="AWS" value={awsConnected ? `Connected · ${project?.awsRegion ?? "—"}` : "Not connected"} tone={awsConnected ? "success" : "danger"} />
          <ContextRow label="Framework" value={analysis?.backend?.framework ?? "—"} />
          <ContextRow label="Database" value={analysis?.database ?? "—"} />
          <ContextRow label="Validation" value={validation ? (validation.ready ? "Passed" : "Blocked") : analysisDone ? "Not run" : "Not run"} tone={validation ? (validation.ready ? "success" : "danger") : "muted"} />
          <Panel title="Recent activity">
            <div className="p-3">
              {events.length === 0 ? (
                <p className="text-[11px] text-studio-faint">Push a change to your repository branch to see a diff here.</p>
              ) : (
                <ul className="space-y-1.5">
                  {events.slice(-5).reverse().map((event, index) => (
                    <li key={`${event.timestamp}-${index}`} className="truncate text-[11px] text-studio-muted">
                      <span className="font-mono text-studio-faint">{new Date(event.timestamp ?? Date.now()).toLocaleTimeString()}</span>{" "}
                      {event.message ?? event.type}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </aside>
    </div>
  );
}

function ContextRow({ label, value, tone = "muted", mono }) {
  const color = { success: "text-emerald-300", danger: "text-rose-300", muted: "text-studio-text" }[tone];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[11px] text-studio-faint">{label}</span>
      <span className={`min-w-0 truncate text-xs ${mono ? "font-mono text-[11px]" : ""} ${color}`}>{value}</span>
    </div>
  );
}