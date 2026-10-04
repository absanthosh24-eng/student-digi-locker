import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_BG } from '@/utils'
import { FileCategory } from '@/types'
import { cn } from '@/utils'

const CATEGORY_DESCRIPTIONS: Record<FileCategory, string> = {
  Education: 'Marksheets, transcripts, hall tickets, study notes',
  Certificates: 'Achievement, completion, workshop certificates',
  Identity: 'Aadhaar, PAN, passport, driving licence',
  Finance: 'Fee receipts, scholarships, bank statements',
  Projects: 'Project reports, assignments, research papers',
  Personal: 'Resume, photos, personal records',
  Uncategorized: 'Files not yet assigned a category',
}

export default function CategoriesPage() {
  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-h1 text-gray-900">Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organise your files by type</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.filter(c => c !== 'Uncategorized').map(cat => (
          <Link key={cat} to={`/categories/${encodeURIComponent(cat)}`}>
            <div className={cn(
              'flex flex-col p-5 rounded-2xl border cursor-pointer hover:shadow-md transition-shadow group',
              CATEGORY_BG[cat], 'border-surface-border'
            )}>
              <div className="text-3xl mb-3">{CATEGORY_ICONS[cat]}</div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{cat}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{CATEGORY_DESCRIPTIONS[cat]}</p>
              <div className="mt-3 pt-3 border-t border-black/5">
                <span className={cn('text-xs font-medium', CATEGORY_COLORS[cat].split(' ')[1])}>
                  View files →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Uncategorized */}
      <div>
        <h2 className="text-h3 text-gray-700 mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" /> Uncategorized Files
        </h2>
        <Link to="/files?category=Uncategorized">
          <div className="flex items-center gap-4 p-4 bg-white border border-surface-border rounded-xl hover:shadow-card transition-shadow cursor-pointer">
            <div className="text-2xl">📁</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Uncategorized</p>
              <p className="text-xs text-gray-400">{CATEGORY_DESCRIPTIONS.Uncategorized}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
