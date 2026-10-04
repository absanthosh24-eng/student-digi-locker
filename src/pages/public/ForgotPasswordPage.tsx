import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react'
import { sendPasswordReset } from '@/services/auth.service'
import { Button, Input } from '@/components/ui'
import AuthLayout from './AuthLayout'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setError('')
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Email sent" subtitle="Check your inbox for a reset link">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-16 h-16 bg-success-muted rounded-2xl flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don't see it within a few minutes.
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <p className="text-sm text-danger bg-danger-muted border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
        <Input
          label="Email address"
          type="email"
          required
          placeholder="you@college.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          leftElement={<Mail className="h-4 w-4" />}
        />
        <Button type="submit" variant="primary" fullWidth isLoading={loading} size="lg">
          Send reset link
        </Button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-5">
        <Link to="/login" className="text-primary font-medium hover:text-primary-dark flex items-center justify-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}
