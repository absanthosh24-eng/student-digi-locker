import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { loginUser } from '@/services/auth.service'
import { Button, Input } from '@/components/ui'
import AuthLayout from './AuthLayout'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await loginUser(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to access your digital locker"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Global error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-danger-muted border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-snug">{error}</p>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@college.edu"
          required
          autoComplete="email"
          error={errors.email?.message}
          leftElement={<Mail className="h-4 w-4" />}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Your password"
          required
          autoComplete="current-password"
          error={errors.password?.message}
          leftElement={<Lock className="h-4 w-4" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} size="lg">
          {isSubmitting ? 'Logging in…' : 'Log in to my locker'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:text-primary-dark">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
