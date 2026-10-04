import { useState } from 'react'
import { useAuth, useToast } from '@/store'
import { renameFile } from '@/services/files.service'
import { LockerFile } from '@/types'
import Modal from '@/components/ui/Modal'
import { Button, Input } from '@/components/ui'

interface RenameDialogProps {
  file: LockerFile
  onClose: () => void
}

export default function RenameDialog({ file, onClose }: RenameDialogProps) {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [name, setName] = useState(file.name)
  const [loading, setLoading] = useState(false)

  const handleRename = async () => {
    if (!name.trim() || !user) return
    setLoading(true)
    try {
      await renameFile(user.uid, file.id, name.trim())
      showSuccess('File renamed', `Renamed to "${name.trim()}"`)
      onClose()
    } catch {
      showError('Rename failed', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen title="Rename File" onClose={onClose} size="sm">
      <div className="space-y-4">
        <Input
          label="File name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleRename() }}
          autoFocus
        />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" fullWidth onClick={handleRename} isLoading={loading} disabled={!name.trim()}>
            Rename
          </Button>
        </div>
      </div>
    </Modal>
  )
}
