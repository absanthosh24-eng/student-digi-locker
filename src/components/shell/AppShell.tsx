import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Files, Folder, Tag, Users, Share2,
  Trash2, User, Shield, Settings, LogOut, Upload,
  Menu, X, ChevronRight, Lock,
} from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { logoutUser } from '@/services/auth.service'
import { formatBytes, calculateStoragePercent, cn } from '@/utils'
import TopBar from './TopBar'
import UploadQueuePanel from '@/components/upload/UploadQueuePanel'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Files', to: '/files', icon: <Files className="h-4 w-4" /> },
  { label: 'Folders', to: '/folders', icon: <Folder className="h-4 w-4" /> },
  { label: 'Categories', to: '/categories', icon: <Tag className="h-4 w-4" /> },
]

const sharingNav: NavItem[] = [
  { label: 'Shared With Me', to: '/shared-with-me', icon: <Users className="h-4 w-4" /> },
  { label: 'Shared By Me', to: '/shared-by-me', icon: <Share2 className="h-4 w-4" /> },
  { label: 'Recycle Bin', to: '/recycle-bin', icon: <Trash2 className="h-4 w-4" /> },
]

const accountNav: NavItem[] = [
  { label: 'Profile', to: '/profile', icon: <User className="h-4 w-4" /> },
  { label: 'Security', to: '/security', icon: <Shield className="h-4 w-4" /> },
  { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" /> },
]

function StorageRing({ used, limit }: { used: number; limit: number }) {
  const pct = calculateStoragePercent(used, limit)
  const r = 28
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (pct / 100) * circ
  const strokeColor = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : '#4F6EF7'

  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-sidebar-active rounded-xl">
      <svg width="48" height="48" viewBox="0 0 64 64" className="flex-shrink-0">
        <circle cx="32" cy="32" r={r} className="storage-ring-track" />
        <circle
          cx="32" cy="32" r={r}
          className="storage-ring-fill"
          stroke={strokeColor}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
          {pct}%
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-[0.6875rem] text-sidebar-text">Storage</p>
        <p className="text-xs font-semibold text-white truncate">{formatBytes(used)}</p>
        <p className="text-[0.6875rem] text-sidebar-text">of {formatBytes(limit)}</p>
      </div>
    </div>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn('sidebar-link', isActive && 'active')
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { userProfile, user } = useAuth()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()
  
  const [storageInfo, setStorageInfo] = useState<{ used: number, limit: number, supported: boolean }>({ used: 0, limit: 0, supported: false })
  
  React.useEffect(() => {
    import('@/services/localFileStorage.service').then(({ getStorageInfo }) => {
      getStorageInfo().then(info => {
        // We use info.usage and info.quota
        setStorageInfo({
          used: info.supported ? info.usage : (userProfile?.storageUsed ?? 0),
          limit: info.supported ? info.quota : 0, // 0 indicates unknown
          supported: info.supported
        })
      })
    })
  }, [userProfile?.storageUsed])

  const handleLogout = async () => {
    try {
      await logoutUser()
      showSuccess('Logged out', 'See you next time!')
      navigate('/login')
    } catch {
      showError('Logout failed', 'Please try again.')
    }
  }

  const initials = userProfile?.displayName
    ? userProfile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'S'

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[0.8125rem] font-bold text-white leading-tight">Digital Locker</p>
            <p className="text-[0.625rem] text-sidebar-text leading-tight">Student Edition</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sidebar-text hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-6 pb-4">
        <div>
          <p className="text-[0.625rem] font-semibold text-sidebar-text uppercase tracking-wider px-3 mb-2">Locker</p>
          <div className="space-y-0.5">
            {mainNav.map(item => <SidebarLink key={item.to} item={item} />)}
          </div>
        </div>
        <div>
          <p className="text-[0.625rem] font-semibold text-sidebar-text uppercase tracking-wider px-3 mb-2">Sharing</p>
          <div className="space-y-0.5">
            {sharingNav.map(item => <SidebarLink key={item.to} item={item} />)}
          </div>
        </div>
        <div>
          <p className="text-[0.625rem] font-semibold text-sidebar-text uppercase tracking-wider px-3 mb-2">Account</p>
          <div className="space-y-0.5">
            {accountNav.map(item => <SidebarLink key={item.to} item={item} />)}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-3">
        {/* Storage */}
        {storageInfo.supported ? (
          <StorageRing used={storageInfo.used} limit={storageInfo.limit} />
        ) : (
          <div className="flex flex-col gap-1 px-3 py-3 bg-sidebar-active rounded-xl">
             <p className="text-[0.6875rem] text-sidebar-text">Local Storage (Hackathon)</p>
             <p className="text-xs font-semibold text-white">{formatBytes(storageInfo.used)}</p>
             <p className="text-[0.6875rem] text-sidebar-text">Quota API unavailable</p>
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sidebar-hover">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {userProfile?.displayName ?? 'Student'}
            </p>
            <p className="text-[0.625rem] text-sidebar-text truncate">
              {userProfile?.collegeName ?? userProfile?.email ?? ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-sidebar-text hover:text-white transition-colors p-1"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface-muted overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar flex-shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-sidebar h-full shadow-dialog animate-slide-up">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin page-enter">
          <Outlet />
        </main>
      </div>

      {/* Upload Queue Panel */}
      <UploadQueuePanel />
    </div>
  )
}
