import { ArrowRight, FolderOpen } from "lucide-react";
import { Button } from "./Button";

/**
 * Every page resolves to a meaningful empty state. Never a blank panel.
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  tone = "accent",
  className = "",
}) {
  return (
    <div
      className={`studio-scrollbar flex h-full min-h-[260px] flex-col items-center justify-center overflow-auto p-8 text-center ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-studio-line2 bg-studio-panel2">
        <Icon className="h-5 w-5 text-studio-muted" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-studio-text">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-studio-muted">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

export function InlineEmpty({ icon: Icon = FolderOpen, title, description, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-studio-line2 px-6 py-10 text-center ${className}`}
    >
      <Icon className="h-5 w-5 text-studio-faint" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-studio-text">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs text-studio-muted">{description}</p> : null}
    </div>
  );
}