import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { changePassword } from '@/services/auth.service'
import { Button, Input } from '@/components/ui'
import AuthLayout from './AuthLayout'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      await changePassword(password)
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-16 h-16 bg-success-muted rounded-2xl flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <p className="text-sm text-gray-600">Your password has been updated successfully. You can now log in with your new password.</p>
          <Button variant="primary" fullWidth onClick={() => navigate('/login')}>Back to login</Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <p className="text-sm text-danger bg-danger-muted border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
        <Input label="New password" type={show ? 'text' : 'password'} required placeholder="Min. 8 characters"
          value={password} onChange={e => setPassword(e.target.value)}
          leftElement={<Lock className="h-4 w-4" />}
          rightElement={
            <button type="button" onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <Input label="Confirm new password" type={show ? 'text' : 'password'} required placeholder="Repeat password"
          value={confirm} onChange={e => setConfirm(e.target.value)} leftElement={<Lock className="h-4 w-4" />} />
        <Button type="submit" variant="primary" fullWidth isLoading={loading} size="lg">Update password</Button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-5">
        <Link to="/login" className="text-primary font-medium hover:text-primary-dark">Back to login</Link>
      </p>
    </AuthLayout>
  )
}
