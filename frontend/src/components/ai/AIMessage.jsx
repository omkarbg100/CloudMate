import { Bot, ShieldAlert, User } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Renders one chat message, including suggested next actions and
 * an explicit approval prompt (never auto-executed).
 */
export function AIMessage({ message, onAction, onApprove, onReject, approving }) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp ?? Date.now());

  return (
    <div className="flex gap-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
          isUser
            ? "border-studio-line2 bg-studio-panel2 text-studio-text"
            : "border-studio-accent/30 bg-studio-accent/10 text-studio-accent"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" aria-hidden="true" /> : <Bot className="h-3.5 w-3.5" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-studio-text">{isUser ? "You" : "AI Deployment Engineer"}</span>
          <span className="text-[10px] text-studio-faint">{timestamp.toLocaleTimeString()}</span>
        </div>
        <div className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-studio-muted">{message.content}</div>

        {message.nextActions?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.nextActions.map((action) => (
              <Button key={action} variant="secondary" size="xs" onClick={() => onAction?.(action)}>
                {action}
              </Button>
            ))}
          </div>
        ) : null}

        {message.approvalRequired ? (
          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Approval required
            </p>
            <p className="mt-1 text-xs leading-5 text-studio-muted">
              {message.approvalMessage ?? "This action changes infrastructure in your AWS account."}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="primary" disabled={approving} isLoading={approving} loadingLabel="Approving…" onClick={onApprove}>
                Approve
              </Button>
              <Button size="xs" variant="ghost" onClick={onReject}>
                Reject
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}