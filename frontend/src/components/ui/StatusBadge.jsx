// Status badge configuration
const STATUS_CONFIG = {
  created:                { label: 'Created',               color: 'bg-surface-600 text-surface-100',     dot: 'bg-surface-300' },
  analyzing:              { label: 'Analyzing',             color: 'bg-amber-500/15 text-amber-400',      dot: 'bg-amber-400 animate-pulse' },
  analyzed:               { label: 'Analyzed',              color: 'bg-blue-500/15 text-blue-400',        dot: 'bg-blue-400' },
  architecture_generated: { label: 'Architecture Ready',    color: 'bg-brand-600/15 text-brand-400',     dot: 'bg-brand-400' },
  deployment_ready:       { label: 'Deployment Ready',      color: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
  deploying:              { label: 'Deploying',             color: 'bg-orange-500/15 text-orange-400',   dot: 'bg-orange-400 animate-pulse' },
  deployed:               { label: 'Deployed',              color: 'bg-green-500/15 text-green-400',     dot: 'bg-green-400' },
  failed:                 { label: 'Failed',                color: 'bg-red-500/15 text-red-400',         dot: 'bg-red-400' },
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
