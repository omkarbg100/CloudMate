import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

export default function ErrorBox({ message, onRetry }) {
  return (
    <div className="card border-red-500/30 bg-red-500/5 text-center space-y-4 py-8">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="text-red-400" size={22} />
        </div>
      </div>
      <div>
        <p className="font-medium text-white">Something went wrong</p>
        <p className="text-sm text-surface-200 mt-1">{message || 'An unexpected error occurred.'}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          <RefreshCw size={13} />
          Try Again
        </Button>
      )}
    </div>
  )
}
