import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Upload, Menu, X } from 'lucide-react'
import { useAuth, useUpload } from '@/store'
import { cn } from '@/utils'
import { Button } from '@/components/ui'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const { addFiles } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/files?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) addFiles(files)
    e.target.value = ''
  }

  return (
    <header className="h-14 bg-white border-b border-surface-border flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border bg-surface-muted transition-all duration-150',
          searchFocused ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-surface-border'
        )}>
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Search files, folders, categories…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none min-w-0"
            aria-label="Search"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Upload */}
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:inline-flex"
        >
          Upload
        </Button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="sm:hidden p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
          aria-label="Upload"
        >
          <Upload className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </header>
  )
}
