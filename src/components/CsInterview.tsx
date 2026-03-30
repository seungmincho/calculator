'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search, Star, Check, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Shuffle, Eye, EyeOff,
  BookOpen, Target, RotateCcw, List, Play,
  BookMarked, Lightbulb, MessageCircle,
} from 'lucide-react'
import {
  CS_INTERVIEW_QUESTIONS, INTERVIEW_CATEGORY_INFO,
  type InterviewQuestion, type InterviewCategory, type InterviewDifficulty,
} from '@/data/csInterviewData'

// ── Constants ──

type Mode = 'practice' | 'browse'
type PracticeFilter = 'all' | 'review' | 'remaining'

const ALL_CATEGORIES: (InterviewCategory | 'all')[] = [
  'all', 'dataStructures', 'algorithms', 'network', 'os', 'database',
  'architecture', 'softwareEngineering', 'security', 'linux', 'web',
]

const DIFFICULTIES: InterviewDifficulty[] = ['beginner', 'intermediate', 'advanced']

const DIFF_COLORS: Record<InterviewDifficulty, { bg: string; text: string; dot: string }> = {
  beginner: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  intermediate: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  advanced: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

const CATEGORY_COLORS: Record<InterviewCategory, { bg: string; text: string; border: string }> = {
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

// ── URL helpers ──

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

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ── Component ──

export default function CsInterview() {
  const t = useTranslations('csInterview')

  // ── State ──
  const [mode, setMode] = useState<Mode>('practice')
  const [category, setCategory] = useState<InterviewCategory | 'all'>('all')
  const [difficulty, setDifficulty] = useState<InterviewDifficulty | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Practice mode
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [practiceFilter, setPracticeFilter] = useState<PracticeFilter>('all')
  const [practiceOrder, setPracticeOrder] = useState<string[]>([])

  // Browse mode
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Persistence
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set())
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set())

  // ── Init from localStorage + URL ──
  useEffect(() => {
    setMasteredIds(loadSet('cs-interview-mastered'))
    setReviewIds(loadSet('cs-interview-review'))
    setBookmarkIds(loadSet('cs-interview-bookmarks'))

    const urlMode = getUrlParam('mode')
    if (urlMode === 'practice' || urlMode === 'browse') setMode(urlMode)
    const urlCat = getUrlParam('category')
    if (urlCat && ALL_CATEGORIES.includes(urlCat as InterviewCategory | 'all')) {
      setCategory(urlCat as InterviewCategory | 'all')
    }
    const urlDiff = getUrlParam('difficulty')
    if (urlDiff && DIFFICULTIES.includes(urlDiff as InterviewDifficulty)) {
      setDifficulty(urlDiff as InterviewDifficulty)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  // ── Filtered questions ──
  const filteredQuestions = useMemo((): InterviewQuestion[] => {
    let qs: InterviewQuestion[] = CS_INTERVIEW_QUESTIONS
    if (category !== 'all') qs = qs.filter(q => q.category === category)
    if (difficulty) qs = qs.filter(q => q.difficulty === difficulty)
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      qs = qs.filter(q =>
        q.question.toLowerCase().includes(lower) ||
        q.answer.toLowerCase().includes(lower) ||
        q.keyPoints.some(kp => kp.toLowerCase().includes(lower))
      )
    }
    return qs
  }, [category, difficulty, debouncedSearch])

  // Practice-mode filtered list (applies practiceFilter on top)
  const practiceQuestions = useMemo((): InterviewQuestion[] => {
    let qs: InterviewQuestion[] = filteredQuestions
    if (practiceFilter === 'review') qs = qs.filter(q => reviewIds.has(q.id))
    else if (practiceFilter === 'remaining') qs = qs.filter(q => !masteredIds.has(q.id) && !reviewIds.has(q.id))

    // Apply shuffle order if set
    if (practiceOrder.length > 0) {
      const orderMap = new Map<string, number>(practiceOrder.map((id, i) => [id, i]))
      return [...qs].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
    }
    return qs
  }, [filteredQuestions, practiceFilter, masteredIds, reviewIds, practiceOrder])

  const currentQuestion = practiceQuestions[practiceIndex] ?? null

  // ── Browse grouped by category ──
  const groupedQuestions = useMemo(() => {
    const groups = new Map<InterviewCategory, InterviewQuestion[]>()
    for (const q of filteredQuestions) {
      if (!groups.has(q.category)) groups.set(q.category, [])
      groups.get(q.category)!.push(q)
    }
    return groups
  }, [filteredQuestions])

  // ── Stats ──
  const stats = useMemo(() => {
    const total = filteredQuestions.length
    const mastered = filteredQuestions.filter(q => masteredIds.has(q.id)).length
    const review = filteredQuestions.filter(q => reviewIds.has(q.id)).length
    const remaining = total - mastered - review
    return { total, mastered, review, remaining }
  }, [filteredQuestions, masteredIds, reviewIds])

  // ── Handlers ──

  const handleModeChange = useCallback((m: Mode) => {
    setMode(m)
    updateURL({ mode: m })
  }, [])

  const handleCategoryChange = useCallback((cat: InterviewCategory | 'all') => {
    setCategory(cat)
    setPracticeIndex(0)
    setAnswerRevealed(false)
    updateURL({ category: cat === 'all' ? null : cat })
  }, [])

  const handleDifficultyChange = useCallback((d: InterviewDifficulty | null) => {
    setDifficulty(d)
    setPracticeIndex(0)
    setAnswerRevealed(false)
    updateURL({ difficulty: d })
  }, [])

  const handleMastered = useCallback((id: string) => {
    setMasteredIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveSet('cs-interview-mastered', next)
      return next
    })
    setReviewIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      saveSet('cs-interview-review', next)
      return next
    })
    setAnswerRevealed(false)
    setPracticeIndex(i => Math.min(i + 1, practiceQuestions.length - 1))
  }, [practiceQuestions.length])

  const handleNeedsReview = useCallback((id: string) => {
    setReviewIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveSet('cs-interview-review', next)
      return next
    })
    setMasteredIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      saveSet('cs-interview-mastered', next)
      return next
    })
    setAnswerRevealed(false)
    setPracticeIndex(i => Math.min(i + 1, practiceQuestions.length - 1))
  }, [practiceQuestions.length])

  const handleBookmark = useCallback((id: string) => {
    setBookmarkIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSet('cs-interview-bookmarks', next)
      return next
    })
  }, [])

  const handleShuffle = useCallback(() => {
    const ids = shuffleArray(filteredQuestions.map(q => q.id))
    setPracticeOrder(ids)
    setPracticeIndex(0)
    setAnswerRevealed(false)
  }, [filteredQuestions])

  const handleReset = useCallback(() => {
    setMasteredIds(new Set())
    setReviewIds(new Set())
    saveSet('cs-interview-mastered', new Set())
    saveSet('cs-interview-review', new Set())
    setPracticeIndex(0)
    setAnswerRevealed(false)
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(filteredQuestions.map(q => q.id)))
  }, [filteredQuestions])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // ── Question Card Content (shared) ──
  const renderAnswerContent = (q: InterviewQuestion): React.ReactNode => (
    <div className="space-y-4 mt-4">
      {/* Model Answer */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          {t('question.answer')}
        </h4>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {q.answer}
        </p>
      </div>

      {/* Key Points */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <Target className="w-4 h-4" />
          {t('question.keyPoints')}
        </h4>
        <ul className="space-y-1.5">
          {q.keyPoints.map((kp: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{kp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Follow-up Question */}
      {q.followUp && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            {t('question.followUp')}
          </h4>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">{q.followUp}</p>
        </div>
      )}

      {/* Tip */}
      {q.tip && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4" />
            {t('question.tip')}
          </h4>
          <p className="text-sm text-amber-600 dark:text-amber-400">{q.tip}</p>
        </div>
      )}

      {/* Related Terms */}
      {q.relatedTermIds && q.relatedTermIds.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('question.relatedTerms')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {q.relatedTermIds.map((termId: string) => (
              <a
                key={termId}
                href={`/cs-dictionary?q=${encodeURIComponent(termId)}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <BookMarked className="w-3 h-3" />
                {termId}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Badges ──
  const renderBadges = (q: InterviewQuestion): React.ReactNode => {
    const catColor = CATEGORY_COLORS[q.category]
    const diffColor = DIFF_COLORS[q.difficulty]
    const catInfo = INTERVIEW_CATEGORY_INFO[q.category]
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${catColor.bg} ${catColor.text}`}>
          {catInfo?.icon} {catInfo?.nameKo}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${diffColor.bg} ${diffColor.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${diffColor.dot}`} />
          {t(`difficulty.${q.difficulty}`)}
        </span>
        {masteredIds.has(q.id) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <Check className="w-3 h-3" /> {t('practice.mastered')}
          </span>
        )}
        {reviewIds.has(q.id) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
            <RotateCcw className="w-3 h-3" /> {t('practice.needsReview')}
          </span>
        )}
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.total')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.mastered}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.mastered')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.review}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.needsReview')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.remaining}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.remaining')}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: stats.total ? `${(stats.mastered / stats.total) * 100}%` : '0%' }}
          />
          <div
            className="absolute top-0 h-full bg-red-400 transition-all duration-300"
            style={{
              left: stats.total ? `${(stats.mastered / stats.total) * 100}%` : '0%',
              width: stats.total ? `${(stats.review / stats.total) * 100}%` : '0%',
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('stats.progress')}</span>
          <span>{stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0}%</span>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => handleModeChange('practice')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'practice'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          {t('mode.practice')}
        </button>
        <button
          onClick={() => handleModeChange('browse')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'browse'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          {t('mode.browse')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
        {/* Category filter */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('filter.category')}</div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => {
              const isActive = category === cat
              const info = cat === 'all' ? null : INTERVIEW_CATEGORY_INFO[cat]
              const colors = cat === 'all' ? null : CATEGORY_COLORS[cat]
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    isActive
                      ? cat === 'all'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                        : `${colors!.bg} ${colors!.text} ${colors!.border}`
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {cat === 'all' ? t('filter.all') : <>{info?.icon} {info?.nameKo}</>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty filter */}
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('filter.difficulty')}</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDifficultyChange(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                difficulty === null
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {t('filter.all')}
            </button>
            {DIFFICULTIES.map(d => {
              const colors = DIFF_COLORS[d]
              return (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(difficulty === d ? null : d)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    difficulty === d
                      ? `${colors.bg} ${colors.text} border-transparent`
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {t(`difficulty.${d}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reset progress */}
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('stats.progress')}
          </button>
        </div>
      </div>

      {/* ── PRACTICE MODE ── */}
      {mode === 'practice' && (
        <div className="space-y-4">
          {/* Practice controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {(['all', 'review', 'remaining'] as PracticeFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => { setPracticeFilter(f); setPracticeIndex(0); setAnswerRevealed(false) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    practiceFilter === f
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(`practice.filter.${f}`)}
                </button>
              ))}
            </div>
            <button
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {t('practice.shuffle')}
            </button>
            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {practiceQuestions.length > 0
                ? `${practiceIndex + 1} / ${practiceQuestions.length}`
                : `0 / 0`}
            </div>
          </div>

          {/* Question Card */}
          {currentQuestion ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
              {/* Top: badges + bookmark */}
              <div className="flex items-start justify-between gap-2 mb-4">
                {renderBadges(currentQuestion)}
                <button
                  onClick={() => handleBookmark(currentQuestion.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={bookmarkIds.has(currentQuestion.id) ? t('bookmark.remove') : t('bookmark.add')}
                >
                  <Star
                    className={`w-5 h-5 ${
                      bookmarkIds.has(currentQuestion.id)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                </button>
              </div>

              {/* Question */}
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-relaxed mb-6">
                {currentQuestion.question}
              </h3>

              {/* Answer toggle */}
              {!answerRevealed ? (
                <button
                  onClick={() => setAnswerRevealed(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {t('practice.showAnswer')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAnswerRevealed(false)}
                    className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-3 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    {t('practice.hideAnswer')}
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    {renderAnswerContent(currentQuestion)}
                  </div>

                  {/* Self-evaluation */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleMastered(currentQuestion.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      {t('practice.mastered')}
                    </button>
                    <button
                      onClick={() => handleNeedsReview(currentQuestion.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      {t('practice.needsReview')}
                    </button>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { setPracticeIndex(i => Math.max(0, i - 1)); setAnswerRevealed(false) }}
                  disabled={practiceIndex === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('practice.prev')}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {practiceIndex + 1} / {practiceQuestions.length}
                </span>
                <button
                  onClick={() => { setPracticeIndex(i => Math.min(practiceQuestions.length - 1, i + 1)); setAnswerRevealed(false) }}
                  disabled={practiceIndex >= practiceQuestions.length - 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('practice.next')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('search.noResults')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── BROWSE MODE ── */}
      {mode === 'browse' && (
        <div className="space-y-4">
          {/* Search + controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                {t('browse.expandAll')}
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                {t('browse.collapseAll')}
              </button>
            </div>
          </div>

          {/* Grouped questions */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('search.noResults')}</p>
            </div>
          ) : (
            Array.from(groupedQuestions.entries()).map(([cat, questions]) => {
              const catColor = CATEGORY_COLORS[cat]
              const catInfo = INTERVIEW_CATEGORY_INFO[cat]
              return (
                <div key={cat} className="space-y-2">
                  {/* Category header */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${catColor.bg}`}>
                    <span className="text-lg">{catInfo?.icon}</span>
                    <h3 className={`text-sm font-semibold ${catColor.text}`}>
                      {catInfo?.nameKo}
                    </h3>
                    <span className={`text-xs ${catColor.text} opacity-70`}>
                      ({questions.length})
                    </span>
                  </div>

                  {/* Accordion items */}
                  <div className="space-y-1">
                    {questions.map(q => {
                      const isExpanded = expandedIds.has(q.id)
                      return (
                        <div
                          key={q.id}
                          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                        >
                          {/* Accordion header */}
                          <button
                            onClick={() => toggleExpanded(q.id)}
                            className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                {renderBadges(q)}
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                                {q.question}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 mt-1">
                              <button
                                onClick={e => { e.stopPropagation(); handleBookmark(q.id) }}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title={bookmarkIds.has(q.id) ? t('bookmark.remove') : t('bookmark.add')}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    bookmarkIds.has(q.id)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-400 dark:text-gray-500'
                                  }`}
                                />
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Accordion content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                              {renderAnswerContent(q)}
                              {/* Quick evaluate buttons */}
                              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                  onClick={() => handleMastered(q.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                    masteredIds.has(q.id)
                                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-green-300 hover:text-green-600'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {t('practice.mastered')}
                                </button>
                                <button
                                  onClick={() => handleNeedsReview(q.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                    reviewIds.has(q.id)
                                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-red-300 hover:text-red-600'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  {t('practice.needsReview')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
