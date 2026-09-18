import {
  LayoutGrid,
  Boxes,
  MessagesSquare,
  Network,
  ShieldCheck,
  FileDiff,
  ClipboardCheck,
  Rocket,
  Terminal,
  Activity,
  TriangleAlert,
  CloudCog,
  Settings,
  LogOut,
} from "lucide-react";
import { useDeployMateStore } from "../../store/useDeployMateStore";
import { logout } from "../../services/api";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { ConnectionDot, Dot } from "../ui/Badge";

const NAV = [
  {
    section: "Workspace",
    items: [
      { id: "overview", label: "Overview", icon: LayoutGrid },
      { id: "repository", label: "Repository", icon: Boxes },
      { id: "assistant", label: "AI Assistant", icon: MessagesSquare },
    ],
  },
  {
    section: "Analyze",
    items: [
      { id: "architecture", label: "Architecture", icon: Network },
      { id: "security", label: "Security", icon: ShieldCheck },
      { id: "changes", label: "Changes", icon: FileDiff },
      { id: "validation", label: "Validation", icon: ClipboardCheck },
    ],
  },
  {
    section: "Deploy",
    items: [
      { id: "deployment", label: "Deployment", icon: Rocket },
      { id: "logs", label: "Logs", icon: Terminal },
    ],
  },
  {
    section: "Operate",
    items: [
      { id: "monitoring", label: "Monitoring", icon: Activity },
      { id: "incidents", label: "Incidents", icon: TriangleAlert },
    ],
  },
];

const BOTTOM = [
  { id: "aws", label: "Settings", icon: Settings },
];

export function Sidebar({ projects, awsConnections, githubAvailable, hasIncidents, securityFindings = 0, isLoading }) {
  const activeView = useDeployMateStore((state) => state.activeView);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const user = useDeployMateStore((state) => state.user);
  const setUser = useDeployMateStore((state) => state.setUser);

  const awsConnected = awsConnections.some((c) => c.status !== "failed");

  async function handleSignOut() {
    await logout().catch(() => {});
    setUser(null);
  }

  return (
    <aside className="studio-scrollbar flex min-h-0 w-60 shrink-0 flex-col overflow-auto border-r border-studio-line bg-studio-panel">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-studio-line px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-studio-accent text-[11px] font-black text-white">
          D
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-semibold text-studio-text">DeployMate Studio</p>
          <p className="text-[10px] uppercase tracking-wider text-studio-faint">AI DevOps workspace</p>
        </div>
      </div>

      {/* Project */}
      <div className="border-b border-studio-line p-3">
        <ProjectSwitcher projects={projects} />
      </div>

      {/* Navigation */}
      <nav className="studio-scrollbar min-h-0 flex-1 overflow-auto py-2">
        {NAV.map((group) => (
          <div key={group.section} className="mb-3">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-studio-faint">
              {group.section}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
                      isActive
                        ? "border-studio-accent bg-studio-accent/10 text-studio-text"
                        : "border-transparent text-studio-muted hover:bg-studio-panel2 hover:text-studio-text"
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-studio-accentHi" : "text-studio-faint"}`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.id === "incidents" && hasIncidents ? (
                      <Dot tone="danger" className="h-1.5 w-1.5" />
                    ) : null}
                    {item.id === "security" && securityFindings > 0 ? (
                      <span className="rounded-sm bg-amber-400/10 px-1 text-[10px] font-semibold text-amber-400">
                        {securityFindings}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: connection status + user */}
      <div className="shrink-0 border-t border-studio-line p-2">
        <button
          type="button"
          onClick={() => setActiveView("aws")}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-studio-muted hover:bg-studio-panel2"
        >
          <CloudCog className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          <span className="flex-1">AWS</span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <ConnectionDot connected={awsConnected} />
            {awsConnected ? "Connected" : "Not connected"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("repository")}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-studio-muted hover:bg-studio-panel2"
        >
          <Boxes className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          <span className="flex-1">GitHub</span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <ConnectionDot connected={githubAvailable} />
            {githubAvailable ? "Connected" : "Not connected"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView("settings")}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-studio-muted hover:bg-studio-panel2"
        >
          <Settings className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
          <span className="flex-1">Settings</span>
        </button>

        <div className="mt-2 flex items-center gap-2 rounded border-t border-studio-line pt-2">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-6 w-6 rounded-full border border-studio-line2" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-studio-panel2 text-[10px] font-semibold text-studio-muted">
              {(user?.username ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-studio-text">{user?.username}</span>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="flex h-6 w-6 items-center justify-center rounded text-studio-faint hover:bg-studio-panel2 hover:text-studio-danger"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}