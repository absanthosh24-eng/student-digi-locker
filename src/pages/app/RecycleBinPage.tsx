import { useState, useEffect } from 'react'
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { getRecycleBin, restoreFile, permanentlyDeleteFile } from '@/services/files.service'
import { LockerFile } from '@/types'
import { Button, Badge } from '@/components/ui'
import EmptyState from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/ui/Modal'
import { formatBytes, formatDate, formatDaysRemaining, getFileExtension, cn } from '@/utils'
import { FileRowSkeleton } from '@/components/ui/Skeleton'

export default function RecycleBinPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [files, setFiles] = useState<LockerFile[]>([])
  const [loading, setLoading] = useState(true)
  const [fileToDelete, setFileToDelete] = useState<LockerFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const loadBin = () => {
    if (!user) return
    setLoading(true)
    getRecycleBin(user.uid).then(setFiles).finally(() => setLoading(false))
  }

  useEffect(() => { loadBin() }, [user])

  const handleRestore = async (file: LockerFile) => {
    if (!user) return
    setRestoring(file.id)
    try {
      await restoreFile(user.uid, file.id)
      showSuccess('File restored', `"${file.name}" is back in your locker.`)
      loadBin()
    } catch { showError('Restore failed') }
    finally { setRestoring(null) }
  }

  const handlePermanentDelete = async () => {
    if (!fileToDelete || !user) return
    setDeleting(true)
    try {
      await permanentlyDeleteFile(user.uid, fileToDelete.id)
      showSuccess('File permanently deleted')
      loadBin()
      setFileToDelete(null)
    } catch { showError('Delete failed') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-gray-900">Recycle Bin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Files are permanently deleted after 30 days</p>
        </div>
      </div>

      {/* Warning banner */}
      {files.length > 0 && (
        <div className="flex items-start gap-2.5 bg-warning-muted border border-yellow-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800 leading-relaxed">
            Files in the Recycle Bin are automatically and permanently deleted after 30 days. Restore them if you still need them.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-surface-border divide-y">
          {[...Array(3)].map((_, i) => <FileRowSkeleton key={i} />)}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="h-6 w-6" />}
          title="Recycle Bin is empty"
          description="Deleted files will appear here. You can restore them or permanently delete them."
        />
      ) : (
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="divide-y divide-surface-border">
            {files.map(file => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-[0.6rem] font-bold text-gray-500">{getFileExtension(file.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                    {file.autoDeleteAt && (
                      <Badge variant="warning" className="text-[0.6rem]">
                        {formatDaysRemaining(file.autoDeleteAt)}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="hidden md:block text-xs text-gray-400 flex-shrink-0">
                  Deleted {file.deletedAt ? formatDate(file.deletedAt) : '—'}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" isLoading={restoring === file.id}
                    onClick={() => handleRestore(file)} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setFileToDelete(file)}
                    className="text-danger hover:bg-danger-muted">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!fileToDelete}
        title="Permanently Delete"
        description={`Permanently delete "${fileToDelete?.name}"? This cannot be undone.`}
        consequence="The file will be gone forever and cannot be recovered."
        primaryLabel="Delete Forever"
        isLoading={deleting}
        onConfirm={handlePermanentDelete}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  )
}
