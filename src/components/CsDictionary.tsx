'use client'

import { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, BookOpen, Star, Check, ChevronDown, ChevronUp,
  LayoutGrid, List, Filter, X, BookMarked, GraduationCap,
  ExternalLink,
} from 'lucide-react'
import { CS_DICTIONARY_TERMS, CATEGORY_INFO, type CsTerm, type TermCategory, type TermDifficulty } from '@/data/csDictionaryData'
import GuideSection from '@/components/GuideSection'

// ── Constants ──

const ALL_CATEGORIES: (TermCategory | 'all')[] = [
  'all', 'dataStructures', 'algorithms', 'network', 'os', 'database',
  'architecture', 'softwareEngineering', 'security', 'linux', 'web',
]

const DIFFICULTIES: TermDifficulty[] = ['beginner', 'intermediate', 'advanced']

const DIFF_COLORS: Record<TermDifficulty, { bg: string; text: string; dot: string }> = {
  beginner: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  intermediate: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  advanced: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

const CATEGORY_COLORS: Record<TermCategory, { bg: string; text: string; border: string }> = {
  dataStructures: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  algorithms: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  network: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700' },
  os: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  database: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  architecture: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  softwareEngineering: { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
  security: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  linux: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  web: { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700' },
}

type ViewMode = 'list' | 'card'
type LearningFilter = 'all' | 'learned' | 'notLearned' | 'bookmarked'

// ── localStorage helpers ──

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

// ── URL param helpers ──

function getUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  return new URL(window.location.href).searchParams.get(key)
}

function updateURL(params: Record<string, string | null>) {
  const url = new URL(window.location.href)
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === '' || v === 'all') url.searchParams.delete(k)
    else url.searchParams.set(k, v)
  })
  window.history.replaceState({}, '', url)
}

// ── Component ──

export default function CsDictionary() {
  const t = useTranslations('csDictionary')

  // State
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<TermCategory | 'all'>('all')
  const [difficulty, setDifficulty] = useState<TermDifficulty | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [learningFilter, setLearningFilter] = useState<LearningFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set())
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const termRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init from localStorage + URL
  useEffect(() => {
    setLearnedIds(loadSet('cs-dictionary-progress'))
    setBookmarkIds(loadSet('cs-dictionary-bookmarks'))

    const urlCat = getUrlParam('category')
    const urlDiff = getUrlParam('difficulty')
    const urlSearch = getUrlParam('q')
    const urlView = getUrlParam('view')
    if (urlCat && ALL_CATEGORIES.includes(urlCat as TermCategory | 'all')) setCategory(urlCat as TermCategory | 'all')
    if (urlDiff && DIFFICULTIES.includes(urlDiff as TermDifficulty)) setDifficulty(urlDiff as TermDifficulty)
    if (urlSearch) { setSearchInput(urlSearch); setDebouncedSearch(urlSearch) }
    if (urlView === 'card') setViewMode('card')
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput)
      updateURL({ q: searchInput || null })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // Sync filters to URL
  useEffect(() => {
    updateURL({
      category: category === 'all' ? null : category,
      difficulty: difficulty,
      view: viewMode === 'list' ? null : viewMode,
    })
  }, [category, difficulty, viewMode])

  // Toggle helpers
  const toggleLearned = useCallback((id: string) => {
    setLearnedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSet('cs-dictionary-progress', next)
      return next
    })
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarkIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSet('cs-dictionary-bookmarks', next)
      return next
    })
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Navigate to related term
  const scrollToTerm = useCallback((id: string) => {
    setHighlightId(id)
    setExpandedIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      termRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightId(null), 2000)
    }, 100)
  }, [])

  // Filtered results
  const filteredTerms = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim()
    return CS_DICTIONARY_TERMS.filter(term => {
      if (category !== 'all' && term.category !== category) return false
      if (difficulty && term.difficulty !== difficulty) return false
      if (learningFilter === 'learned' && !learnedIds.has(term.id)) return false
      if (learningFilter === 'notLearned' && learnedIds.has(term.id)) return false
      if (learningFilter === 'bookmarked' && !bookmarkIds.has(term.id)) return false
      if (query) {
        const haystack = `${term.nameKo} ${term.nameEn} ${term.shortDef} ${term.description}`.toLowerCase()
        return haystack.includes(query)
      }
      return true
    })
  }, [debouncedSearch, category, difficulty, learningFilter, learnedIds, bookmarkIds])

  // Stats
  const totalTerms = CS_DICTIONARY_TERMS.length
  const learnedCount = learnedIds.size
  const bookmarkCount = bookmarkIds.size
  const progressPct = totalTerms > 0 ? Math.round((learnedCount / totalTerms) * 100) : 0

  // Category counts for stats
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    CS_DICTIONARY_TERMS.forEach(term => {
      counts[term.category] = (counts[term.category] || 0) + 1
    })
    return counts
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<BookOpen className="w-5 h-5 text-blue-500" />} label={t('stats.total')} value={totalTerms} />
          <StatCard icon={<Check className="w-5 h-5 text-green-500" />} label={t('stats.learned')} value={learnedCount} />
          <StatCard icon={<Star className="w-5 h-5 text-yellow-500" />} label={t('stats.bookmarked')} value={bookmarkCount} />
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stats.progress')}</span>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{progressPct}%</span>
          </div>
        </div>

        {/* Mini category distribution */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_INFO) as TermCategory[]).map(cat => (
            <span
              key={cat}
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text}`}
            >
              {CATEGORY_INFO[cat].icon} {categoryCounts[cat] || 0}
            </span>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            {t('filter.category')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map(cat => {
              const isActive = category === cat
              const info = cat === 'all' ? { icon: '📚', nameKo: '' } : CATEGORY_INFO[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{cat === 'all' ? t('filter.all') : info.nameKo}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty + Learning status + View mode */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('filter.difficulty')}:</span>
            <div className="flex gap-1">
              {DIFFICULTIES.map(d => {
                const isActive = difficulty === d
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(isActive ? null : d)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? `${DIFF_COLORS[d].bg} ${DIFF_COLORS[d].text} ring-1 ring-current`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${DIFF_COLORS[d].dot}`} />
                    {t(`difficulty.${d}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Learning status */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('filter.status')}:</span>
            <div className="flex gap-1">
              {(['all', 'learned', 'notLearned', 'bookmarked'] as LearningFilter[]).map(s => {
                const isActive = learningFilter === s
                const icons: Record<LearningFilter, React.ReactNode> = {
                  all: null,
                  learned: <Check className="w-3 h-3" />,
                  notLearned: <GraduationCap className="w-3 h-3" />,
                  bookmarked: <BookMarked className="w-3 h-3" />,
                }
                return (
                  <button
                    key={s}
                    onClick={() => setLearningFilter(s)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {icons[s]}
                    {t(`status.${s}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title={t('view.list')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title={t('view.card')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {debouncedSearch
            ? t('search.resultCount', { count: filteredTerms.length })
            : `${filteredTerms.length} / ${totalTerms}`}
        </span>
      </div>

      {/* Terms display */}
      {filteredTerms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('search.noResults')}</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredTerms.map(term => (
            <ListItem
              key={term.id}
              term={term}
              expanded={expandedIds.has(term.id)}
              learned={learnedIds.has(term.id)}
              bookmarked={bookmarkIds.has(term.id)}
              highlighted={highlightId === term.id}
              onToggleExpand={() => toggleExpanded(term.id)}
              onToggleLearned={() => toggleLearned(term.id)}
              onToggleBookmark={() => toggleBookmark(term.id)}
              onRelatedClick={scrollToTerm}
              ref={el => { termRefs.current[term.id] = el }}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTerms.map(term => (
            <CardItem
              key={term.id}
              term={term}
              learned={learnedIds.has(term.id)}
              bookmarked={bookmarkIds.has(term.id)}
              highlighted={highlightId === term.id}
              onToggleLearned={() => toggleLearned(term.id)}
              onToggleBookmark={() => toggleBookmark(term.id)}
              onRelatedClick={scrollToTerm}
              ref={el => { termRefs.current[term.id] = el }}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Related Tools */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('relatedTools.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RelatedToolLink href="/cs-quiz" icon="📝" label={t('relatedTools.quiz')} />
          <RelatedToolLink href="/cs-visualizer" icon="🔬" label={t('relatedTools.visualizer')} />
          <RelatedToolLink href="/algorithm" icon="📊" label={t('relatedTools.algorithm')} />
        </div>
      </div>

      {/* Guide */}
      <GuideSection namespace="csDictionary" />
    </div>
  )
}

// ── Sub-components ──

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      {icon}
      <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  )
}

function RelatedToolLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-gray-400 ml-auto" />
    </a>
  )
}

// ── Badges ──

function CategoryBadge({ category }: { category: TermCategory }) {
  const colors = CATEGORY_COLORS[category]
  const info = CATEGORY_INFO[category]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {info.icon} {info.nameKo}
    </span>
  )
}

function DifficultyBadge({ difficulty, t }: { difficulty: TermDifficulty; t: ReturnType<typeof useTranslations> }) {
  const colors = DIFF_COLORS[difficulty]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {t(`difficulty.${difficulty}`)}
    </span>
  )
}

// ── List Item (Accordion) ──

const ListItem = forwardRef<HTMLDivElement, {
  term: CsTerm
  expanded: boolean
  learned: boolean
  bookmarked: boolean
  highlighted: boolean
  onToggleExpand: () => void
  onToggleLearned: () => void
  onToggleBookmark: () => void
  onRelatedClick: (id: string) => void
  t: ReturnType<typeof useTranslations>
}>(({ term, expanded, learned, bookmarked, highlighted, onToggleExpand, onToggleLearned, onToggleBookmark, onRelatedClick, t }, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all duration-300 ${
        highlighted ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white">{term.nameKo}</span>
            <span className="text-sm text-gray-400 dark:text-gray-500">{term.nameEn}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{term.shortDef}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CategoryBadge category={term.category} />
          <DifficultyBadge difficulty={term.difficulty} t={t} />
          {learned && <Check className="w-4 h-4 text-green-500" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <TermDetail
            term={term}
            learned={learned}
            bookmarked={bookmarked}
            onToggleLearned={onToggleLearned}
            onToggleBookmark={onToggleBookmark}
            onRelatedClick={onRelatedClick}
            t={t}
          />
        </div>
      )}
    </div>
  )
})
ListItem.displayName = 'ListItem'

// ── Card Item ──

const CardItem = forwardRef<HTMLDivElement, {
  term: CsTerm
  learned: boolean
  bookmarked: boolean
  highlighted: boolean
  onToggleLearned: () => void
  onToggleBookmark: () => void
  onRelatedClick: (id: string) => void
  t: ReturnType<typeof useTranslations>
}>(({ term, learned, bookmarked, highlighted, onToggleLearned, onToggleBookmark, onRelatedClick, t }, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border transition-all duration-300 ${
        highlighted ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{term.nameKo}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">{term.nameEn}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CategoryBadge category={term.category} />
          <DifficultyBadge difficulty={term.difficulty} t={t} />
        </div>
      </div>
      <TermDetail
        term={term}
        learned={learned}
        bookmarked={bookmarked}
        onToggleLearned={onToggleLearned}
        onToggleBookmark={onToggleBookmark}
        onRelatedClick={onRelatedClick}
        t={t}
      />
    </div>
  )
})
CardItem.displayName = 'CardItem'

// ── Shared Term Detail ──

function TermDetail({
  term, learned, bookmarked, onToggleLearned, onToggleBookmark, onRelatedClick, t,
}: {
  term: CsTerm
  learned: boolean
  bookmarked: boolean
  onToggleLearned: () => void
  onToggleBookmark: () => void
  onRelatedClick: (id: string) => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="space-y-3">
      {/* Short def */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('term.definition')}</h4>
        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{term.shortDef}</p>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('term.description')}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{term.description}</p>
      </div>

      {/* Example */}
      {term.example && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('term.example')}</h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
            {term.example}
          </div>
        </div>
      )}

      {/* Related terms */}
      {term.relatedTermIds && term.relatedTermIds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('term.relatedTermIds')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {term.relatedTermIds.map(relId => {
              const related = CS_DICTIONARY_TERMS.find(t => t.id === relId)
              if (!related) return null
              return (
                <button
                  key={relId}
                  onClick={() => onRelatedClick(relId)}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {related.nameKo}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onToggleLearned}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            learned
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {learned ? t('learning.markNotLearned') : t('learning.markLearned')}
        </button>
        <button
          onClick={onToggleBookmark}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            bookmarked
              ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${bookmarked ? 'fill-yellow-500' : ''}`} />
        </button>
      </div>
    </div>
  )
}
