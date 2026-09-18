import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-studio-accent text-white border border-transparent hover:bg-studio-accentHi disabled:opacity-50",
  secondary:
    "bg-transparent text-studio-text border-studio-line2 hover:border-studio-faint hover:bg-studio-panel2 disabled:opacity-50",
  ghost: "bg-transparent text-studio-muted border border-transparent hover:text-studio-text disabled:opacity-50",
  danger:
    "bg-transparent text-rose-400 border-studio-line2 hover:border-rose-400/40 hover:bg-rose-400/10 disabled:opacity-50",
};

const SIZES = {
  xs: "h-7 px-2 text-xs gap-1.5",
  sm: "h-8 px-3 text-xs gap-2",
  md: "h-9 px-4 text-sm gap-2",
};

export function Button({
  children,
  variant = "secondary",
  size = "sm",
  isLoading = false,
  loadingLabel,
  className = "",
  ...rest
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}