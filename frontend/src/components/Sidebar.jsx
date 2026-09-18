import { FolderGit2, FileCode2, LogOut, CloudCog } from "lucide-react";
import { fileNames } from "../data/sampleFiles";
import { logout } from "../services/api";
import { useDeployMateStore } from "../store/useDeployMateStore";

export function Sidebar({ projects, awsConnections, securityFindings, isLoading }) {
  const selectedProjectId = useDeployMateStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useDeployMateStore((state) => state.setSelectedProjectId);
  const activeFile = useDeployMateStore((state) => state.activeFile);
  const setActiveFile = useDeployMateStore((state) => state.setActiveFile);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const setUser = useDeployMateStore((state) => state.setUser);

  async function handleLogout() {
    await logout().catch(() => {});
    setUser(null);
  }

  return (
    <aside className="studio-scrollbar flex min-h-0 flex-col overflow-auto border-r border-studio-line bg-studio-panel">
      <div className="border-b border-studio-line p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-neutral-500">
          <FolderGit2 className="h-4 w-4" aria-hidden="true" />
          Projects
        </div>
        <div className="space-y-1">
          {isLoading ? (
            <p className="text-xs text-neutral-500">Loading…</p>
          ) : projects.length === 0 ? (
            <button
              type="button"
              onClick={() => setActiveView("projects")}
              className="w-full border border-dashed border-studio-line px-2 py-2 text-left text-xs text-neutral-500 hover:bg-white"
            >
              No projects yet — create one
            </button>
          ) : (
            projects.map((project) => (
              <button
                key={project.projectId}
                type="button"
                onClick={() => setSelectedProjectId(project.projectId)}
                className={`w-full border px-2 py-2 text-left text-xs ${
                  selectedProjectId === project.projectId
                    ? "border-studio-teal bg-white"
                    : "border-transparent hover:border-studio-line hover:bg-white"
                }`}
              >
                <span className="block truncate font-medium">{project.name}</span>
                <span className="block truncate text-neutral-500">
                  {project.repoOwner}/{project.repoName}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="border-b border-studio-line p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-neutral-500">
          <FileCode2 className="h-4 w-4" aria-hidden="true" />
          Files
        </div>
        <div className="space-y-1">
          {fileNames.map((file) => (
            <button
              key={file}
              type="button"
              onClick={() => {
                setActiveFile(file);
                setActiveView("code");
              }}
              className={`block w-full truncate px-2 py-1.5 text-left text-xs ${
                activeFile === file ? "bg-studio-ink text-white" : "hover:bg-white"
              }`}
            >
              {file}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-studio-line p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-neutral-500">
          <CloudCog className="h-4 w-4" aria-hidden="true" />
          AWS
        </div>
        <button
          type="button"
          onClick={() => setActiveView("aws")}
          className="w-full border border-studio-line bg-white px-2 py-2 text-left text-xs hover:border-studio-teal"
        >
          {awsConnections.length > 0
            ? `${awsConnections.length} connection(s) — ${awsConnections[0].region}`
            : "Connect an AWS role"}
        </button>
      </div>

      <div className="mt-auto border-t border-studio-line p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-neutral-500">Findings</span>
          <strong>{securityFindings.length}</strong>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-8 w-full items-center justify-center gap-2 border border-studio-line bg-white text-xs hover:border-studio-rose hover:text-studio-rose"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
