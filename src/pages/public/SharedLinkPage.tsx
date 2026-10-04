import { useState, useEffect } from 'react'
import { Lock, Download, Eye, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store'
import { getShareDetails } from '@/services/sharing.service'
import { getLocalFile } from '@/services/localFileStorage.service'
import { ShareRecord } from '@/types'
import PageLoader from '@/components/common/PageLoader'

type ShareState = 'loading' | 'valid' | 'expired' | 'revoked' | 'login_required' | 'invalid'

export default function SharedLinkPage() {
  const { shareId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [state, setState] = useState<ShareState>('loading')
  const [shareRecord, setShareRecord] = useState<ShareRecord | null>(null)
  const [fileBytesAvailable, setFileBytesAvailable] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (authLoading || !shareId) return

    const fetchShare = async () => {
      try {
        const record = await getShareDetails(shareId, token)
        if (!record) {
          setState('invalid')
          return
        }

        // Validate state
        if (record.status === 'revoked') {
          setState('revoked')
          return
        }
        if (record.expiresAt && record.expiresAt < new Date()) {
          setState('expired')
          return
        }
        if (record.requiresLogin && !user) {
          setState('login_required')
          return
        }
        if (record.shareType === 'link' && record.linkToken !== token) {
          setState('invalid')
          return
        }

        // Valid
        setShareRecord(record)
        setState('valid')

        // Check availability
        if (record.storageMode === 'cloud') {
           setFileBytesAvailable(true)
        } else if (record.permission === 'view_download') {
          try {
            const blob = await getLocalFile(record.fileId)
            setFileBytesAvailable(!!blob)
          } catch {
            setFileBytesAvailable(false)
          }
        }
      } catch (err) {
        // Usually permission denied means the share doesn't exist, is an account share not for them, or requires login
        console.error(err)
        setState('invalid')
      }
    }

    fetchShare()
  }, [shareId, token, user, authLoading])

  const handleDownload = async () => {
    if (!shareRecord || !fileBytesAvailable) return
    setDownloading(true)
    try {
      if (shareRecord.storageMode === 'cloud') {
         const { getShareAccessUrl } = await import('@/services/cloudStorage.service')
         const docId = token ? `${shareRecord.id}_${token}` : shareRecord.id
         const data = await getShareAccessUrl(docId, 'download')
         const a = document.createElement('a')
         a.href = data.url
         a.download = data.fileName || shareRecord.fileName
         document.body.appendChild(a)
         a.click()
         a.remove()
      } else {
         const blob = await getLocalFile(shareRecord.fileId)
         if (blob) {
           const url = URL.createObjectURL(blob)
           const a = document.createElement('a')
           a.href = url
           a.download = shareRecord.fileName || 'download'
           document.body.appendChild(a)
           a.click()
           document.body.removeChild(a)
           URL.revokeObjectURL(url)
         }
      }
    } catch (err) {
      console.error(err)
      alert('Failed to download: ' + (err as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  if (authLoading || state === 'loading') {
    return <PageLoader />
  }

  if (state === 'valid' && shareRecord) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Student Digital Locker</span>
          </div>
          {user ? (
            <Link to="/dashboard"><Button size="sm" variant="outline">My Locker</Button></Link>
          ) : (
            <Link to="/login"><Button size="sm">Log In</Button></Link>
          )}
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-8 w-full max-w-sm text-center space-y-5 relative overflow-hidden">
            <div className="w-14 h-14 bg-primary-muted rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Shared File Metadata</p>
              <h2 className="text-h3 text-gray-900 truncate" title={shareRecord.fileName}>{shareRecord.fileName}</h2>
              <p className="text-xs text-gray-500 mt-1">Shared by: {shareRecord.ownerEmail || 'Unknown'}</p>
              {shareRecord.expiresAt && (
                <p className="text-[0.65rem] text-warning font-medium mt-1">
                  Expires: {shareRecord.expiresAt.toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Hackathon Disclaimer */}
            {shareRecord.storageMode !== 'cloud' && (
              <div className="text-left bg-surface-muted p-3 rounded-xl border border-surface-border text-xs text-gray-600 space-y-2">
                <p className="font-medium flex items-center gap-1.5 text-gray-900">
                  <ShieldAlert className="h-4 w-4 text-warning" /> Hackathon Limitations
                </p>
                <p>Because actual file bytes are stored purely locally in IndexedDB (no cloud storage), you are viewing the securely shared <strong>metadata</strong>.</p>
                <p>You can only download the file if the original bytes happen to exist on this specific device and browser.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                fullWidth 
                variant="secondary" 
                leftIcon={<Eye className="h-4 w-4" />}
                onClick={async () => {
                   if (shareRecord.storageMode === 'cloud') {
                     const { getShareAccessUrl } = await import('@/services/cloudStorage.service')
                     const docId = token ? `${shareRecord.id}_${token}` : shareRecord.id
                     try {
                        const data = await getShareAccessUrl(docId, 'preview')
                        window.open(data.url, '_blank')
                     } catch (err) {
                        alert('Preview unavailable: ' + (err as Error).message)
                     }
                   } else {
                     alert('Preview requires cloud storage mode or a native viewer.')
                   }
                }}
              >
                {shareRecord.storageMode === 'cloud' ? 'Preview File' : 'Preview Unavailable'}
              </Button>
              {shareRecord.permission === 'view_download' && (
                <Button 
                  fullWidth 
                  variant="primary" 
                  disabled={!fileBytesAvailable}
                  isLoading={downloading}
                  onClick={handleDownload}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  {fileBytesAvailable ? 'Download File' : 'Not on this device'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stateConfig: Record<Exclude<ShareState, 'valid' | 'loading'>, { icon: string; title: string; desc: string }> = {
    expired: { icon: '⏰', title: 'Link Expired', desc: 'This sharing link has expired and is no longer accessible.' },
    revoked: { icon: '🚫', title: 'Link Revoked', desc: 'This sharing link has been revoked by the owner.' },
    login_required: { icon: '🔐', title: 'Login Required', desc: 'You need to log in to your account to access this securely shared file.' },
    invalid: { icon: '❓', title: 'Invalid Link', desc: 'This sharing link is invalid, does not exist, or you lack permissions.' },
  }

  const cfg = stateConfig[state as Exclude<ShareState, 'valid' | 'loading'>]

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-surface-border shadow-card p-8 w-full max-w-sm text-center space-y-4">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-surface-border">
          {cfg.icon}
        </div>
        <div>
          <h2 className="text-h3 text-gray-900">{cfg.title}</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{cfg.desc}</p>
        </div>
        {state === 'login_required' && (
          <Button fullWidth onClick={() => navigate('/login')}>Log in to continue</Button>
        )}
        <Link to="/" className="block text-xs text-gray-400 hover:text-gray-600 transition-colors pt-2">
          Return to home
        </Link>
      </div>
    </div>
  )
}
