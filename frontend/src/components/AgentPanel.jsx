import { useMutation } from "@tanstack/react-query";
import { Bot, CheckCircle2, Send, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { sendChatMessage } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export function AgentPanel({ projectId }) {
  const [input, setInput] = useState("");
  const messages = useDeployMateStore((state) => state.messages);
  const addMessage = useDeployMateStore((state) => state.addMessage);

  const chatMutation = useMutation({
    mutationFn: (message) => sendChatMessage(projectId, message),
    onSuccess: (response) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message,
        nextActions: response.nextActions,
        approvalRequired: response.approvalRequired,
        timestamp: new Date().toISOString(),
      });
    },
    onError: () => {
      addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: "The backend is not reachable. Start the Node API or check the proxy configuration.",
        timestamp: new Date().toISOString(),
      });
    },
  });

  function submit(message) {
    const trimmed = message.trim();
    if (!trimmed || !projectId) return;
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    });
    chatMutation.mutate(trimmed);
    setInput("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit(input);
  }

  return (
    <section className="grid min-h-0 grid-rows-[48px_minmax(0,1fr)_auto] bg-white">
      <div className="flex items-center justify-between border-b border-studio-line px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="h-4 w-4 text-studio-teal" aria-hidden="true" />
          AI Chat
        </div>
        <span className="text-xs text-neutral-500">orchestrator</span>
      </div>

      <div className="studio-scrollbar min-h-0 space-y-3 overflow-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`border px-3 py-2 text-sm leading-6 ${
              message.role === "user"
                ? "border-studio-teal bg-[#effaf8]"
                : message.role === "system"
                  ? "border-studio-amber bg-[#fff8ed]"
                  : "border-studio-line bg-studio-panel"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase text-neutral-500">
              {message.role === "user" ? (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              ) : message.role === "system" ? (
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {message.role}
            </div>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.nextActions?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.nextActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => submit(action)}
                    className="border border-studio-line bg-white px-2 py-1 text-xs hover:border-studio-teal"
                  >
                    {action}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {chatMutation.isPending ? (
          <p className="text-xs text-neutral-500">Agent is thinking…</p>
        ) : null}
      </div>

      <div className="border-t border-studio-line p-4">
        <div className="mb-2 flex flex-wrap gap-2">
          {[
            "Analyze the repository and list deployment blockers.",
            "Discover AWS resources and generate a dynamic deployment plan.",
            "Explain why each AWS resource should be created, reused, or modified.",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => submit(prompt)}
              className="h-8 max-w-full truncate border border-studio-line bg-studio-panel px-2 text-xs hover:bg-white"
            >
              {prompt.split(" ").slice(0, 4).join(" ")}…
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-20 min-w-0 flex-1 resize-none border border-studio-line bg-white p-2 text-sm outline-none focus:border-studio-teal"
            placeholder={projectId ? "Ask the deployment agent" : "Select a project first"}
            disabled={!projectId}
          />
          <button
            type="submit"
            disabled={!projectId}
            className="flex h-20 w-12 items-center justify-center bg-studio-ink text-white hover:bg-studio-teal disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
