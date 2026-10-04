import { FileCategory, AIMetadata } from '@/types'
import * as pdfjsLib from 'pdfjs-dist'
// Set the workerSrc to the local file for the browser
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export type DocumentIntelligenceStatus = 'processing' | 'completed' | 'partial' | 'unsupported' | 'failed'

export interface ExtractedDocumentMetadata {
  text: string
  dates: string[]
  keywords: string[]
  status: DocumentIntelligenceStatus
  error?: string
}

export interface DocumentIntelligenceResult extends AIMetadata {
  searchableText?: string
  extractionStatus: DocumentIntelligenceStatus
  extractionError?: string
}

// ── Extraction Logic ──────────────────────────────────────────────────────────

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(' ')
    text += pageText + ' \n'
  }
  return text
}

async function extractTextFromTXT(file: File): Promise<string> {
  return await file.text()
}

async function extractContent(file: File): Promise<ExtractedDocumentMetadata> {
  let text = ''
  let status: DocumentIntelligenceStatus = 'completed'
  let error: string | undefined

  try {
    if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(file)
      if (text.trim().length === 0) {
        status = 'partial'
        error = 'Text extraction unavailable (Image-only PDF without OCR)'
      }
    } else if (file.type === 'text/plain') {
      text = await extractTextFromTXT(file)
    } else {
      status = 'unsupported'
      error = 'Text extraction unavailable for this file format.'
    }
  } catch (err) {
    status = 'failed'
    error = err instanceof Error ? err.message : 'Unknown extraction error'
  }

  // Normalize text
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  
  // Extract Dates (simple regex for DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, Month YYYY)
  const dates = new Set<string>()
  const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4})\b/gi
  let match
  while ((match = dateRegex.exec(normalizedText)) !== null) {
    dates.add(match[1])
  }

  // Very basic keywords extraction based on text
  const keywords = Array.from(new Set(normalizedText.toLowerCase().split(/\s+/).filter(w => w.length > 4)))

  return { text: normalizedText, dates: Array.from(dates).slice(0, 5), keywords, status, error }
}

// ── Classification Logic ──────────────────────────────────────────────────────

const KEYWORD_MAP: { keywords: string[]; type: string; category: FileCategory }[] = [
  { keywords: ['marksheet', 'marks', 'grade', 'result', 'scorecard', 'transcript'], type: 'Marksheet', category: 'Education' },
  { keywords: ['degree', 'diploma'], type: 'Degree', category: 'Education' },
  { keywords: ['certificate', 'certif', 'award', 'appreciation', 'completion'], type: 'Certificate', category: 'Certificates' },
  { keywords: ['aadhar', 'aadhaar', 'adhar'], type: 'Aadhaar Card', category: 'Identity' },
  { keywords: ['pan', 'pancard'], type: 'PAN Card', category: 'Identity' },
  { keywords: ['passport'], type: 'Passport', category: 'Identity' },
  { keywords: ['voter'], type: 'Voter ID', category: 'Identity' },
  { keywords: ['license', 'driving'], type: 'Driving License', category: 'Identity' },
  { keywords: ['resume', 'cv', 'curriculum', 'vitae'], type: 'Resume / CV', category: 'Personal' },
  { keywords: ['invoice', 'receipt', 'bill', 'payment', 'fee'], type: 'Invoice / Receipt', category: 'Finance' },
  { keywords: ['tax', 'itr', 'return'], type: 'Tax Document', category: 'Finance' },
  { keywords: ['project', 'report', 'assignment', 'thesis', 'dissertation'], type: 'Project Report', category: 'Projects' },
  { keywords: ['photo', 'image', 'img', 'picture'], type: 'Photo', category: 'Personal' },
  { keywords: ['admission', 'enrollment', 'joining', 'offer'], type: 'Admission/Offer Letter', category: 'Education' },
  { keywords: ['scholarship'], type: 'Scholarship Document', category: 'Finance' },
  { keywords: ['salary', 'slip', 'payslip'], type: 'Salary Slip', category: 'Finance' },
  { keywords: ['bank', 'statement', 'passbook'], type: 'Bank Statement', category: 'Finance' },
]

function determineTypeAndCategory(filename: string, extractedText: string): { documentType: string, suggestedCategory: FileCategory, confidence: number } {
  const textToSearch = (filename + ' ' + extractedText).toLowerCase()
  
  let bestMatch = null
  let maxMatches = 0

  for (const entry of KEYWORD_MAP) {
    let matchCount = 0
    for (const kw of entry.keywords) {
      // Bonus if it's in the filename
      if (filename.toLowerCase().includes(kw)) {
        matchCount += 3
      }
      if (extractedText.toLowerCase().includes(kw)) {
        matchCount += 1
      }
    }
    
    if (matchCount > maxMatches) {
      maxMatches = matchCount
      bestMatch = entry
    }
  }

  if (bestMatch) {
    return {
      documentType: bestMatch.type,
      suggestedCategory: bestMatch.category,
      confidence: Math.min(99, 70 + (maxMatches * 5))
    }
  }

  // Fallbacks
  if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return { documentType: 'Image', suggestedCategory: 'Personal', confidence: 60 }
  }
  if (filename.match(/\.(mp4|mov|avi)$/i)) {
    return { documentType: 'Video', suggestedCategory: 'Personal', confidence: 60 }
  }

  return {
    documentType: 'Document',
    suggestedCategory: 'Uncategorized',
    confidence: 50
  }
}

function generateSuggestedFilename(documentType: string, dates: string[], originalExt: string): string {
  let name = documentType.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')
  
  if (dates.length > 0) {
      // Just use the first date, sanitized
      const cleanDate = dates[0].replace(/[^a-zA-Z0-9]/g, '_')
      name += `_${cleanDate}`
  }
  
  // ensure extension
  if (originalExt && !name.toLowerCase().endsWith(originalExt.toLowerCase())) {
      name += originalExt
  }
  return name
}

// ── Main Service Endpoint ─────────────────────────────────────────────────────

export async function analyzeDocument(file: File): Promise<DocumentIntelligenceResult> {
  // 1. Extract content (local execution)
  const extraction = await extractContent(file)
  
  // 2. Classify based on filename and extracted content
  const classification = determineTypeAndCategory(file.name, extraction.text)
  
  // 3. Generate suggested filename
  const originalExt = file.name.substring(file.name.lastIndexOf('.'))
  const suggestedFileName = generateSuggestedFilename(classification.documentType, extraction.dates, originalExt)

  // 4. Return result
  return {
    documentType: classification.documentType,
    suggestedCategory: classification.suggestedCategory,
    categoryConfidence: classification.confidence,
    suggestedFileName,
    extractedDates: extraction.dates,
    isSearchable: extraction.status === 'completed' && extraction.text.length > 0,
    processedAt: new Date(),
    searchableText: extraction.text.length > 0 ? extraction.text : undefined,
    extractionStatus: extraction.status,
    extractionError: extraction.error
  }
}
