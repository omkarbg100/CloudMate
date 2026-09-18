import { formatTime } from "../utils/format";

function Card({ label, value, hint }) {
  return (
    <div className="border border-studio-line bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-studio-ink">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default function DashboardView({ project, analysis, architecture, security, events, projects }) {
  const criticalCount = security?.summary?.critical ?? 0;

  return (
    <div className="studio-scrollbar h-full overflow-auto bg-[#f3f2ee] p-5">
      <h2 className="mb-1 text-lg font-semibold">Dashboard</h2>
      <p className="mb-5 text-sm text-neutral-500">
        {project ? `${project.repoOwner}/${project.repoName} on ${project.branch}` : "No project selected"}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Projects" value={projects.length} hint="isolated per user" />
        <Card label="Project status" value={project?.status ?? "—"} hint={project?.url ? "deployed" : "not deployed"} />
        <Card label="Critical findings" value={criticalCount} hint={`${security?.findings?.length ?? 0} total findings`} />
        <Card
          label="Architecture nodes"
          value={architecture?.nodes?.length ?? 0}
          hint={architecture?.region ?? "not generated"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="border border-studio-line bg-white">
          <header className="border-b border-studio-line px-4 py-2 text-xs font-semibold uppercase text-neutral-500">
            Repository analysis
          </header>
          <div className="space-y-2 p-4 text-sm">
            {analysis ? (
              <>
                <Row label="Languages" value={(analysis.languages ?? []).join(", ") || "—"} />
                <Row label="Backend" value={analysis.backend?.framework ?? "—"} />
                <Row label="Frontend" value={analysis.frontend?.framework ?? "—"} />
                <Row label="Database" value={analysis.database ?? "—"} />
                <Row label="Docker" value={analysis.docker ? "yes" : "no"} />
                <Row label="Ports" value={(analysis.ports ?? []).join(", ") || "—"} />
              </>
            ) : (
              <p className="text-neutral-500">Run repository analysis to populate this section.</p>
            )}
          </div>
        </section>

        <section className="border border-studio-line bg-white">
          <header className="border-b border-studio-line px-4 py-2 text-xs font-semibold uppercase text-neutral-500">
            Recent activity
          </header>
          <div className="studio-scrollbar max-h-72 overflow-auto p-4 text-xs">
            {events.length === 0 ? (
              <p className="text-neutral-500">No events yet. Actions will stream here in real time.</p>
            ) : (
              <ul className="space-y-2">
                {[...events].reverse().map((event, index) => (
                  <li key={`${event.timestamp}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-studio-teal" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-studio-ink">{event.type}</p>
                      <p className="truncate text-neutral-500">{event.message ?? "—"}</p>
                      <p className="text-[11px] text-neutral-400">{formatTime(event.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-studio-line pb-1 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
