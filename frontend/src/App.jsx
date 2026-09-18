import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import {
  getAnalysis,
  getArchitecture,
  getAwsConnections,
  getMe,
  getProjects,
  getSecurity,
} from "./services/api";
import { connectProjectSocket } from "./services/ws";
import { useDeployMateStore } from "./store/useDeployMateStore";
import OverviewView from "./views/OverviewView";
import ProjectsView from "./views/ProjectsView";
import RepositoryView from "./views/RepositoryView";
import AssistantView from "./views/AssistantView";
import ArchitectureView from "./views/ArchitectureView";
import SecurityView from "./views/SecurityView";
import ChangesView from "./views/ChangesView";
import ValidationView from "./views/ValidationView";
import DeploymentView from "./views/DeploymentView";
import LogsView from "./views/LogsView";
import MonitoringView from "./views/MonitoringView";
import IncidentsView from "./views/IncidentsView";
import AwsConnectionView from "./views/AwsConnectionView";
import SettingsView from "./views/SettingsView";

export default function App() {
  const user = useDeployMateStore((state) => state.user);
  const isAuthenticated = useDeployMateStore((state) => state.isAuthenticated);
  const setUser = useDeployMateStore((state) => state.setUser);
  const selectedProjectId = useDeployMateStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useDeployMateStore((state) => state.setSelectedProjectId);
  const activeView = useDeployMateStore((state) => state.activeView);
  const events = useDeployMateStore((state) => state.events);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe, retry: false });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
    else if (meQuery.isError) setUser(null);
  }, [meQuery.data, meQuery.isError, setUser]);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!selectedProjectId && projectsQuery.data?.[0]) {
      setSelectedProjectId(projectsQuery.data[0].projectId);
    }
  }, [projectsQuery.data, selectedProjectId, setSelectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return undefined;
    return connectProjectSocket(selectedProjectId);
  }, [selectedProjectId]);

  const analysisQuery = useQuery({
    queryKey: ["analysis", selectedProjectId],
    queryFn: () => getAnalysis(selectedProjectId),
    enabled: isAuthenticated && Boolean(selectedProjectId),
  });
  const architectureQuery = useQuery({
    queryKey: ["architecture", selectedProjectId],
    queryFn: () => getArchitecture(selectedProjectId),
    enabled: isAuthenticated && Boolean(selectedProjectId),
  });
  const securityQuery = useQuery({
    queryKey: ["security", selectedProjectId],
    queryFn: () => getSecurity(selectedProjectId),
    enabled: isAuthenticated && Boolean(selectedProjectId),
  });
  const awsQuery = useQuery({
    queryKey: ["aws-connections"],
    queryFn: getAwsConnections,
    enabled: isAuthenticated,
  });

  if (meQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-studio-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-studio-accent border-t-transparent" />
          <p className="text-xs text-studio-muted">Loading DeployMate Studio…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const projects = projectsQuery.data ?? [];
  const awsConnections = awsQuery.data ?? [];
  const security = securityQuery.data;
  const activeProject =
    projects.find((project) => project.projectId === selectedProjectId) ?? projects[0];

  const shared = {
    user,
    project: activeProject,
    projectId: selectedProjectId,
    projects,
    analysis: analysisQuery.data,
    architecture: architectureQuery.data,
    security,
    awsConnections,
    events,
    validation: useDeployMateStore.getState().recentValidation,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-studio-bg text-studio-text">
      <Sidebar
        projects={projects}
        awsConnections={awsConnections}
        githubAvailable={Boolean(user)}
        hasIncidents={events.some((e) => ["FAILED", "INCIDENT", "MONITORING_ALERT"].some((t) => (e.type ?? "").includes(t)))}
        securityFindings={security?.findings?.filter((f) => ["critical", "high"].includes(f.severity)).length ?? 0}
        isLoading={projectsQuery.isLoading}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} project={activeProject} awsConnections={awsConnections} />
        <main className="min-h-0 flex-1 overflow-hidden">{renderView(activeView, shared)}</main>
      </div>
    </div>
  );
}

function renderView(view, props) {
  switch (view) {
    case "overview":
      return <OverviewView {...props} />;
    case "projects":
      return <ProjectsView {...props} />;
    case "repository":
      return <RepositoryView {...props} />;
    case "assistant":
      return <AssistantView {...props} />;
    case "architecture":
      return <ArchitectureView {...props} />;
    case "security":
      return <SecurityView {...props} />;
    case "changes":
      return <ChangesView {...props} />;
    case "validation":
      return <ValidationView {...props} />;
    case "deployment":
      return <DeploymentView {...props} />;
    case "logs":
      return <LogsView {...props} />;
    case "monitoring":
      return <MonitoringView {...props} />;
    case "incidents":
      return <IncidentsView {...props} />;
    case "aws":
      return <AwsConnectionView {...props} />;
    case "settings":
      return <SettingsView {...props} />;
    default:
      return <OverviewView {...props} />;
  }
}