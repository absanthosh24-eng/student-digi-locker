import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Download, Pencil, FolderInput, Share2, Trash2 } from 'lucide-react'
import { LockerFile } from '@/types'
import { cn } from '@/utils'
import { downloadLockerFile } from '@/services/files.service'

interface FileActionsMenuProps {
  file: LockerFile
  onPreview?: (file: LockerFile) => void
  onRename?: (file: LockerFile) => void
  onMove?: (file: LockerFile) => void
  onShare?: (file: LockerFile) => void
  onDelete?: (file: LockerFile) => void
  className?: string
}

type ActionItem = { key: string; label: string; icon: any; danger?: boolean }

const actions: ActionItem[] = [
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'download', label: 'Download', icon: Download },
  { key: 'rename', label: 'Rename', icon: Pencil },
  { key: 'move', label: 'Move to folder', icon: FolderInput },
  { key: 'share', label: 'Share', icon: Share2 },
  { key: 'delete', label: 'Delete', icon: Trash2, danger: true },
]

export default function FileActionsMenu({
  file, onPreview, onRename, onMove, onShare, onDelete, className
}: FileActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAction = async (key: string) => {
    setOpen(false)
    switch (key) {
      case 'preview': onPreview?.(file); break
      case 'download': {
        try {
          await downloadLockerFile(file)
        } catch (error) {
          alert('File unavailable: ' + (error as Error).message)
        }
        break
      }
      case 'rename': onRename?.(file); break
      case 'move': onMove?.(file); break
      case 'share': onShare?.(file); break
      case 'delete': onDelete?.(file); break
    }
  }

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="File actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-surface-border rounded-xl shadow-dialog py-1 animate-scale-in">
          {actions.map(({ key, label, icon: Icon, danger }) => (
            <button
              key={key}
              onClick={() => handleAction(key)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors hover:bg-surface-muted',
                danger ? 'text-danger hover:bg-danger-muted' : 'text-gray-700'
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
