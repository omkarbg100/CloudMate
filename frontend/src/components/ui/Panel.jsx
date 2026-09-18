export function Panel({ title, actions, children, className = "", bodyClassName = "", icon: Icon }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-studio-line bg-studio-panel ${className}`}>
      {title ? (
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-studio-line px-3">
          <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-studio-muted">
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            <span className="truncate">{title}</span>
          </div>
          {actions}
        </header>
      ) : null}
      <div className={`min-h-0 flex-1 ${bodyClassName ?? "p-4"}`}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-wider text-studio-faint">{eyebrow}</p>
        ) : null}
        <h2 className="truncate text-lg font-semibold text-studio-text">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-studio-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-studio-faint">{children}</p>
  );
}