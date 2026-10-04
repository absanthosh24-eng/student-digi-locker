import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Toast } from '@/types'

// ============================================================
// CONTEXT TYPE
// ============================================================

interface ToastContextType {
  /** Current list of active toasts, in insertion order. */
  toasts: Toast[]
  /** Add a new toast. An `id` is generated automatically. Returns the new id. */
  addToast: (toast: Omit<Toast, 'id'>) => string
  /** Immediately dismiss a toast by its id. */
  removeToast: (id: string) => void
  // ── Convenience helpers ───────────────────────────────────
  showSuccess: (title: string, message?: string, duration?: number) => string
  showError: (title: string, message?: string, duration?: number) => string
  showWarning: (title: string, message?: string, duration?: number) => string
  showInfo: (title: string, message?: string, duration?: number) => string
}

// ============================================================
// CONTEXT
// ============================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_DURATION_MS = 4000
const MAX_TOASTS = 5

// ============================================================
// PROVIDER
// ============================================================

interface ToastProviderProps {
  children: ReactNode
  /** Override the default auto-dismiss duration for all toasts (milliseconds). */
  defaultDuration?: number
}

export function ToastProvider({
  children,
  defaultDuration = DEFAULT_DURATION_MS,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Map of toast id -> timeout handle so we can cancel timers on manual dismiss.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Cancel the auto-dismiss timer if it hasn't fired yet.
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newToast: Toast = { ...toast, id }

      setToasts((prev) => {
        // Enforce a max cap – drop the oldest entry if we are at the limit.
        const list = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
        return [...list, newToast]
      })

      // Schedule auto-dismiss.
      const duration = toast.duration ?? defaultDuration
      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id)
        }, duration)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [defaultDuration, removeToast],
  )

  // ── Convenience helpers ─────────────────────────────────────

  const showSuccess = useCallback(
    (title: string, message?: string, duration?: number): string =>
      addToast({ type: 'success', title, message, duration }),
    [addToast],
  )

  const showError = useCallback(
    (title: string, message?: string, duration?: number): string =>
      addToast({ type: 'error', title, message, duration }),
    [addToast],
  )

  const showWarning = useCallback(
    (title: string, message?: string, duration?: number): string =>
      addToast({ type: 'warning', title, message, duration }),
    [addToast],
  )

  const showInfo = useCallback(
    (title: string, message?: string, duration?: number): string =>
      addToast({ type: 'info', title, message, duration }),
    [addToast],
  )

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

/**
 * Returns the toast context.
 * Must be used inside <ToastProvider>.
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
