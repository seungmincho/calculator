'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, Star, Check, ChevronDown, ChevronUp, Code, Clock,
  Database, AlertTriangle, Lightbulb, BookOpen, Zap,
} from 'lucide-react'
import {
  CODING_PATTERNS, PATTERN_CATEGORIES,
  type CodingPattern, type PatternCategory, type PatternDifficulty,
} from '@/data/codingPatternsData'


const CATEGORY_COLORS: Record<PatternCategory, { bg: string; text: string; border: string }> = {
  array:  { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  string: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  tree:   { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  graph:  { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  dp:     { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  design: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
}

const DIFF_COLORS: Record<PatternDifficulty, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function loadSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

export default function CodingPatterns() {
  const t = useTranslations('codingPatterns')

  const [selectedCategory, setSelectedCategory] = useState<PatternCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [studied, setStudied] = useState<Set<string>>(new Set())
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)

  useEffect(() => {
    setStudied(loadSet('coding-patterns-progress'))
    setBookmarks(loadSet('coding-patterns-bookmarks'))
  }, [])

  const toggleStudied = useCallback((id: string) => {
    setStudied(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      saveSet('coding-patterns-progress', next)
      return next
    })
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      saveSet('coding-patterns-bookmarks', next)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    let list = CODING_PATTERNS
    if (showBookmarksOnly) {
      list = list.filter(p => bookmarks.has(p.id))
    }
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    }
    return list
  }, [selectedCategory, searchQuery, showBookmarksOnly, bookmarks])

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; studied: number }> = {}
    for (const cat of Object.keys(PATTERN_CATEGORIES) as PatternCategory[]) {
      const inCat = CODING_PATTERNS.filter(p => p.category === cat)
      stats[cat] = {
        total: inCat.length,
        studied: inCat.filter(p => studied.has(p.id)).length,
      }
    }
    return stats
  }, [studied])

  const progressPct = CODING_PATTERNS.length > 0
    ? Math.round((studied.size / CODING_PATTERNS.length) * 100)
    : 0

  const scrollToPattern = useCallback((id: string) => {
    setExpandedId(id)
    setTimeout(() => {
      document.getElementById(`pattern-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Code className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Progress Bar + Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('stats.progress')}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('stats.studied')}: {studied.size} / {t('stats.total')}: {CODING_PATTERNS.length} ({progressPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Per-category mini progress */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
          {(Object.keys(PATTERN_CATEGORIES) as PatternCategory[]).map(cat => {
            const s = categoryStats[cat]
            const pct = s.total > 0 ? Math.round((s.studied / s.total) * 100) : 0
            return (
              <div key={cat} className={`rounded-lg p-2 text-center ${CATEGORY_COLORS[cat].bg}`}>
                <span className="text-lg">{PATTERN_CATEGORIES[cat].icon}</span>
                <p className={`text-xs font-medium ${CATEGORY_COLORS[cat].text}`}>{cat}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.studied}/{s.total}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                  <div className="bg-green-500 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('filter.category')}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        {/* Category Tabs + Bookmark Toggle */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              showBookmarksOnly
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 ring-1 ring-yellow-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {bookmarks.size}
          </button>
          <span className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filter.all')}
          </button>
          {(Object.keys(PATTERN_CATEGORIES) as PatternCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{PATTERN_CATEGORIES[cat].icon}</span>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern Cards Grid */}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
        {filtered.map(pattern => {
          const isExpanded = expandedId === pattern.id
          const catColor = CATEGORY_COLORS[pattern.category]
          return (
            <div
              key={pattern.id}
              id={`pattern-${pattern.id}`}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border transition-all ${
                isExpanded ? 'lg:col-span-3 md:col-span-2 col-span-1 border-blue-300 dark:border-blue-700' : 'border-transparent hover:shadow-xl'
              }`}
            >
              {/* Card Header */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${catColor.bg} ${catColor.text}`}>
                      {PATTERN_CATEGORIES[pattern.category].icon} {pattern.category}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${DIFF_COLORS[pattern.difficulty]}`}>
                      {t(`difficulty.${pattern.difficulty}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); toggleBookmark(pattern.id) }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Bookmark"
                    >
                      <Star className={`w-4 h-4 ${bookmarks.has(pattern.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleStudied(pattern.id) }}
                      className={`p-1 rounded ${studied.has(pattern.id) ? 'bg-green-100 dark:bg-green-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title={studied.has(pattern.id) ? t('learning.markNotStudied') : t('learning.markStudied')}
                    >
                      <Check className={`w-4 h-4 ${studied.has(pattern.id) ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pattern.name}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{pattern.nameEn}</p>
                {!isExpanded && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{pattern.description}</p>
                )}
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <PatternDetail
                  pattern={pattern}
                  t={t}
                  onRelatedClick={scrollToPattern}
                />
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          {showBookmarksOnly ? (
            <>
              <Star className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('filter.all')}
              </p>
              <button
                onClick={() => setShowBookmarksOnly(false)}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('filter.all')}
              </button>
            </>
          ) : (
            <>
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('filter.all')}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('filter.all')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Pattern Detail Sub-component ─── */

interface PatternDetailProps {
  pattern: CodingPattern
  t: ReturnType<typeof useTranslations>
  onRelatedClick: (id: string) => void
}

function PatternDetail({ pattern, t, onRelatedClick }: PatternDetailProps) {
  const catColor = CATEGORY_COLORS[pattern.category]

  return (
    <div className="px-5 pb-6 space-y-5 border-t border-gray-100 dark:border-gray-700">
      {/* Description */}
      <div className="pt-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pattern.description}</p>
      </div>

      {/* When to Use */}
      <Section icon={<Zap className="w-4 h-4" />} title={t('section.whenToUse')}>
        <ul className="space-y-1.5">
          {pattern.whenToUse.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Approach */}
      <Section icon={<BookOpen className="w-4 h-4" />} title={t('section.approach')}>
        <ol className="space-y-1.5 list-decimal list-inside">
          {pattern.approach.map((step, i) => (
            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{step}</li>
          ))}
        </ol>
      </Section>

      {/* Complexity */}
      <Section icon={<Clock className="w-4 h-4" />} title={t('section.complexity')}>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">{t('time')}:</span>
            <span className="font-semibold text-blue-700 dark:text-blue-300">{pattern.timeComplexity}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-sm font-mono">
            <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-500 dark:text-gray-400 text-xs">{t('space')}:</span>
            <span className="font-semibold text-purple-700 dark:text-purple-300">{pattern.spaceComplexity}</span>
          </span>
        </div>
      </Section>

      {/* Pseudocode */}
      <Section icon={<Code className="w-4 h-4" />} title={t('section.pseudocode')}>
        <pre className="font-mono bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre">
          {pattern.pseudocode}
        </pre>
      </Section>

      {/* Example Problems */}
      <Section icon={<Database className="w-4 h-4" />} title={t('section.examples')}>
        <div className="grid sm:grid-cols-2 gap-3">
          {pattern.examples.map((ex, i) => (
            <div key={i} className={`rounded-lg border p-3 ${catColor.border} ${catColor.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${DIFF_COLORS[ex.difficulty]}`}>
                  {t(`difficulty.${ex.difficulty}`)}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{ex.hint}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Common Mistakes */}
      <Section icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title={t('section.mistakes')}>
        <ul className="space-y-1.5">
          {pattern.commonMistakes.map((m, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Related Patterns */}
      {pattern.relatedPatterns.length > 0 && (
        <Section icon={<Zap className="w-4 h-4" />} title={t('section.relatedPatterns')}>
          <div className="flex flex-wrap gap-2">
            {pattern.relatedPatterns.map(rpId => {
              const rp = CODING_PATTERNS.find(p => p.id === rpId)
              if (!rp) return null
              return (
                <button
                  key={rpId}
                  onClick={() => onRelatedClick(rpId)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  {PATTERN_CATEGORIES[rp.category].icon} {rp.name}
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-0.5">{t('section.tip')}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">{pattern.tip}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Reusable Section Wrapper ─── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {icon} {title}
      </h4>
      {children}
    </div>
  )
}
