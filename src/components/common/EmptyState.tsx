import { Button } from '@/components/ui'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({
  icon, title, description, action, secondaryAction, className
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className ?? ''}`}>
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 border border-surface-border">
        {icon}
      </div>
      <h3 className="text-h3 text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">{description}</p>
      {action && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button onClick={action.onClick} variant="primary" size="sm">{action.label}</Button>
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
