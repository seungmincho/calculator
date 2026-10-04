'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/devCheatsheet'
import {
  Search,
  Copy,
  Check,
  Star,
  BookMarked,
  ChevronDown,
  ChevronUp,
  X,
  Terminal,
  Filter,
} from 'lucide-react'
import {
  CHEATSHEET_COMMANDS,
  CHEATSHEET_CATEGORIES,
  type CheatsheetCommand,
  type CheatsheetCategory,
} from '@/data/devCheatsheetData'

// ── Types ──

type DifficultyFilter = 'all' | 'basic' | 'intermediate' | 'advanced'
type CategoryFilter = 'all' | CheatsheetCategory

const CATEGORY_KEYS: CheatsheetCategory[] = [
  'git', 'linux', 'docker', 'sql', 'vim', 'http', 'css', 'regex',
]

const DIFFICULTY_COLORS: Record<CheatsheetCommand['difficulty'], string> = {
  basic: 'bg-green-500',
  intermediate: 'bg-yellow-500',
  advanced: 'bg-red-500',
}

const CATEGORY_BG: Record<string, string> = {
  orange: 'bg-soft text-sub border-line',
  green: 'bg-soft text-sub border-line',
  blue: 'bg-soft text-sub border-line',
  purple: 'bg-soft text-sub border-line',
  teal: 'bg-soft text-sub border-line',
  cyan: 'bg-soft text-sub border-line',
  pink: 'bg-soft text-sub border-line',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
}

const CATEGORY_TAB_ACTIVE: Record<string, string> = {
  orange: 'bg-orange-500 text-white',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
  purple: 'bg-purple-500 text-white',
  teal: 'bg-teal-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  pink: 'bg-pink-500 text-white',
  amber: 'bg-amber-500 text-white',
}

// ── Helpers ──

function getBookmarks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('dev-cheatsheet-bookmarks')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBookmarks(ids: string[]) {
  try {
    localStorage.setItem('dev-cheatsheet-bookmarks', JSON.stringify(ids))
  } catch { /* ignore */ }
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// ── Component ──

export default function DevCheatsheet() {
  const t = useTranslations('devCheatsheet')
  const isKo = (() => {
    try {
      // simple language detection from translations
      return t('title') !== ''
    } catch {
      return true
    }
  })()

  // ── State ──
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── URL State Sync ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('category')
    const q = params.get('q')
    if (cat && (cat === 'all' || CATEGORY_KEYS.includes(cat as CheatsheetCategory))) {
      setCategory(cat as CategoryFilter)
    }
    if (q) {
      setSearchInput(q)
      setSearchQuery(q)
    }
    setBookmarks(getBookmarks())
  }, [])

  const updateURL = useCallback((params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    window.history.replaceState({}, '', url)
  }, [])

  // ── Handlers ──
  const handleCategoryChange = useCallback((cat: CategoryFilter) => {
    setCategory(cat)
    updateURL({ category: cat, q: searchQuery })
  }, [searchQuery, updateURL])

  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value)
      updateURL({ category, q: value })
    }, 300)
  }, [category, updateURL])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    updateURL({ category, q: '' })
  }, [category, updateURL])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
      saveBookmarks(next)
      return next
    })
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  // ── Filtered Data ──
  const filtered = useMemo(() => {
    let cmds = CHEATSHEET_COMMANDS

    if (category !== 'all') {
      cmds = cmds.filter(c => c.category === category)
    }

    if (difficulty !== 'all') {
      cmds = cmds.filter(c => c.difficulty === difficulty)
    }

    if (showBookmarkedOnly) {
      cmds = cmds.filter(c => bookmarks.includes(c.id))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      cmds = cmds.filter(c =>
        c.command.toLowerCase().includes(q) ||
        c.descriptionKo.toLowerCase().includes(q) ||
        c.descriptionEn.toLowerCase().includes(q) ||
        c.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    return cmds
  }, [category, difficulty, showBookmarkedOnly, bookmarks, searchQuery])

  // ── Group by category ──
  const grouped = useMemo(() => {
    const map = new Map<CheatsheetCategory, CheatsheetCommand[]>()
    for (const cmd of filtered) {
      const list = map.get(cmd.category) || []
      list.push(cmd)
      map.set(cmd.category, list)
    }
    return map
  }, [filtered])

  // ── Stats ──
  const totalCount = CHEATSHEET_COMMANDS.length
  const bookmarkedCount = bookmarks.length
  const categoryCountMap = useMemo(() => {
    const m = new Map<CheatsheetCategory, number>()
    for (const cmd of CHEATSHEET_COMMANDS) {
      m.set(cmd.category, (m.get(cmd.category) || 0) + 1)
    }
    return m
  }, [])

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Terminal className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-sub">
        <span>{t('stats.total')}: <strong className="text-fg">{totalCount}</strong></span>
        <span className="flex items-center gap-1">
          <BookMarked className="w-4 h-4" />
          {t('stats.bookmarked')}: <strong className="text-fg">{bookmarkedCount}</strong>
        </span>
        {searchQuery && (
          <span>{t('search.resultCount', { count: filtered.length })}</span>
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-surface rounded-xl shadow-lg p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full pl-10 pr-10 py-2.5 border border-line-strong rounded-lg bg-field text-fg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted mr-1">{t('filter.difficulty')}:</span>
            {(['all', 'basic', 'intermediate', 'advanced'] as DifficultyFilter[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  difficulty === d
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                    : 'bg-soft text-sub hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {d === 'all' ? t('filter.all') : (
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${DIFFICULTY_COLORS[d]}`} />
                    {t(`difficulty.${d}`)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bookmark Filter */}
          <button
            onClick={() => setShowBookmarkedOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors ${
              showBookmarkedOnly
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 font-medium'
                : 'bg-soft text-sub hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            {t('filter.bookmarked')}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-2">
          {/* All tab */}
          <button
            onClick={() => handleCategoryChange('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              category === 'all'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-soft text-sub hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filter.all')}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              category === 'all'
                ? 'bg-white/20 dark:bg-gray-900/20'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}>
              {totalCount}
            </span>
          </button>

          {CATEGORY_KEYS.map(key => {
            const cat = CHEATSHEET_CATEGORIES[key]
            const count = categoryCountMap.get(key) || 0
            const isActive = category === key
            return (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? CATEGORY_TAB_ACTIVE[cat.color] || 'bg-gray-900 text-white'
                    : 'bg-soft text-sub hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.nameKo}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Command List */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-lg p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-muted">{t('search.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(category === 'all' ? CATEGORY_KEYS : [category as CheatsheetCategory]).map(catKey => {
            const commands = grouped.get(catKey)
            if (!commands || commands.length === 0) return null
            const catInfo = CHEATSHEET_CATEGORIES[catKey]

            return (
              <div key={catKey} className="bg-surface rounded-xl shadow-lg overflow-hidden">
                {/* Category Header */}
                {category === 'all' && (
                  <div className={`px-6 py-3 border-b border-line flex items-center gap-2 ${CATEGORY_BG[catInfo.color] || ''}`}>
                    <span className="text-lg">{catInfo.icon}</span>
                    <span className="font-semibold">{catInfo.nameKo}</span>
                    <span className="text-xs opacity-70">{catInfo.nameEn}</span>
                    <span className="ml-auto text-xs font-medium opacity-70">{commands.length}</span>
                  </div>
                )}

                {/* Commands */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {commands.map(cmd => {
                    const isExpanded = expandedIds.has(cmd.id)
                    const isBookmarked = bookmarks.includes(cmd.id)
                    const isCopied = copiedId === cmd.id
                    const desc = cmd.descriptionKo

                    return (
                      <div key={cmd.id} className="group">
                        {/* Main Row */}
                        <div className="flex items-start gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
                          {/* Difficulty Dot */}
                          <div className="flex-shrink-0 mt-2.5">
                            <span
                              className={`block w-2.5 h-2.5 rounded-full ${DIFFICULTY_COLORS[cmd.difficulty]}`}
                              title={t(`difficulty.${cmd.difficulty}`)}
                            />
                          </div>

                          {/* Command + Description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <code className="font-mono bg-gray-900 dark:bg-gray-950 text-green-400 px-3 py-1.5 rounded-lg text-sm inline-block break-all">
                                {highlightText(cmd.command, searchQuery)}
                              </code>
                            </div>
                            <p className="text-sm text-sub leading-relaxed">
                              {highlightText(desc, searchQuery)}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Bookmark */}
                            <button
                              onClick={() => toggleBookmark(cmd.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isBookmarked
                                  ? 'text-yellow-500 hover:text-yellow-600'
                                  : 'text-gray-300 dark:text-gray-600 hover:text-yellow-500 opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                            >
                              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>

                            {/* Copy */}
                            <button
                              onClick={() => copyToClipboard(cmd.command, cmd.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                              title={isCopied ? t('command.copied') : t('command.copy')}
                            >
                              {isCopied ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Expand */}
                            {(cmd.example || cmd.tags.length > 0) && (
                              <button
                                onClick={() => toggleExpand(cmd.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 sm:px-6 sm:pb-4 ml-5 space-y-3">
                            {cmd.example && (
                              <div>
                                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                                  {t('command.example')}
                                </span>
                                <pre className="mt-1 font-mono bg-subtle text-sub px-4 py-3 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-all">
                                  {cmd.example}
                                </pre>
                              </div>
                            )}
                            {cmd.tags.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-muted uppercase tracking-wide">
                                  {t('command.tags')}
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {cmd.tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 text-xs bg-soft text-sub rounded-full"
                                    >
                                      {highlightText(tag, searchQuery)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
