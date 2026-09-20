import { Server, Link2, Info, AlertTriangle, Globe } from 'lucide-react'

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-brand-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-surface-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function ArchitecturePanel({ architecture }) {
  if (!architecture) return null

  if (architecture.raw) {
    return (
      <div className="card space-y-3">
        <h2 className="font-semibold text-white">Architecture Output</h2>
        <pre className="code-block text-surface-200 whitespace-pre-wrap text-xs">{architecture.raw}</pre>
      </div>
    )
  }

  const { region, services = [], connections = [], rationale, warnings = [] } = architecture

  return (
    <div className="card space-y-6">
      <h2 className="font-semibold text-white">Architecture Details</h2>

      {/* Region */}
      {region && (
        <Section title="AWS Region" icon={Globe}>
          <p className="font-mono text-sm text-brand-400 bg-brand-600/10 px-3 py-1.5 rounded-lg inline-block">
            {region}
          </p>
        </Section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <Section title="AWS Services" icon={Server}>
          <div className="space-y-2">
            {services.map((svc, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface-700 rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 rounded-md bg-brand-600/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-brand-400 font-bold text-[10px]">
                    {svc.name?.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{svc.name}</p>
                  {svc.purpose && <p className="text-xs text-surface-200 mt-0.5">{svc.purpose}</p>}
                  {svc.decision && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block
                      ${svc.decision === 'create'  ? 'bg-green-500/15 text-green-400'  : ''}
                      ${svc.decision === 'reuse'   ? 'bg-blue-500/15 text-blue-400'   : ''}
                      ${svc.decision === 'modify'  ? 'bg-amber-500/15 text-amber-400' : ''}
                    `}>
                      {svc.decision}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <Section title="Connections" icon={Link2}>
          <div className="space-y-1.5">
            {connections.map((conn, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-200">
                <span className="font-mono text-xs bg-surface-700 px-2 py-0.5 rounded text-brand-300">{conn.from}</span>
                <span className="text-surface-400">→</span>
                <span className="font-mono text-xs bg-surface-700 px-2 py-0.5 rounded text-brand-300">{conn.to}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Rationale */}
      {rationale && (
        <Section title="Rationale" icon={Info}>
          <p className="text-sm text-surface-200 leading-relaxed">{rationale}</p>
        </Section>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Section title="Warnings" icon={AlertTriangle}>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">{w}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
