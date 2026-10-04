import { Link } from 'react-router-dom'
import { User, Shield, Server, Upload, Layout, Info, Moon, Sun, Monitor, CheckCircle, Smartphone } from 'lucide-react'
import { Card, Button, Select } from '@/components/ui'
import { useAuth, usePreferences } from '@/store'
import { ThemePreference, ViewMode, SortField } from '@/types'

export default function SettingsPage() {
  const { user, isEmailVerified } = useAuth()
  const { prefs, updatePref } = usePreferences()

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-h1 text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and app preferences</p>
      </div>

      {/* 1. Account */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Account
        </h2>
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.displayName || 'Student'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-success bg-success-muted px-2 py-1 rounded-full">
                  <CheckCircle className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-warning bg-warning-muted px-2 py-1 rounded-full">
                  Unverified
                </span>
              )}
              <Link to="/profile">
                <Button variant="secondary" size="sm">Manage Profile</Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Appearance */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" /> Appearance
        </h2>
        <Card className="p-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Theme</p>
            <p className="text-xs text-gray-500">Choose how the app looks</p>
          </div>
          <div className="flex items-center gap-3">
            {(['system', 'light', 'dark'] as ThemePreference[]).map(theme => (
              <button
                key={theme}
                onClick={() => updatePref('theme', theme)}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  prefs.theme === theme 
                    ? 'border-primary bg-primary-muted/10 text-primary' 
                    : 'border-surface-border bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {theme === 'system' && <Monitor className="h-5 w-5" />}
                {theme === 'light' && <Sun className="h-5 w-5" />}
                {theme === 'dark' && <Moon className="h-5 w-5" />}
                <span className="text-xs font-medium capitalize">{theme}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      {/* 3. Preferences */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" /> Interface Preferences
        </h2>
        <Card className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 block">Default View Mode</label>
              <Select
                options={[
                  { value: 'list', label: 'List View' },
                  { value: 'grid', label: 'Grid View' }
                ]}
                value={prefs.defaultView}
                onChange={e => updatePref('defaultView', e.target.value as ViewMode)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 block">Default Sort</label>
              <Select
                options={[
                  { value: 'uploadedAt', label: 'Upload Date' },
                  { value: 'relevance', label: 'Relevance (Search)' },
                  { value: 'name', label: 'File Name' },
                  { value: 'size', label: 'File Size' },
                  { value: 'category', label: 'Category' }
                ]}
                value={prefs.defaultSort}
                onChange={e => updatePref('defaultSort', e.target.value as SortField | 'relevance')}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Compact Mode</p>
              <p className="text-xs text-gray-500">Reduce spacing between items</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={prefs.compactMode}
                onChange={e => updatePref('compactMode', e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </Card>
      </section>

      {/* 4. Upload Preferences */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Upload Preferences
        </h2>
        <Card className="p-4 divide-y divide-surface-border">
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Show AI Suggestions</p>
              <p className="text-xs text-gray-500 max-w-[250px]">Automatically extract document intelligence before upload</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={prefs.aiSuggestionsEnabled}
                onChange={e => updatePref('aiSuggestionsEnabled', e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">After Upload</p>
              <p className="text-xs text-gray-500">What to do when upload finishes</p>
            </div>
            <Select
              className="w-[140px]"
              options={[
                { value: 'stay', label: 'Stay on page' },
                { value: 'my-files', label: 'Go to My Files' }
              ]}
              value={prefs.postUploadBehavior}
              onChange={e => updatePref('postUploadBehavior', e.target.value as 'stay' | 'my-files')}
            />
          </div>
        </Card>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 5. Privacy */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" /> Privacy & Storage
          </h2>
          <Card className="p-4 space-y-3">
            <div className="flex gap-3">
              <Smartphone className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Local File Storage</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Actual file bytes are stored securely on this device using browser IndexedDB.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Metadata Sync</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only file names, folders, categories and searchable text are synced to Firestore.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* 6. Security */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security
          </h2>
          <Card hoverable className="p-0">
            <Link to="/security" className="p-4 flex flex-col h-full justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Account Security</p>
                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                  <li>Password management</li>
                  <li>Login activity tracking</li>
                  <li>Active sessions review</li>
                  <li>Account deletion</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-primary">
                Manage Security <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </Link>
          </Card>
        </section>
      </div>

      {/* 7. About */}
      <section className="text-center pt-6 pb-2 border-t border-surface-border">
        <div className="inline-flex items-center justify-center p-2 bg-primary-muted rounded-xl mb-3">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Student Digital Locker</h3>
        <p className="text-xs text-gray-500 mt-1">Version 1.0.0 (Hackathon Mode)</p>
        <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
          Built with React, Vite, Firebase Auth/Firestore, and IndexedDB for local-first encrypted storage.
        </p>
      </section>
    </div>
  )
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
