import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white border-brand-500/30 shadow-lg shadow-brand-600/25 hover:shadow-brand-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  secondary: 'bg-surface-700/90 hover:bg-surface-600 text-white border-surface-500/80 shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-surface-700/70 text-surface-100 border-transparent hover:text-white active:scale-[0.98]',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 active:scale-[0.98]',
  outline: 'bg-transparent hover:bg-brand-600/10 text-brand-300 border-brand-500/40 hover:border-brand-400 active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5 font-semibold',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && <Loader2 className="animate-spin" size={size === 'lg' ? 18 : 15} />}
      {children}
    </button>
  )
}
