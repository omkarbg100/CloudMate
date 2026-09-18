import { Check, Circle, Loader2, TriangleAlert, X, GitBranch } from "lucide-react";
import { toneClasses } from "../../lib/status";

const STATE_ICON = {
  success: Check,
  warning: TriangleAlert,
  danger: X,
  analyzing: Loader2,
  running: Loader2,
  deploying: Loader2,
  generating: Loader2,
};

export function LifecycleTimeline({ stages }) {
  return (
    <ol className="space-y-2">
      {stages.map((stage) => {
        const t = toneClasses(stage.state);
        const Icon = STATE_ICON[stage.state] ?? Circle;
        const spinning = ["analyzing", "running", "deploying", "generating"].includes(stage.state);
        return (
          <li key={stage.key} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${t.border} ${t.bg}`}>
              <Icon className={`h-3.5 w-3.5 ${t.text} ${spinning ? "animate-spin" : ""}`} aria-hidden="true" />
            </span>
            <span className="w-28 shrink-0 text-[13px] font-medium text-studio-text">{stage.label}</span>
            <span className={`min-w-0 flex-1 truncate text-xs ${stage.state === "not_started" ? "text-studio-faint" : "text-studio-muted"}`}>
              {stage.line}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DeploymentPipeline({ steps = [], currentStep, status }) {
  const done = status === "SUCCESS" || status === "DEPLOYED" || status === "success";
  const doneIndex = done ? steps.length - 1 : Math.max(
    currentStep ? steps.findIndex((s) => String(s).toLowerCase() === String(currentStep).toLowerCase()) : -1,
    0
  );

  return (
    <ol className="space-y-2">
      {steps.map((step, index) => {
        const isDone = index < doneIndex;
        const isCurrent = index === doneIndex && !done;
        const t = isDone
          ? toneClasses("success")
          : isCurrent
            ? toneClasses("running")
            : toneClasses("not_started");
        return (
          <li key={step} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${t.border} ${isCurrent ? `${t.bg} animate-pulse` : t.bg}`}>
              {isDone ? (
                <Check className={`h-3.5 w-3.5 ${t.text}`} aria-hidden="true" />
              ) : isCurrent ? (
                <Loader2 className={`h-3.5 w-3.5 animate-spin ${t.text}`} aria-hidden="true" />
              ) : (
                <Circle className={`h-2 w-2 ${t.text}`} aria-hidden="true" />
              )}
            </span>
            <span className={`text-[13px] ${isDone ? "text-studio-text" : isCurrent ? "font-medium text-studio-text" : "text-studio-faint"}`}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PipelineIcon({ state, className }) {
  const t = toneClasses(state);
  const Icon = STATE_ICON[state] ?? Circle;
  const spinning = ["analyzing", "running", "deploying", "generating"].includes(state);
  return (
    <Icon className={`h-3.5 w-3.5 ${t.text} ${className ?? ""} ${spinning ? "animate-spin" : ""}`} aria-hidden="true" />
  );
}