import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "../ui/Button";

/**
 * Explicit, deliberate approval gate. Deployment is never one casual click.
 */
export function ApprovalCard({
  title = "Ready for deployment",
  description = "This action will create, update and modify resources in your AWS account.",
  checklistLabel = "I have reviewed the deployment plan and understand the impact.",
  onApprove,
  approving = false,
  disabled = false,
  extra,
}) {
  const [checked, setChecked] = useState(false);
  const canApprove = checked && !disabled;

  return (
    <div className="overflow-hidden rounded-lg border border-studio-line2 bg-studio-panel">
      <div className="border-b border-studio-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-studio-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-studio-text">{title}</h3>
        </div>
        <p className="mt-1 text-xs leading-5 text-studio-muted">{description}</p>
      </div>
      <div className="px-4 py-3">
        {extra ? <div className="mb-3">{extra}</div> : null}
        <label className="flex items-start gap-2.5 text-xs text-studio-muted">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-studio-accent"
          />
          <span className="leading-5">{checklistLabel}</span>
        </label>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" size="md" onClick={onApprove} disabled={!canApprove} isLoading={approving} loadingLabel="Deploying…">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Approve &amp; Deploy
          </Button>
        </div>
      </div>
    </div>
  );
}