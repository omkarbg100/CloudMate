import {
  Activity,
  CloudCog,
  ClipboardCheck,
  Code2,
  FolderGit2,
  LayoutDashboard,
  MessageSquare,
  Network,
  Rocket,
  ShieldCheck,
  Terminal,
  BookOpen,
} from "lucide-react";
import { VIEWS, useDeployMateStore } from "../store/useDeployMateStore";

const ICONS = {
  dashboard: LayoutDashboard,
  projects: FolderGit2,
  repository: BookOpen,
  chat: MessageSquare,
  code: Code2,
  architecture: Network,
  security: ShieldCheck,
  validation: ClipboardCheck,
  deployment: Rocket,
  logs: Terminal,
  monitoring: Activity,
  aws: CloudCog,
};

export function ActivityBar() {
  const activeView = useDeployMateStore((state) => state.activeView);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);

  return (
    <nav className="flex flex-col items-center gap-1 border-r border-gray-800 bg-gray-900 py-2">
      {VIEWS.map((view) => {
        const Icon = ICONS[view.id];
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            title={view.label}
            onClick={() => setActiveView(view.id)}
            className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
              isActive
                ? "bg-teal-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
