import { Spinner } from '@/components/ui'

export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-surface-muted flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="h-7 w-7 text-primary" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#4F6EF7" />
            <path d="M8 10C8 8.9 8.9 8 10 8H18L24 14V22C24 23.1 23.1 24 22 24H10C8.9 24 8 23.1 8 22V10Z" fill="white" fillOpacity="0.9" />
            <path d="M18 8L24 14H18V8Z" fill="#4F6EF7" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">Student Digital Locker</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  )
}
