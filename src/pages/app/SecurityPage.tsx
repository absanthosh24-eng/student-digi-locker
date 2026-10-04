import { useState, useEffect } from 'react'
import { Shield, Key, Mail, Trash2, AlertTriangle, Eye, EyeOff, CheckCircle, Smartphone, Monitor, Clock, LogOut, Activity } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { changePassword, changeEmail, deleteAccount } from '@/services/auth.service'
import { Button, Input, Card, Badge } from '@/components/ui'
import { ConfirmationDialog } from '@/components/ui/Modal'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatDate } from '@/utils'

export default function SecurityPage() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Activity Feeds
  const [loginActivity, setLoginActivity] = useState<any[]>([])
  const [securityActivity, setSecurityActivity] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsubLogin = onSnapshot(query(collection(db, 'users', user.uid, 'loginActivity'), orderBy('loggedInAt', 'desc')), snap => {
      setLoginActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingActivity(false)
    })
    const unsubSec = onSnapshot(query(collection(db, 'users', user.uid, 'securityActivity'), orderBy('createdAt', 'desc')), snap => {
      setSecurityActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubLogin(); unsubSec() }
  }, [user])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Passwords don't match"); return }
    setPwLoading(true)
    try {
      await changePassword(pwForm.newPw)
      showSuccess('Password updated', 'Your password has been changed successfully.')
      setPwDone(true)
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) { setPwError((err as Error).message) }
    finally { setPwLoading(false) }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return
    setEmailLoading(true)
    try {
      await changeEmail(newEmail)
      setEmailSent(true)
      showSuccess('Verification sent', `Check ${newEmail} for a verification link.`)
    } catch (err) { showError('Email change failed', (err as Error).message) }
    finally { setEmailLoading(false) }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await deleteAccount()
      navigate('/')
    } catch (err) {
      showError('Deletion failed', (err as Error).message)
      setDeleteLoading(false)
    }
  }

  const handleLogoutSession = async (sessionId: string) => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'users', user.uid, 'loginActivity', sessionId), {
        status: 'inactive'
      })
      showSuccess('Session ended', 'The device has been successfully logged out.')
    } catch (err) {
      showError('Failed to logout session', (err as Error).message)
    }
  }

  const currentSessionId = localStorage.getItem('sessionId')

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1 text-gray-900">Security & Activity</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account security and view recent activity</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Password */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Key className="h-4 w-4 text-primary" />
              <h2 className="text-h3 text-gray-900">Change Password</h2>
            </div>
            {pwDone ? (
              <div className="flex items-center gap-2 bg-success-muted border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <p className="text-sm text-green-700">Password updated successfully.</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                {pwError && <p className="text-sm text-danger bg-danger-muted rounded-xl px-4 py-2.5">{pwError}</p>}
                <Input label="New password" type={showPw ? 'text' : 'password'} required placeholder="Min. 8 characters"
                  value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                  rightElement={<button type="button" onClick={() => setShowPw(s => !s)} className="text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>} />
                <Input label="Confirm new password" type={showPw ? 'text' : 'password'} required placeholder="Repeat password"
                  value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
                <Button type="submit" isLoading={pwLoading} leftIcon={<Key className="h-4 w-4" />}>Update Password</Button>
              </form>
            )}
          </Card>

          {/* Email */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-primary" />
              <h2 className="text-h3 text-gray-900">Change Email</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Current: <strong>{userProfile?.email}</strong></p>
            {emailSent ? (
              <div className="flex items-center gap-2 bg-success-muted border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <p className="text-sm text-green-700">Verification sent to <strong>{newEmail}</strong>. Your email will update after you verify.</p>
              </div>
            ) : (
              <form onSubmit={handleEmailChange} className="flex gap-2">
                <Input type="email" placeholder="new@email.com" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)} required containerClassName="flex-1" />
                <Button type="submit" variant="secondary" isLoading={emailLoading}>Send link</Button>
              </form>
            )}
          </Card>

          {/* Security info */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-h3 text-gray-900">Account Status</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Email verified</span>
                <span className="text-xs font-medium">{user?.emailVerified ? '✅ Verified' : '⚠️ Not verified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Account created</span>
                <span className="text-xs font-medium">{userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>
          </Card>

          {/* Danger zone */}
          <Card className="border-danger/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <h2 className="text-h3 text-danger">Danger Zone</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Permanently deleting your account will remove all your files, folders, and data. This action cannot be undone.
            </p>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
              Delete Account
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Login Activity */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-4 w-4 text-primary" />
              <h2 className="text-h3 text-gray-900">Login Activity</h2>
            </div>
            {loadingActivity ? (
              <p className="text-xs text-gray-500">Loading activity...</p>
            ) : loginActivity.length === 0 ? (
              <p className="text-xs text-gray-500">No login activity found.</p>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                {loginActivity.map(session => {
                  const isCurrent = session.sessionId === currentSessionId
                  const isActive = session.status === 'active'
                  
                  return (
                    <div key={session.id} className="p-3 border border-surface-border rounded-xl bg-surface-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {session.device?.toLowerCase().includes('mobile') ? (
                            <Smartphone className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Monitor className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={session.device}>
                            {session.device ? (session.device.split(' ')[0] + ' Browser') : 'Unknown Device'}
                          </span>
                        </div>
                        <Badge variant={isActive ? 'success' : 'default'} className="text-[0.6rem]">
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <p className="text-[0.65rem] text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.loggedInAt?.toDate ? formatDate(session.loggedInAt.toDate()) : 'Recently'}
                        </p>
                        <p className="text-[0.65rem] text-gray-500">
                          Location unavailable in Hackathon Mode
                        </p>
                      </div>

                      {isActive && !isCurrent && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full text-xs h-7"
                          onClick={() => handleLogoutSession(session.sessionId)}
                          leftIcon={<LogOut className="h-3 w-3" />}
                        >
                          Log out this device
                        </Button>
                      )}
                      {isCurrent && (
                        <p className="text-xs text-primary font-medium text-center">This is your current session</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Security Activity */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-h3 text-gray-900">Security Events</h2>
            </div>
            {securityActivity.length === 0 ? (
              <p className="text-xs text-gray-500">No security events found.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {securityActivity.map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border border-surface-border rounded-xl">
                    <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {event.createdAt?.toDate ? formatDate(event.createdAt.toDate()) : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Account Forever"
        description="Are you absolutely sure you want to permanently delete your account?"
        consequence="All your files, folders, and shared links will be deleted. This action is permanent and cannot be undone."
        primaryLabel="Delete My Account"
        secondaryLabel="Cancel — keep my account"
        isLoading={deleteLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
