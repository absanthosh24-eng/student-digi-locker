import { useState } from 'react'
import { Users, Link2, Eye, Download, Clock, LogIn, Copy, Share, Check } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { shareWithAccount, createShareLink } from '@/services/sharing.service'
import { LockerFile, SharePermission } from '@/types'
import Modal from '@/components/ui/Modal'
import { Button, Input, Select, Badge } from '@/components/ui'
import { cn } from '@/utils'

type Tab = 'account' | 'link'

interface ShareDialogProps {
  file: LockerFile
  onClose: () => void
}

export default function ShareDialog({ file, onClose }: ShareDialogProps) {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [tab, setTab] = useState<Tab>('account')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  // Account share state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('view')

  // Link share state
  const [linkPermission, setLinkPermission] = useState<SharePermission>('view')
  const [expiry, setExpiry] = useState('7')
  const [requiresLogin, setRequiresLogin] = useState(false)

  const handleAccountShare = async () => {
    if (!user || !user.email || !recipientEmail.trim()) return
    setLoading(true)
    try {
      await shareWithAccount(user.uid, user.email, file.id, file.name, recipientEmail.trim(), {
        permission,
        storageMode: file.storageMode
      })
      showSuccess('File shared', `Shared with ${recipientEmail} successfully.`)
      onClose()
    } catch (err) {
      showError('Share failed', (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async () => {
    if (!user || !user.email) return
    setLoading(true)
    try {
      const expiresAt = expiry !== '0' ? new Date(Date.now() + parseInt(expiry) * 24 * 60 * 60 * 1000) : null
      const share = await createShareLink(user.uid, user.email, file.id, file.name, {
        permission: linkPermission,
        expiresAt,
        requiresLogin,
        storageMode: file.storageMode
      })
      const actualShareId = share.id.split('_')[0]
      const link = `${window.location.origin}/share/${actualShareId}?token=${share.linkToken}`
      setGeneratedLink(link)
      showSuccess('Link created', 'Your sharing link is ready.')
    } catch {
      showError('Failed to create link', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = () => {
    if (!generatedLink) return
    if (navigator.share) {
      navigator.share({ title: file.name, url: generatedLink })
    } else {
      handleCopy()
    }
  }

  const permissionOptions = [
    { value: 'view', label: 'View only' },
    { value: 'view_download', label: 'View + Download' },
  ]
  const expiryOptions = [
    { value: '1', label: '1 day' },
    { value: '3', label: '3 days' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '0', label: 'No expiration' },
  ]

  return (
    <Modal isOpen title={`Share "${file.name}"`} onClose={onClose} size="md">
      {/* Tabs */}
      <div className="flex rounded-xl bg-surface-muted p-1 gap-1 mb-5">
        {([['account', 'Share with Account', Users], ['link', 'Secure Link', Link2]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors',
              tab === key ? 'bg-white text-primary shadow-card' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="space-y-4">
          <Input
            label="Recipient email"
            type="email"
            placeholder="friend@college.edu"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            required
          />
          <Select label="Permission" options={permissionOptions} value={permission}
            onChange={e => setPermission(e.target.value as SharePermission)} />
          {permission === 'view_download' && (
            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
              <strong>Hackathon Note:</strong> Because files are stored locally in IndexedDB, the recipient can only download the file if the physical bytes exist on their device.
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={handleAccountShare} isLoading={loading}
              disabled={!recipientEmail.trim()} leftIcon={<Users className="h-3.5 w-3.5" />}>
              Share
            </Button>
          </div>
        </div>
      )}

      {tab === 'link' && (
        <div className="space-y-4">
          <Select label="Permission" options={permissionOptions} value={linkPermission}
            onChange={e => setLinkPermission(e.target.value as SharePermission)} />
          {linkPermission === 'view_download' && (
            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
              <strong>Hackathon Note:</strong> Because files are stored locally in IndexedDB, the recipient can only download the file if the physical bytes exist on their device.
            </div>
          )}
          <Select label="Link expires" options={expiryOptions} value={expiry}
            onChange={e => setExpiry(e.target.value)} />
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={requiresLogin} onChange={e => setRequiresLogin(e.target.checked)}
              className="rounded border-surface-border text-primary focus:ring-primary" />
            <span className="text-xs text-gray-700">Require login to access</span>
          </label>

          {generatedLink ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-surface-muted rounded-xl px-3 py-2.5 border border-surface-border">
                <p className="text-xs text-gray-600 flex-1 truncate font-mono">{generatedLink}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" fullWidth onClick={handleCopy}
                  leftIcon={copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" fullWidth onClick={handleNativeShare} leftIcon={<Share className="h-3.5 w-3.5" />}>
                  Share via
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
              <Button variant="primary" fullWidth onClick={handleCreateLink} isLoading={loading}
                leftIcon={<Link2 className="h-3.5 w-3.5" />}>
                Create Link
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
