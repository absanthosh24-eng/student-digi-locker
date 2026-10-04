import { Link } from 'react-router-dom'
import { Lock, Shield, Search, Share2, Cpu, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui'

const features = [
  {
    icon: <Lock className="h-5 w-5 text-primary" />,
    title: 'Secure Storage',
    desc: 'Your documents are encrypted and stored securely. Only you decide who sees them.',
  },
  {
    icon: <Cpu className="h-5 w-5 text-ai" />,
    title: 'AI Organization',
    desc: 'Smart document detection automatically suggests categories and filenames for you.',
  },
  {
    icon: <Search className="h-5 w-5 text-info" />,
    title: 'Instant Search',
    desc: 'Find any file in seconds — search by name, category, date, or document content.',
  },
  {
    icon: <Share2 className="h-5 w-5 text-success" />,
    title: 'Controlled Sharing',
    desc: 'Share with classmates or teachers using secure links with custom expiry and permissions.',
  },
]

const benefits = [
  'Marksheets & transcripts', 'Certificates & awards',
  'Identity documents', 'Fee receipts & scholarships',
  'Project reports', 'Personal documents',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Student Digital Locker</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-b from-primary-muted/60 to-white">
        <div className="inline-flex items-center gap-1.5 bg-ai-muted border border-ai-border rounded-full px-3 py-1 mb-6">
          <Cpu className="h-3.5 w-3.5 text-ai" />
          <span className="text-xs font-medium text-ai">AI-Powered Document Intelligence</span>
        </div>

        <h1 className="text-display font-bold text-gray-900 max-w-2xl mb-4 leading-tight">
          Your private digital locker for student documents
        </h1>
        <p className="text-gray-600 text-base max-w-xl mb-8 leading-relaxed">
          Securely store, organize, and share your academic documents — marksheets, certificates, ID proof, and more.
          Powered by AI to keep everything in order.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link to="/register">
            <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Create free locker
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Log in to my locker</Button>
          </Link>
        </div>

        {/* Doc types */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {benefits.map(b => (
            <div key={b} className="flex items-center gap-1.5 bg-white border border-surface-border rounded-full px-3 py-1 shadow-card">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-xs text-gray-600">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-4xl mx-auto w-full">
        <h2 className="text-h2 text-center text-gray-900 mb-2">Everything you need to manage your documents</h2>
        <p className="text-sm text-gray-500 text-center mb-10">Designed specifically for college students</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map(f => (
            <div key={f.title} className="flex gap-4 p-5 bg-white border border-surface-border rounded-xl shadow-card hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-12 bg-sidebar text-center">
        <h2 className="text-h2 text-white mb-2">Start organizing your documents today</h2>
        <p className="text-sidebar-text text-sm mb-6">Free for all students. No credit card required.</p>
        <Link to="/register">
          <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
            Create your locker — it's free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-surface-border">
        <p className="text-xs text-gray-400">© 2024 Student Digital Locker. Built for students, by students.</p>
      </footer>
    </div>
  )
}
