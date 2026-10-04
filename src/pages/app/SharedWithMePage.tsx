import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '@/store'
import { getSharedWithMe } from '@/services/sharing.service'
import { ShareRecord } from '@/types'
import { Badge } from '@/components/ui'
import EmptyState from '@/components/common/EmptyState'
import { formatDate, cn } from '@/utils'
import { FileRowSkeleton } from '@/components/ui/Skeleton'

export default function SharedWithMePage() {
  const { user } = useAuth()
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !user.email) return
    getSharedWithMe(user.email).then(data => {
      const activeShares = data.filter(s => 
        s.status === 'active' && 
        (!s.expiresAt || s.expiresAt > new Date())
      )
      setShares(activeShares)
    }).finally(() => setLoading(false))
  }, [user])

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-h1 text-gray-900">Shared With Me</h1>
        <p className="text-sm text-gray-500 mt-0.5">Files others have shared with your account</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-surface-border divide-y">
          {[...Array(3)].map((_, i) => <FileRowSkeleton key={i} />)}
        </div>
      ) : shares.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Nothing shared with you yet"
          description="When someone shares a file with your account, it will appear here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-muted border-b border-surface-border">
            <p className="flex-1 text-xs font-medium text-gray-500">File</p>
            <p className="hidden sm:block text-xs font-medium text-gray-500 w-28">Shared By</p>
            <p className="hidden md:block text-xs font-medium text-gray-500 w-24">Permission</p>
            <p className="hidden lg:block text-xs font-medium text-gray-500 w-24">Date</p>
          </div>
          <div className="divide-y divide-surface-border">
            {shares.map(share => (
              <a href={`/share/${share.id}`} key={share.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors cursor-pointer group">
                <div className="w-8 h-8 bg-primary-muted rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">{share.fileName}</p>
                </div>
                <p className="hidden sm:block text-xs text-gray-500 w-28 truncate">
                  {share.ownerEmail ?? 'Unknown'}
                </p>
                <div className="hidden md:block w-24">
                  <Badge variant={share.permission === 'view_download' ? 'info' : 'muted'} className="text-[0.6rem]">
                    {share.permission === 'view_download' ? 'View + Download' : 'View Only'}
                  </Badge>
                </div>
                <p className="hidden lg:block text-xs text-gray-400 w-24">{formatDate(share.createdAt)}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
