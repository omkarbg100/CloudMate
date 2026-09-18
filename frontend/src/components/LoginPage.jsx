import { useState } from "react";
import { Github, FlaskConical, ShieldAlert } from "lucide-react";
import { loginDemo, loginWithGitHub } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export function LoginPage() {
  const setUser = useDeployMateStore((state) => state.setUser);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleDemo() {
    setBusy(true);
    setError("");
    try {
      const user = await loginDemo();
      setUser(user);
    } catch (err) {
      setError(err.message ?? "Demo login failed. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-studio-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-studio-line2 bg-studio-panel">
            <span className="text-lg font-black tracking-tight text-studio-accent">DM</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-studio-text">DeployMate Studio</h1>
          <p className="mt-1 text-sm text-studio-muted">AI-powered cloud deployment workspace</p>
        </div>

        <div className="rounded-lg border border-studio-line bg-studio-panel p-6">
          <h2 className="text-base font-semibold text-studio-text">Sign in</h2>
          <p className="mt-1 text-sm text-studio-muted">
            Connect GitHub to reach your repositories, or continue in demo mode.
          </p>

          <button
            type="button"
            onClick={loginWithGitHub}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2.5 rounded-md bg-studio-text text-studio-bg text-sm font-semibold transition-colors hover:bg-white"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Continue with GitHub
          </button>

          <button
            type="button"
            onClick={handleDemo}
            disabled={busy}
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-studio-line2 text-sm font-medium text-studio-text transition-colors hover:border-studio-faint hover:bg-studio-panel2 disabled:opacity-60"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            {busy ? "Signing in…" : "Continue in demo mode"}
          </button>

          {error ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-1.5">
            {[
              "Analyze repositories",
              "Generate AWS architecture",
              "Security scanning",
              "Approval-gated deploy",
            ].map((feature) => (
              <div key={feature} className="rounded-md border border-studio-line bg-studio-inset px-2.5 py-2 text-[11px] text-studio-muted">
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-studio-faint">
          DeployMate assumes an IAM role — permanent AWS access keys are never requested.
        </p>
      </div>
    </div>
  );
}