import { useState, useRef } from 'react'
import { Camera, Mail, Phone, GraduationCap, BookOpen, User, Hash, CheckCircle } from 'lucide-react'
import { useAuth, useToast } from '@/store'
import { updateUserProfile } from '@/services/auth.service'
import { Button, Input, Select, Card } from '@/components/ui'

const yearOptions = [
  { value: '', label: 'Select year' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
  { value: 'PG', label: 'Post Graduate' },
]

export default function ProfilePage() {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    displayName: userProfile?.displayName ?? '',
    phoneNumber: userProfile?.phoneNumber ?? '',
    collegeName: userProfile?.collegeName ?? '',
    rollNumber: userProfile?.rollNumber ?? '',
    department: userProfile?.department ?? '',
    yearOfStudy: userProfile?.yearOfStudy ?? '',
  })

  const initials = userProfile?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'S'

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await updateUserProfile(user.uid, form)
      showSuccess('Profile updated', 'Your profile has been saved.')
      setSaved(true)
    } catch { showError('Save failed', 'Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-5 lg:p-7 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1 text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar */}
      <Card className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-primary-dark transition-colors">
            <Camera className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{userProfile?.displayName}</p>
          <p className="text-xs text-gray-400">{userProfile?.email}</p>
          {userProfile?.collegeName && <p className="text-xs text-gray-400 mt-0.5">{userProfile.collegeName}</p>}
        </div>
      </Card>

      {/* Form */}
      <Card>
        <h2 className="text-h3 text-gray-900 mb-5">Personal Information</h2>
        <div className="space-y-4">
          <Input label="Full Name" value={form.displayName} onChange={e => handleChange('displayName', e.target.value)}
            leftElement={<User className="h-4 w-4" />} required />
          <Input label="Email" type="email" value={userProfile?.email ?? ''} disabled
            leftElement={<Mail className="h-4 w-4" />}
            hint="To change your email, go to Security settings." />
          <Input label="Phone Number" type="tel" value={form.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)}
            placeholder="+91 9876543210" leftElement={<Phone className="h-4 w-4" />} />
        </div>
      </Card>

      <Card>
        <h2 className="text-h3 text-gray-900 mb-5">College Information</h2>
        <div className="space-y-4">
          <Input label="College Name" value={form.collegeName} onChange={e => handleChange('collegeName', e.target.value)}
            placeholder="RGUKT IIIT Nuzvid" leftElement={<GraduationCap className="h-4 w-4" />} />
          <Input label="Roll Number / Enrollment ID" value={form.rollNumber} onChange={e => handleChange('rollNumber', e.target.value)}
            placeholder="N201234" leftElement={<Hash className="h-4 w-4" />} />
          <Input label="Department / Branch" value={form.department} onChange={e => handleChange('department', e.target.value)}
            placeholder="Computer Science" leftElement={<BookOpen className="h-4 w-4" />} />
          <Select label="Year of Study" options={yearOptions} value={form.yearOfStudy}
            onChange={e => handleChange('yearOfStudy', e.target.value)} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} isLoading={loading} leftIcon={saved ? <CheckCircle className="h-4 w-4 text-success" /> : undefined}>
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
