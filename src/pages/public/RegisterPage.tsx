import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, User, Phone, GraduationCap, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { registerUser } from '@/services/auth.service'
import { Button, Input, Select } from '@/components/ui'
import AuthLayout from './AuthLayout'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phoneNumber: z.string().optional(),
  collegeName: z.string().optional(),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  yearOfStudy: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const yearOptions = [
  { value: '', label: 'Select year' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
  { value: 'PG', label: 'Post Graduate' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await registerUser(data.email, data.password, data.displayName, {
        phoneNumber: data.phoneNumber,
        collegeName: data.collegeName,
        rollNumber: data.rollNumber,
        department: data.department,
        yearOfStudy: data.yearOfStudy,
      })
      navigate('/verify-email', { state: { email: data.email } })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <AuthLayout title="Create your locker" subtitle="Free for all students — no credit card needed">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div className="bg-danger-muted border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Required fields */}
        <div className="space-y-3">
          <Input label="Full Name" required placeholder="Ravi Kumar" error={errors.displayName?.message}
            leftElement={<User className="h-4 w-4" />} {...register('displayName')} />
          <Input label="Email" type="email" required placeholder="ravi@college.edu"
            error={errors.email?.message} leftElement={<Mail className="h-4 w-4" />} {...register('email')} />
          <Input label="Password" type={showPassword ? 'text' : 'password'} required
            placeholder="Min. 8 characters" error={errors.password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            rightElement={
              <button type="button" onClick={() => setShowPassword(s => !s)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')} />
          <Input label="Confirm Password" type={showConfirm ? 'text' : 'password'} required
            placeholder="Repeat password" error={errors.confirmPassword?.message}
            leftElement={<Lock className="h-4 w-4" />}
            rightElement={
              <button type="button" onClick={() => setShowConfirm(s => !s)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('confirmPassword')} />
        </div>

        {/* Optional fields toggle */}
        <button
          type="button"
          onClick={() => setShowOptional(s => !s)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors w-full"
        >
          {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showOptional ? 'Hide' : 'Add'} college details (optional)
        </button>

        {showOptional && (
          <div className="space-y-3 p-4 bg-surface-muted rounded-xl border border-surface-border">
            <p className="text-xs text-gray-400 -mt-1">Help us personalise your locker</p>
            <Input label="Phone Number" type="tel" placeholder="+91 9876543210"
              leftElement={<Phone className="h-4 w-4" />} {...register('phoneNumber')} />
            <Input label="College Name" placeholder="RGUKT IIIT Nuzvid"
              leftElement={<GraduationCap className="h-4 w-4" />} {...register('collegeName')} />
            <Input label="Roll Number / Enrollment ID" placeholder="N201234"
              {...register('rollNumber')} />
            <Input label="Department / Branch" placeholder="Computer Science"
              leftElement={<BookOpen className="h-4 w-4" />} {...register('department')} />
            <Select label="Year of Study" options={yearOptions} {...register('yearOfStudy')} />
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} size="lg">
          {isSubmitting ? 'Creating locker…' : 'Create my locker'}
        </Button>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          By creating an account, you agree to our privacy policy and terms of service.
        </p>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:text-primary-dark">Log in</Link>
      </p>
    </AuthLayout>
  )
}
