'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Save,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

// ── Types ──

interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

// ── Constants ──

const STORAGE_KEY = 'toolhub-notepad-notes'
const AUTO_SAVE_DELAY = 500

// ── Helpers ──

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp

  if (diff < 60000) return '방금 전'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getPreview(content: string): string {
  const firstLine = content.split('\n')[0]
  return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine || '내용 없음'
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function countLines(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

function countBytes(text: string): number {
  return new TextEncoder().encode(text).length
}

// ── Main Component ──

export default function Notepad() {
  const t = useTranslations('notepad')

  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Load notes from localStorage on mount ──

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Note[]
        setNotes(parsed)
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id)
        }
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // ── Save notes to localStorage whenever they change ──

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    }
  }, [notes])

  // ── Active note ──

  const activeNote = notes.find((n) => n.id === activeNoteId) || null

  // ── Create new note ──

  const createNote = useCallback(() => {
    const newNote: Note = {
      id: generateId(),
      title: '새 메모',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setNotes((prev) => [newNote, ...prev])
    setActiveNoteId(newNote.id)
    setSidebarOpen(false)

    // Auto-focus content textarea after state update
    setTimeout(() => {
      contentTextareaRef.current?.focus()
    }, 0)
  }, [])

  // ── Delete note ──

  const deleteNote = useCallback((id: string) => {
    if (!window.confirm('이 메모를 삭제하시겠습니까?')) return

    setNotes((prev) => {
      const filtered = prev.filter((n) => n.id !== id)
      if (filtered.length > 0 && id === activeNoteId) {
        setActiveNoteId(filtered[0].id)
      } else if (filtered.length === 0) {
        setActiveNoteId(null)
      }
      return filtered
    })
  }, [activeNoteId])

  // ── Update note with debounced auto-save ──

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
      )
    )

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to show "Auto-saved" indicator
    saveTimeoutRef.current = setTimeout(() => {
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    }, AUTO_SAVE_DELAY)
  }, [])

  // ── Export note as .txt ──

  const exportNote = useCallback(() => {
    if (!activeNote) return

    const blob = new Blob([activeNote.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title || '메모'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeNote])

  // ── Stats ──

  const stats = activeNote
    ? {
        chars: activeNote.content.length,
        words: countWords(activeNote.content),
        lines: countLines(activeNote.content),
        bytes: countBytes(activeNote.content),
      }
    : { chars: 0, words: 0, lines: 0, bytes: 0 }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar (mobile toggle) */}
        <div className="lg:col-span-1">
          {/* Mobile toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            {sidebarOpen ? '목록 닫기' : '메모 목록'}
          </button>

          <div
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4`}
          >
            {/* New Note Button */}
            <button
              onClick={createNote}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('newNote')}
            </button>

            {/* Notes List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('noNotes')}</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      note.id === activeNoteId
                        ? 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                    }`}
                    onClick={() => {
                      setActiveNoteId(note.id)
                      setSidebarOpen(false)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                        {note.title || '제목 없음'}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNote(note.id)
                        }}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getPreview(note.content)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {activeNote ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col h-[700px]">
              {/* Title Input */}
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) =>
                  updateNote(activeNote.id, { title: e.target.value })
                }
                className="w-full px-4 py-3 mb-4 text-xl font-semibold border-b-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="제목을 입력하세요"
              />

              {/* Content Textarea */}
              <textarea
                ref={contentTextareaRef}
                value={activeNote.content}
                onChange={(e) =>
                  updateNote(activeNote.id, { content: e.target.value })
                }
                className="flex-1 w-full h-full min-h-[400px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="내용을 입력하세요..."
              />

              {/* Bottom Bar */}
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('stats.chars')}: {stats.chars.toLocaleString()}</span>
                  <span>{t('stats.words')}: {stats.words.toLocaleString()}</span>
                  <span>{t('stats.lines')}: {stats.lines.toLocaleString()}</span>
                  <span>{t('stats.bytes')}: {stats.bytes.toLocaleString()}</span>
                </div>

                {/* Export & Save Indicator */}
                <div className="flex items-center gap-3">
                  {showSaved && (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Save className="w-4 h-4" />
                      {t('autoSaved')}
                    </span>
                  )}
                  <button
                    onClick={exportNote}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('export')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 h-[700px] flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t('noNotes')}</p>
                <p className="text-sm mt-2">{t('createFirstNote')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.features.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.features.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Usage */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.usage.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.usage.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
