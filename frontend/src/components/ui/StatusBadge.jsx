// Status badge configuration
const STATUS_CONFIG = {
  created:                { label: 'Created',               color: 'bg-surface-700/80 text-surface-200 border-surface-600',       dot: 'bg-surface-400' },
  analyzing:              { label: 'Analyzing',             color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',         dot: 'bg-amber-400 animate-pulse' },
  analyzed:               { label: 'Analyzed',              color: 'bg-sky-500/10 text-sky-300 border-sky-500/30',               dot: 'bg-sky-400' },
  architecture_generated: { label: 'Architecture Ready',    color: 'bg-brand-500/15 text-brand-300 border-brand-500/30 shadow-brand-500/10', dot: 'bg-brand-400' },
  deployment_ready:       { label: 'Deployment Ready',      color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',   dot: 'bg-emerald-400' },
  deploying:              { label: 'Deploying',             color: 'bg-orange-500/10 text-orange-300 border-orange-500/30',     dot: 'bg-orange-400 animate-pulse' },
  deployed:               { label: 'Deployed',              color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',   dot: 'bg-emerald-400' },
  failed:                 { label: 'Failed',                color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',            dot: 'bg-rose-400' },
}

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.created

  return (
    <span className={`badge ${config.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
