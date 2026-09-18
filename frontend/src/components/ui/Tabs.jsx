export function Tabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`h-7 rounded px-2.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-studio-panel2 text-studio-text"
                : "text-studio-muted hover:bg-studio-panel2/60 hover:text-studio-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange, size = "sm" }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-studio-line2 bg-studio-panel p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        const className =
          size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-xs";
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded ${className} font-medium transition-colors ${
              selected
                ? "bg-studio-accent/90 text-white"
                : "text-studio-muted hover:text-studio-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}