import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Mail, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/store'
import { sendVerificationEmail } from '@/services/auth.service'
import { Button } from '@/components/ui'
import AuthLayout from './AuthLayout'

export default function VerifyEmailPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as { email?: string })?.email ?? user?.email ?? 'your email'
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      await sendVerificationEmail()
      setResent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Check your email" subtitle="We sent a verification link to your inbox">
      <div className="flex flex-col items-center text-center space-y-5">
        {/* Email icon */}
        <div className="w-16 h-16 bg-primary-muted rounded-2xl flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-gray-600 leading-relaxed">
            We sent a verification email to:
          </p>
          <p className="text-sm font-semibold text-gray-900 bg-surface-muted rounded-lg px-3 py-2">
            {email}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed mt-2">
            Click the link in the email to verify your account. Check your spam folder if you don't see it.
          </p>
        </div>

        {/* Success resent */}
        {resent && (
          <div className="flex items-center gap-2 bg-success-muted border border-green-200 rounded-xl px-4 py-3 w-full">
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            <p className="text-sm text-green-700">Verification email resent successfully.</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <Button
          variant="secondary"
          fullWidth
          isLoading={loading}
          onClick={handleResend}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Resend verification email
        </Button>

        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate('/login')}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Continue to login
        </Button>

        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
          Return to login
        </Link>
      </div>
    </AuthLayout>
  )
}
