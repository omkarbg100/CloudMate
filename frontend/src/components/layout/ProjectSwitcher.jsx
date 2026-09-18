import { useState } from "react";
import { Check, ChevronsUpDown, GitBranch, Boxes } from "lucide-react";
import { useDeployMateStore } from "../../store/useDeployMateStore";
import { Badge } from "../ui/Badge";

export function ProjectSwitcher({ projects }) {
  const selectedProjectId = useDeployMateStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useDeployMateStore((state) => state.setSelectedProjectId);
  const setActiveView = useDeployMateStore((state) => state.setActiveView);
  const [open, setOpen] = useState(false);

  const active = projects.find((p) => p.projectId === selectedProjectId) ?? projects[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-md border border-studio-line2 bg-studio-panel px-2.5 py-2 text-left hover:border-studio-faint"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-studio-accent/15 text-studio-accentHi">
          <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-studio-text">
            {active?.name ?? "No project"}
          </p>
          <p className="flex items-center gap-1 truncate text-[11px] text-studio-faint">
            <GitBranch className="h-3 w-3" aria-hidden="true" />
            {active ? `${active.branch} · ${active.awsRegion ?? "no region"}` : "Create a project"}
          </p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-studio-faint" aria-hidden="true" />
      </button>

      {open && projects.length > 0 ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-studio-line2 bg-studio-panel shadow-modal">
            <div className="studio-scrollbar max-h-56 overflow-auto p-1">
              {projects.map((project) => {
                const selected = project.projectId === (active?.projectId);
                return (
                  <button
                    key={project.projectId}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.projectId);
                      setOpen(false);
                      setActiveView("overview");
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-studio-panel2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-studio-text">{project.name}</p>
                      <p className="truncate text-[11px] text-studio-faint">
                        {project.repoOwner}/{project.repoName}
                      </p>
                    </div>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-studio-accent" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-studio-line p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setActiveView("projects");
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs text-studio-accentHi hover:bg-studio-panel2"
              >
                + New project
              </button>
            </div>
          </div>
        </>
      ) : null}

      {open && projects.length === 0 ? null : null}
      {!open && projects.length > 0 ? (
        <div className="mt-1 px-1">
          <Badge tone="muted">{active?.repoOwner}/{active?.repoName}</Badge>
        </div>
      ) : null}
    </div>
  );
}