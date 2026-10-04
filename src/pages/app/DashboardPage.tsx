import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Upload, Files, Folder, Share2, Users, Clock, ArrowRight, Sparkles, AlertTriangle, 
  Database, Activity, Key, Mail, ShieldAlert, Zap, Server
} from 'lucide-react'
import { useAuth, useUpload } from '@/store'
import { getFiles } from '@/services/files.service'
import { getFolders } from '@/services/folders.service'
import { getSharedByMe, getSharedWithMe } from '@/services/sharing.service'
import { getStorageInfo, StorageInfo } from '@/services/localFileStorage.service'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { LockerFile, ShareRecord } from '@/types'
import { formatBytes, formatRelativeTime, calculateStoragePercent, CATEGORY_ICONS, cn } from '@/utils'
import { Card, Button, Badge } from '@/components/ui'
import { FileCardSkeleton } from '@/components/ui/Skeleton'
import FileActionsMenu from '@/components/files/FileActionsMenu'

const CATEGORIES_COLORS: Record<string, string> = {
  'Education': 'bg-blue-50 border-blue-100 text-blue-700',
  'Certificates': 'bg-yellow-50 border-yellow-100 text-yellow-700',
  'Identity': 'bg-green-50 border-green-100 text-green-700',
  'Finance': 'bg-purple-50 border-purple-100 text-purple-700',
  'Projects': 'bg-orange-50 border-orange-100 text-orange-700',
  'Personal': 'bg-pink-50 border-pink-100 text-pink-700',
}

function RecentFileRow({ file }: { file: LockerFile }) {
  const typeColors: Record<string, string> = {
    'application/pdf': 'bg-red-100 text-red-600',
    default: 'bg-primary-muted text-primary',
  }
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
  const color = typeColors[file.mimeType] ?? typeColors.default

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors rounded-xl cursor-pointer group">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[0.6rem] font-bold', color)}>
        {ext.slice(0, 4)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate pr-2">{file.name}</p>
        <p className="text-xs text-gray-400">{file.category || 'Uncategorized'} · {formatRelativeTime(file.uploadedAt)}</p>
      </div>
      <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block w-16 text-right mr-2">{formatBytes(file.size)}</p>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <FileActionsMenu file={file} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth()
  const { addFiles } = useUpload()
  const [loading, setLoading] = useState(true)
  
  const [data, setData] = useState<{
    files: LockerFile[];
    foldersCount: number;
    sharedByMe: ShareRecord[];
    sharedWithMe: ShareRecord[];
    activity: any[];
    storageInfo: StorageInfo | null;
  } | null>(null)

  const firstName = userProfile?.displayName?.split(' ')[0] ?? 'Student'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user || !user.email) return
    let mounted = true

    const uid = user.uid
    const email = user.email

    async function load() {
      try {
        const [filesSnap, foldersSnap, sharedByMeSnap, sharedWithMeSnap, activitySnap, storageInfo] = await Promise.allSettled([
          getFiles(uid),
          getFolders(uid),
          getSharedByMe(uid),
          getSharedWithMe(email),
          getDocs(query(collection(db, 'users', uid, 'securityActivity'), orderBy('createdAt', 'desc'), limit(5))),
          getStorageInfo()
        ])

        if (mounted) {
          setData({
            files: filesSnap.status === 'fulfilled' ? filesSnap.value : [],
            foldersCount: foldersSnap.status === 'fulfilled' ? foldersSnap.value.length : 0,
            sharedByMe: sharedByMeSnap.status === 'fulfilled' ? sharedByMeSnap.value : [],
            sharedWithMe: sharedWithMeSnap.status === 'fulfilled' ? sharedWithMeSnap.value : [],
            activity: activitySnap.status === 'fulfilled' ? activitySnap.value.docs.map(d => ({ id: d.id, ...d.data() })) : [],
            storageInfo: storageInfo.status === 'fulfilled' ? storageInfo.value : null
          })
          setLoading(false)
        }
      } catch (err) {
        console.error("Dashboard data load failed", err)
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) addFiles(files)
    e.target.value = ''
  }

  // Derived calculations
  const totalBytes = data?.files.reduce((acc, f) => acc + f.size, 0) || 0
  const recentFiles = data?.files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(0, 5) || []
  
  // Category counts
  const categoryCounts = data?.files.reduce((acc, f) => {
    const c = f.category || 'Uncategorized'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  const sortedCategories = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1])

  // AI counts
  const processedFiles = data?.files.filter(f => f.aiMetadata?.extractionStatus === 'completed').length || 0
  const partialFiles = data?.files.filter(f => f.aiMetadata?.extractionStatus === 'partial').length || 0
  const unsupportedFiles = data?.files.filter(f => f.aiMetadata?.extractionStatus === 'unsupported').length || 0
  const datesFound = data?.files.filter(f => (f.aiMetadata?.extractedDates?.length || 0) > 0).length || 0
  const aiTotal = data?.files.filter(f => f.aiMetadata).length || 0

  // Shares counts
  const activeCreated = data?.sharedByMe.filter(s => s.status === 'active') || []
  const activeReceived = data?.sharedWithMe.filter(s => s.status === 'active') || []
  const totalShares = activeCreated.length + activeReceived.length
  
  const now = Date.now()
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000
  const expiringShares = activeCreated.filter(s => s.expiresAt && s.expiresAt.getTime() > now && s.expiresAt.getTime() < sevenDays)

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto space-y-6">
      {/* Hackathon Notice */}
      <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Hackathon Mode Active</p>
          <p className="mt-0.5 opacity-90 text-xs">
            Authentication uses Firebase Auth. Metadata is stored in Firestore. <strong>Actual file bytes are stored locally in IndexedDB.</strong> You will only be able to download files from the browser you uploaded them on. Do not assume cloud synchronization for large file data.
          </p>
        </div>
      </div>

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-gray-900">{greeting}, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here is an overview of your digital locker today, {new Date().toLocaleDateString()}.</p>
        </div>
        <label className="cursor-pointer">
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
          <Button leftIcon={<Upload className="h-4 w-4" />} size="md">
            Quick Upload
          </Button>
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="flex items-center gap-3 hover:shadow-card transition-shadow">
            <div className="w-10 h-10 bg-primary-muted rounded-xl flex items-center justify-center flex-shrink-0">
              <Files className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Files</p>
              <p className="text-h2 text-gray-900">{data?.files.length || 0}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 hover:shadow-card transition-shadow">
            <div className="w-10 h-10 bg-info-muted rounded-xl flex items-center justify-center flex-shrink-0">
              <Folder className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Folders</p>
              <p className="text-h2 text-gray-900">{data?.foldersCount || 0}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 hover:shadow-card transition-shadow">
            <div className="w-10 h-10 bg-success-muted rounded-xl flex items-center justify-center flex-shrink-0">
              <Share2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Shared Files</p>
              <p className="text-h2 text-gray-900">{totalShares}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 hover:shadow-card transition-shadow">
            <div className="w-10 h-10 bg-ai-muted rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-ai" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Doc Intelligence</p>
              <p className="text-h2 text-gray-900">{aiTotal}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Wider) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Storage & Categories Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Storage Overview */}
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Storage Overview
              </h2>
              <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{formatBytes(totalBytes)}</p>
                  <p className="text-xs text-gray-500 font-medium">Locker files stored locally</p>
                </div>
                
                <div className="text-xs bg-surface-muted p-3 rounded-xl border border-surface-border space-y-2">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5"><Server className="h-3 w-3" /> Browser Quota</span>
                    <span className="font-semibold text-gray-800">
                      {data?.storageInfo?.supported ? formatBytes(data.storageInfo.quota) : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Browser Usage</span>
                    <span className="font-semibold text-gray-800">
                      {data?.storageInfo?.supported ? formatBytes(data.storageInfo.usage) : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Document Intelligence */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ai" /> Document Intelligence
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-green-50 text-green-800 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <p className="text-2xl font-bold">{processedFiles}</p>
                  <p className="text-[0.65rem] font-medium mt-1 uppercase tracking-wider">Processed</p>
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <p className="text-2xl font-bold">{datesFound}</p>
                  <p className="text-[0.65rem] font-medium mt-1 uppercase tracking-wider">Dates Found</p>
                </div>
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl border border-yellow-100 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <p className="text-xl font-bold">{partialFiles}</p>
                  <p className="text-[0.65rem] font-medium mt-1 uppercase tracking-wider">Partial</p>
                </div>
                <div className="bg-gray-50 text-gray-700 p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                  <p className="text-xl font-bold">{unsupportedFiles}</p>
                  <p className="text-[0.65rem] font-medium mt-1 uppercase tracking-wider">Unsupported</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 text-gray-900">Recent Files</h2>
              <Link to="/files" className="text-xs text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <Card padding="none">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => <FileCardSkeleton key={i} />)}
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="flex flex-col items-center text-center py-10 px-4">
                  <div className="text-3xl mb-3">📂</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Your locker is empty</p>
                  <p className="text-xs text-gray-400 mb-4">Upload your first document to see it here.</p>
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    <Button size="sm" variant="primary" leftIcon={<Upload className="h-3.5 w-3.5" />}>
                      Upload first file
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {recentFiles.map(f => <RecentFileRow key={f.id} file={f} />)}
                </div>
              )}
            </Card>
          </div>
          
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Files className="h-4 w-4 text-primary" />, label: 'My Files', to: '/files' },
              { icon: <Folder className="h-4 w-4 text-info" />, label: 'Folders', to: '/folders' },
              { icon: <Share2 className="h-4 w-4 text-success" />, label: 'Shared By Me', to: '/shared-by-me' },
              { icon: <Users className="h-4 w-4 text-purple-500" />, label: 'Shared With Me', to: '/shared-with-me' },
            ].map(item => (
              <Link key={item.to} to={item.to}>
                <Card hoverable padding="sm" className="flex flex-col items-center justify-center text-center gap-2 h-20">
                  <div className="w-8 h-8 bg-surface-muted rounded-lg flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </Card>
              </Link>
            ))}
          </div>

          {/* Categories Overview */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Categories</h2>
              <Link to="/categories" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {sortedCategories.length === 0 && !loading ? (
              <p className="text-xs text-gray-500 italic py-4 text-center">No categorized files.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sortedCategories.slice(0, 6).map(([name, count]) => {
                  const color = CATEGORIES_COLORS[name] || 'bg-gray-50 border-gray-200 text-gray-700'
                  const icon = CATEGORY_ICONS[name as keyof typeof CATEGORY_ICONS] || '📄'
                  return (
                    <Link key={name} to={`/categories/${encodeURIComponent(name)}`}>
                      <div className={cn('flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:border-gray-300 transition-colors', color)}>
                        <span className="text-sm">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.65rem] font-semibold truncate">{name}</p>
                          <p className="text-[0.6rem] opacity-80">{count} files</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Sharing Overview */}
          <Card className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-gray-500" /> Sharing Overview
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Active (Created)</span>
                <Badge variant="default" className="text-[0.65rem]">{activeCreated.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Active (Received)</span>
                <Badge variant="info" className="text-[0.65rem]">{activeReceived.length}</Badge>
              </div>
              {expiringShares.length > 0 && (
                <div className="mt-2 flex items-center justify-between p-2.5 bg-warning-muted rounded-lg border border-warning/20">
                  <span className="text-[0.7rem] font-semibold text-warning-dark">
                    {expiringShares.length} {expiringShares.length === 1 ? 'share expires' : 'shares expire'} soon
                  </span>
                  <Clock className="h-3.5 w-3.5 text-warning" />
                </div>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" /> Recent Activity
              </h2>
              <Link to="/security" className="text-[0.65rem] text-primary hover:underline">View Log</Link>
            </div>
            {data?.activity.length === 0 && !loading ? (
              <p className="text-xs text-gray-500 italic py-4 text-center">No recent security activity.</p>
            ) : (
              <div className="space-y-3">
                {data?.activity.map(ev => {
                  const isPw = ev.type === 'password_change'
                  const isEmail = ev.type === 'email_change'
                  const Icon = isPw ? Key : isEmail ? Mail : ShieldAlert
                  const color = isPw ? 'text-warning' : isEmail ? 'text-info' : 'text-primary'
                  return (
                    <div key={ev.id} className="flex gap-2.5">
                      <div className="mt-0.5"><Icon className={cn("h-3.5 w-3.5", color)} /></div>
                      <div>
                        <p className="text-xs font-medium text-gray-800 leading-tight">
                          {ev.description || ev.type.replace('_', ' ')}
                        </p>
                        <p className="text-[0.65rem] text-gray-400 mt-0.5">
                          {formatRelativeTime(ev.createdAt?.toDate() || new Date())}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}
