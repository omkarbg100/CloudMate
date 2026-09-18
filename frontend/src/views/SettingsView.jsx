import { useMutation } from "@tanstack/react-query";
import { Github, KeyRound, LogOut, Settings2, ShieldCheck, User as UserIcon } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Panel, PageHeader } from "../components/ui/Panel";
import { logout } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export default function SettingsView({ user, awsConnections }) {
  const setUser = useDeployMateStore((state) => state.setUser);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => setUser(null),
  });

  return (
    <div className="studio-scrollbar h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <PageHeader
          title="Settings"
          subtitle="Signed-in identity, connected accounts and workspace preferences."
        />

        <div className="mt-5 space-y-4">
          <Panel title="Profile">
            <div className="flex items-center gap-3 px-4 py-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-10 w-10 rounded-md border border-studio-line2" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2 text-studio-muted">
                  <UserIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-studio-text">{user?.name ?? user?.username ?? "Signed in"}</p>
                <p className="truncate font-mono text-xs text-studio-faint">{user?.email ?? user?.username ?? ""}</p>
              </div>
              <Badge tone="success">authenticated</Badge>
            </div>
            <div className="border-t border-studio-line px-4 py-3">
              <p className="text-xs leading-5 text-studio-muted">
                Session cookies keep you signed in. Sign out below to clear them.
              </p>
            </div>
          </Panel>

          <Panel title="Linked accounts">
            <div className="divide-y divide-studio-line">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2 text-studio-muted">
                  <Github className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-studio-text">GitHub</p>
                  <p className="text-[11px] text-studio-faint">Used for repository access</p>
                </div>
                <Badge tone="success">connected</Badge>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-studio-line2 bg-studio-panel2 text-studio-muted">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-studio-text">AWS</p>
                  <p className="text-[11px] text-studio-faint">Role-based access via STS</p>
                </div>
                {awsConnections.length > 0 ? (
                  <Badge tone="success">{awsConnections.length} connection{awsConnections.length > 1 ? "s" : ""}</Badge>
                ) : (
                  <Button variant="secondary" size="xs" onClick={() => setActiveView("aws")}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Security">
            <div className="px-4 py-3">
              <p className="flex items-start gap-2 text-xs leading-5 text-studio-muted">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-studio-accent" aria-hidden="true" />
                DeployMate never stores AWS access keys. IAM Role ARNs and External IDs are encrypted at rest and only
                assumed when you approve an action.
              </p>
            </div>
          </Panel>

          <Panel title="Danger zone">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-studio-muted">End this session on this device.</p>
              <Button variant="danger" isLoading={logoutMutation.isPending} loadingLabel="Signing out…" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}