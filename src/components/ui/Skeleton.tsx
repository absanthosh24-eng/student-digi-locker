import { cn } from '@/utils'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-lg', className)}
      style={{ width, height }}
    />
  )
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function FileCardSkeleton() {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function FileRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border last:border-0">
      <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
      <Skeleton className="h-3 flex-1 max-w-xs" />
      <Skeleton className="h-3 w-20 hidden md:block" />
      <Skeleton className="h-3 w-16 hidden lg:block" />
      <Skeleton className="h-3 w-24 hidden lg:block" />
      <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
    </div>
  )
}

export function DashboardStatSkeleton() {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-2.5 w-full" />
    </div>
  )
}
