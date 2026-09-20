import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white border-transparent shadow-lg shadow-brand-600/20',
  secondary: 'bg-surface-700 hover:bg-surface-600 text-white border-surface-500',
  ghost: 'bg-transparent hover:bg-surface-700 text-surface-100 border-transparent',
  danger: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/30',
  outline: 'bg-transparent hover:bg-brand-600/10 text-brand-400 border-brand-500/50 hover:border-brand-500',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5',
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
        transition-all duration-150 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && <Loader2 className="animate-spin" size={size === 'lg' ? 18 : 15} />}
      {children}
    </button>
  )
}
