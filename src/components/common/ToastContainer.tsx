import { useToast } from '@/store'
import { Toast } from '@/types'
import { cn } from '@/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const icons = {
  success: <CheckCircle className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  info: <Info className="h-4 w-4 text-info" />,
}

const toastBg: Record<Toast['type'], string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-white border border-surface-border border-l-4 rounded-xl shadow-dialog',
        'px-4 py-3 min-w-[280px] max-w-sm w-full animate-slide-up',
        toastBg[toast.type]
      )}
      role="alert"
    >
      <span className="mt-0.5 flex-shrink-0">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
