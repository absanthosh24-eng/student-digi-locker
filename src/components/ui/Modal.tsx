import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from '@/components/ui'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlay?: boolean
  className?: string
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

export default function Modal({
  isOpen, onClose, title, description, children,
  size = 'md', closeOnOverlay = true, className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (closeOnOverlay && e.target === overlayRef.current) onClose() }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" />

      {/* Dialog */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-dialog animate-scale-in',
          sizeMap[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-surface-border">
            <div>
              {title && <h2 id="modal-title" className="text-h3 text-gray-900">{title}</h2>}
              {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors z-10"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── ConfirmationDialog ────────────────────────────────────────────────────────

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  description: string
  consequence?: string
  primaryLabel: string
  secondaryLabel?: string
  primaryVariant?: 'danger' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  isOpen, title, description, consequence,
  primaryLabel, secondaryLabel = 'Cancel',
  primaryVariant = 'danger', isLoading, onConfirm, onCancel,
}: ConfirmationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm" closeOnOverlay={!isLoading}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        {consequence && (
          <div className="flex items-start gap-2 bg-warning-muted border border-yellow-200 rounded-lg px-3 py-2.5">
            <span className="text-warning text-sm mt-0.5">⚠</span>
            <p className="text-xs text-yellow-800 leading-relaxed">{consequence}</p>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={isLoading}>
            {secondaryLabel}
          </Button>
          <Button variant={primaryVariant} fullWidth onClick={onConfirm} isLoading={isLoading}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
