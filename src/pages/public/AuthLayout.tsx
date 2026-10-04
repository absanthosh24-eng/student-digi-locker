import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Student Digital Locker</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-card px-8 py-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-h2 text-gray-900 text-center">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500 text-center mt-1">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
