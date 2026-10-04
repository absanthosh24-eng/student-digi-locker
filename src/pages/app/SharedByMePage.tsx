import { useState, useEffect } from 'react'
import { Share2 } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { getSharedByMe, revokeShare } from '@/services/sharing.service'
import { ShareRecord } from '@/types'
import { Badge, Button } from '@/components/ui'
import EmptyState from '@/components/common/EmptyState'
import { formatDate, cn } from '@/utils'
import { FileRowSkeleton } from '@/components/ui/Skeleton'
import { ConfirmationDialog } from '@/components/ui/Modal'

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const },
  expired: { label: 'Expired', variant: 'warning' as const },
  revoked: { label: 'Revoked', variant: 'danger' as const },
}

export default function SharedByMePage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [shareToRevoke, setShareToRevoke] = useState<ShareRecord | null>(null)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    if (!user) return
    getSharedByMe(user.uid).then(setShares).finally(() => setLoading(false))
  }, [user])

  const handleRevoke = async () => {
    if (!shareToRevoke || !user) return
    setRevoking(true)
    try {
      await revokeShare(user.uid, shareToRevoke.id)
      showSuccess('Access revoked')
      setShares(prev => prev.map(s => s.id === shareToRevoke.id ? { ...s, status: 'revoked' } : s))
      setShareToRevoke(null)
    } catch { showError('Failed to revoke') }
    finally { setRevoking(false) }
  }

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-h1 text-gray-900">Shared By Me</h1>
        <p className="text-sm text-gray-500 mt-0.5">Files you have shared with others</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-surface-border divide-y">
          {[...Array(3)].map((_, i) => <FileRowSkeleton key={i} />)}
        </div>
      ) : shares.length === 0 ? (
        <EmptyState
          icon={<Share2 className="h-6 w-6" />}
          title="You haven't shared any files"
          description="When you share a file with someone, it will appear here. You can revoke access anytime."
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-muted border-b">
            <p className="flex-1 text-xs font-medium text-gray-500">File</p>
            <p className="hidden sm:block text-xs font-medium text-gray-500 w-28">Shared With</p>
            <p className="hidden md:block text-xs font-medium text-gray-500 w-20">Status</p>
            <p className="hidden lg:block text-xs font-medium text-gray-500 w-24">Expires</p>
            <div className="w-16 flex-shrink-0" />
          </div>
          <div className="divide-y divide-surface-border">
            {shares.map(share => {
              const cfg = statusConfig[share.status]
              return (
                <div key={share.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{share.fileName}</p>
                    <p className="text-xs text-gray-400">{share.shareType === 'link' ? 'Secure link' : 'Account share'}</p>
                  </div>
                  <p className="hidden sm:block text-xs text-gray-500 w-28 truncate">
                    {share.recipientEmail ?? 'Link share'}
                  </p>
                  <div className="hidden md:block w-20">
                    <Badge variant={cfg.variant} dot className="text-[0.6rem]">{cfg.label}</Badge>
                  </div>
                  <p className="hidden lg:block text-xs text-gray-400 w-24">
                    {share.expiresAt ? formatDate(share.expiresAt) : 'Never'}
                  </p>
                  <div className="w-16 flex-shrink-0 flex justify-end">
                    {share.status === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => setShareToRevoke(share)}
                        className="text-danger hover:bg-danger-muted text-xs px-2">
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!shareToRevoke}
        title="Revoke Access"
        description={`Revoke sharing access for "${shareToRevoke?.fileName}"?`}
        consequence="The recipient will immediately lose access to this file."
        primaryLabel="Revoke Access"
        isLoading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setShareToRevoke(null)}
      />
    </div>
  )
}
