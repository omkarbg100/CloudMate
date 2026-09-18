import { Bell, ChevronRight, CloudCog, GitBranch, Boxes } from "lucide-react";
import { useDeployMateStore } from "../../store/useDeployMateStore";
import { Segmented } from "../ui/Tabs";
import { ConnectionDot } from "../ui/Badge";

const ENVIRONMENTS = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export function TopBar({ project, awsConnections, githubAvailable, unreadEvents }) {
  const activeView = useDeployMateStore((state) => state.activeView);
  const environment = useDeployMateStore((state) => state.environment);
  const setEnvironment = useDeployMateStore((state) => state.setEnvironment);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const user = useDeployMateStore((state) => state.user);

  const awsConnection = awsConnections.find((c) => c.status === "connected") ?? awsConnections[0];

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-studio-line bg-studio-panel px-4">
      {/* Breadcrumb */}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-xs text-studio-muted" aria-label="Breadcrumb">
        <button type="button" onClick={() => setActiveView("projects")} className="hover:text-studio-text">
          Projects
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setActiveView("overview")}
          className="truncate font-medium text-studio-text hover:text-studio-accentHi"
        >
          {project?.name ?? "No project"}
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" />
        <span className="capitalize text-studio-faint">{activeView}</span>
      </nav>

      {/* Environment selector */}
      <Segmented options={ENVIRONMENTS} value={environment} onChange={setEnvironment} />

      {/* AWS */}
      <button
        type="button"
        onClick={() => setActiveView("aws")}
        className="flex h-7 items-center gap-1.5 rounded-md border border-studio-line px-2 text-[11px] text-studio-muted hover:border-studio-faint"
        title={awsConnection?.roleArn ?? "No AWS account connected"}
      >
        <CloudCog className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" />
        <ConnectionDot connected={awsConnection?.status !== "failed"} />
        <span className="font-mono">
          {awsConnection?.accountId ?? awsConnection?.status === "failed" ? "AWS" : awsConnection?.region ?? "AWS"}
        </span>
      </button>

      {/* GitHub */}
      <button
        type="button"
        onClick={() => setActiveView("repository")}
        className="flex h-7 items-center gap-1.5 rounded-md border border-studio-line px-2 text-[11px] text-studio-muted hover:border-studio-faint"
        title="GitHub connection"
      >
        <Boxes className="h-3.5 w-3.5 text-studio-faint" aria-hidden="true" />
        <ConnectionDot connected={githubAvailable} />
        <span>{githubAvailable ? "GitHub" : "offline"}</span>
      </button>

      {/* Notifications */}
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded text-studio-muted hover:bg-studio-panel2 hover:text-studio-text"
        title="Event stream"
        onClick={() => setActiveView("logs")}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadEvents > 0 ? (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-studio-accent px-0.5 text-[9px] font-bold text-white">
            {unreadEvents > 9 ? "9+" : unreadEvents}
          </span>
        ) : null}
      </button>

      {/* Avatar */}
      {user?.avatar ? (
        <img src={user.avatar} alt={user.username} className="h-6 w-6 rounded-full border border-studio-line2" />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-studio-panel2 text-[10px] font-semibold text-studio-muted">
          {(user?.username ?? "?")[0]?.toUpperCase()}
        </div>
      )}
    </header>
  );
}