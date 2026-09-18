import { CheckCircle2, CircleDashed, Loader2, RotateCw, Sparkles } from "lucide-react";

const STATUS_ICON = {
  success: CheckCircle2,
  running: Loader2,
  analyzing: Loader2,
};

export function LoadingState({
  title = "Working…",
  steps = [],
  currentIndex = 0,
  className = "",
}) {
  return (
    <div className={`flex h-full min-h-[240px] flex-col items-center justify-center p-8 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-studio-text">
        <Loader2 className="h-4 w-4 animate-spin text-studio-accent" aria-hidden="true" />
        {title}
      </div>

      {steps.length > 0 ? (
        <div className="mt-5 w-full max-w-sm space-y-2">
          {steps.map((stepLabel, index) => {
            const isCurrent = index === currentIndex;
            const isDone = index < currentIndex;
            const Icon = isDone ? CheckCircle2 : isCurrent ? Loader2 : CircleDashed;
            return (
              <div
                key={stepLabel}
                className={`flex items-center gap-2.5 text-xs ${
                  isDone
                    ? "text-studio-success"
                    : isCurrent
                      ? "text-studio-text"
                      : "text-studio-faint"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? "animate-spin text-studio-accent" : ""}`}
                  aria-hidden="true"
                />
                <span>{stepLabel}</span>
                {isCurrent ? (
                  <Sparkles className="h-3 w-3 text-studio-accent" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function BusyLabel({ label = "Running…" }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-studio-muted">
      <RotateCw className="h-3.5 w-3.5 animate-spin text-studio-accent" aria-hidden="true" />
      {label}
    </span>
  );
}