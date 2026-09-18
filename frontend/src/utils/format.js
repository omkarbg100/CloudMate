export function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function severityClasses(severity) {
  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-700 border-rose-300";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-300";
    default:
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
  }
}

export function statusClasses(status) {
  switch (status) {
    case "pass":
      return "text-emerald-600";
    case "fail":
      return "text-rose-600";
    default:
      return "text-neutral-500";
  }
}
