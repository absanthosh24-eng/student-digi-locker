import { useState, useEffect } from 'react'
import { FolderPlus, Folder, ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { subscribeToFolders, createFolder, renameFolder, deleteFolder, buildFolderTree, FolderNode } from '@/services/folders.service'
import { Folder as FolderType } from '@/types'
import { Button, Card } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui'
import EmptyState from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/ui/Modal'
import { formatDate } from '@/utils'

function FolderCard({ node, onRename, onDelete }: {
  node: FolderNode
  onRename: (folder: FolderType) => void
  onDelete: (folder: FolderType) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center border border-yellow-100">
          <Folder className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-surface-border rounded-xl shadow-dialog py-1 z-10 animate-scale-in">
              <button onClick={() => { setMenuOpen(false); onRename(node) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-surface-muted">
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button onClick={() => { setMenuOpen(false); onDelete(node) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-danger hover:bg-danger-muted">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate mb-1">{node.name}</p>
      <p className="text-xs text-gray-400">{formatDate(node.createdAt)}</p>
      {node.children.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-1">
          {node.children.slice(0, 3).map(child => (
            <div key={child.id} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="text-xs text-gray-500 truncate">{child.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FoldersPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [folders, setFolders] = useState<FolderType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [folderToRename, setFolderToRename] = useState<FolderType | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToFolders(user.uid, (f) => { setFolders(f); setLoading(false) })
    return unsub
  }, [user])

  const tree = buildFolderTree(folders)

  const handleCreate = async () => {
    if (!newName.trim() || !user) return
    setCreating(true)
    try {
      await createFolder(user.uid, newName.trim())
      showSuccess('Folder created')
      setNewName(''); setShowCreate(false)
    } catch { showError('Failed to create folder') }
    finally { setCreating(false) }
  }

  const handleRename = async () => {
    if (!folderToRename || !renameValue.trim() || !user) return
    setRenaming(true)
    try {
      await renameFolder(user.uid, folderToRename.id, renameValue.trim())
      showSuccess('Folder renamed')
      setFolderToRename(null)
    } catch { showError('Failed to rename folder') }
    finally { setRenaming(false) }
  }

  const handleDelete = async () => {
    if (!folderToDelete || !user) return
    setDeleting(true)
    try {
      await deleteFolder(user.uid, folderToDelete.id)
      showSuccess('Folder deleted')
      setFolderToDelete(null)
    } catch { showError('Failed to delete folder') }
    finally { setDeleting(false) }
  }

  return (
    <div className="p-5 lg:p-7 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-gray-900">Folders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{folders.length} folder{folders.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<FolderPlus className="h-4 w-4" />}>
          New Folder
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-surface-border rounded-xl p-4 h-32 skeleton" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <EmptyState
          icon={<Folder className="h-6 w-6" />}
          title="No folders yet"
          description="Create folders to organise your files by subject, semester, or project."
          action={{ label: 'Create first folder', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tree.map(node => (
            <FolderCard key={node.id} node={node}
              onRename={(f) => { setFolderToRename(f); setRenameValue(f.name) }}
              onDelete={setFolderToDelete}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Folder" size="sm">
        <div className="space-y-4">
          <Input label="Folder name" placeholder="e.g. Semester 1" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }} autoFocus />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleCreate} isLoading={creating} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Rename dialog */}
      <Modal isOpen={!!folderToRename} onClose={() => setFolderToRename(null)} title="Rename Folder" size="sm">
        <div className="space-y-4">
          <Input label="New name" value={renameValue} onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename() }} autoFocus />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setFolderToRename(null)}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleRename} isLoading={renaming} disabled={!renameValue.trim()}>Rename</Button>
          </div>
        </div>
      </Modal>

      {/* Delete dialog */}
      <ConfirmationDialog
        isOpen={!!folderToDelete}
        title="Delete Folder"
        description={`Delete "${folderToDelete?.name}"? Files inside will not be deleted.`}
        primaryLabel="Delete Folder"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setFolderToDelete(null)}
      />
    </div>
  )
}
