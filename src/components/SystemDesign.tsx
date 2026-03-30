'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft, Star, BookMarked, ChevronDown, ChevronUp,
  Play, CheckCircle, Target, Layers, Server, Zap,
  Scale, Lightbulb, ArrowRight,
} from 'lucide-react'
import {
  SYSTEM_DESIGN_QUESTIONS, DESIGN_CATEGORIES,
  type SystemDesignQuestion, type DesignCategory, type DesignDifficulty,
} from '@/data/systemDesignData'

type Mode = 'overview' | 'detail'
type DetailTab = 'requirements' | 'estimation' | 'architecture' | 'deepDive' | 'scaleTradeoffs'

const CATEGORY_COLORS: Record<DesignCategory, { bg: string; text: string; border: string }> = {
  web: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  data: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  messaging: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  storage: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  infrastructure: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
}

const DIFFICULTY_COLORS: Record<DesignDifficulty, { bg: string; text: string }> = {
  intermediate: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300' },
  advanced: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  expert: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
}

const CATEGORY_ICONS: Record<DesignCategory, string> = {
  web: '🌐', data: '📊', messaging: '💬', storage: '💾', infrastructure: '🏗️',
}

const TABS: DetailTab[] = ['requirements', 'estimation', 'architecture', 'deepDive', 'scaleTradeoffs']

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveToStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

export default function SystemDesign() {
  const t = useTranslations('systemDesign')

  const [mode, setMode] = useState<Mode>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('requirements')
  const [categoryFilter, setCategoryFilter] = useState<DesignCategory | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<DesignDifficulty | 'all'>('all')

  // Practice mode
  const [practicing, setPracticing] = useState(false)
  const [practiceStep, setPracticeStep] = useState(0)

  // Accordion state for deep dive
  const [expandedDive, setExpandedDive] = useState<number | null>(null)

  // Persisted state
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    setBookmarks(loadFromStorage<string[]>('system-design-bookmarks', []))
    setCompleted(loadFromStorage<string[]>('system-design-completed', []))
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
      saveToStorage('system-design-bookmarks', next)
      return next
    })
  }, [])

  const markCompleted = useCallback((id: string) => {
    setCompleted(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      saveToStorage('system-design-completed', next)
      return next
    })
  }, [])

  const filteredQuestions = useMemo(() => {
    return SYSTEM_DESIGN_QUESTIONS.filter(q => {
      if (categoryFilter !== 'all' && q.category !== categoryFilter) return false
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false
      return true
    })
  }, [categoryFilter, difficultyFilter])

  const selectedQuestion = useMemo(() => {
    return SYSTEM_DESIGN_QUESTIONS.find(q => q.id === selectedId) || null
  }, [selectedId])

  const openDetail = useCallback((id: string) => {
    setSelectedId(id)
    setMode('detail')
    setActiveTab('requirements')
    setPracticing(false)
    setPracticeStep(0)
    setExpandedDive(null)
  }, [])

  const backToOverview = useCallback(() => {
    setMode('overview')
    setSelectedId(null)
    setPracticing(false)
    setPracticeStep(0)
  }, [])

  const startPractice = useCallback(() => {
    setPracticing(true)
    setPracticeStep(0)
    setActiveTab('requirements')
  }, [])

  const nextPracticeStep = useCallback(() => {
    setPracticeStep(prev => {
      const next = prev + 1
      if (next >= TABS.length && selectedId) {
        markCompleted(selectedId)
      }
      if (next < TABS.length) {
        setActiveTab(TABS[next])
      }
      return next
    })
  }, [selectedId, markCompleted])

  const resetPractice = useCallback(() => {
    setPracticing(false)
    setPracticeStep(0)
    setActiveTab('requirements')
  }, [])

  // ── Overview Mode ──
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{SYSTEM_DESIGN_QUESTIONS.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.total')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completed.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.completed')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bookmarks.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('stats.bookmarked')}</div>
        </div>
      </div>

      {/* Category filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filter.all')}
          </button>
          {(Object.keys(DESIGN_CATEGORIES) as DesignCategory[]).map(cat => {
            const catInfo = DESIGN_CATEGORIES[cat]
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ring-2 ${CATEGORY_COLORS[cat].border}`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {catInfo.icon} {catInfo.nameKo}
              </button>
            )
          })}
        </div>

        {/* Difficulty filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDifficultyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              difficultyFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('filter.all')}
          </button>
          {(['intermediate', 'advanced', 'expert'] as DesignDifficulty[]).map(diff => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                difficultyFilter === diff
                  ? `${DIFFICULTY_COLORS[diff].bg} ${DIFFICULTY_COLORS[diff].text}`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`difficulty.${diff}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Problem cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredQuestions.map(q => {
          const isBookmarked = bookmarks.includes(q.id)
          const isCompleted = completed.includes(q.id)
          return (
            <div
              key={q.id}
              onClick={() => openDetail(q.id)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-0.5 relative group"
            >
              {/* Bookmark star */}
              <button
                onClick={e => { e.stopPropagation(); toggleBookmark(q.id) }}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'}`} />
              </button>

              {/* Completed check */}
              {isCompleted && (
                <div className="absolute top-3 right-10">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[q.category].bg} ${CATEGORY_COLORS[q.category].text}`}>
                  {DESIGN_CATEGORIES[q.category].icon} {DESIGN_CATEGORIES[q.category].nameKo}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text}`}>
                  {t(`difficulty.${q.difficulty}`)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 pr-12">{q.title}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{q.titleEn}</p>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{q.description}</p>

              {/* Components count */}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {q.architecture.components.length} {t('section.components')}</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {q.deepDive.length} {t('tab.deepDive')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('filter.noResults')}
        </div>
      )}
    </div>
  )

  // ── Detail Mode ──
  const renderDetail = () => {
    if (!selectedQuestion) return null
    const q = selectedQuestion
    const isBookmarked = bookmarks.includes(q.id)
    const isPracticeComplete = practiceStep >= TABS.length

    const shouldShowTab = (tabIndex: number) => {
      if (!practicing) return true
      return tabIndex <= practiceStep
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={backToOverview}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('back')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleBookmark(q.id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
            </button>

            {!practicing ? (
              <button
                onClick={startPractice}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                {t('practice.start')}
              </button>
            ) : (
              <button
                onClick={resetPractice}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('practice.reset')}
              </button>
            )}
          </div>
        </div>

        {/* Title card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[q.category].bg} ${CATEGORY_COLORS[q.category].text}`}>
              {DESIGN_CATEGORIES[q.category].icon} {DESIGN_CATEGORIES[q.category].nameKo}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text}`}>
              {t(`difficulty.${q.difficulty}`)}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{q.title}</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{q.titleEn}</p>
          <p className="text-gray-600 dark:text-gray-300 mt-3">{q.description}</p>

          {/* Practice progress */}
          {practicing && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {isPracticeComplete
                    ? t('practice.complete')
                    : `${t('practice.step')} ${practiceStep + 1} / ${TABS.length}`
                  }
                </span>
                {!isPracticeComplete && (
                  <button
                    onClick={nextPracticeStep}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                  >
                    {t('practice.next')} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((practiceStep + 1) / TABS.length) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1.5">
          {TABS.map((tab, idx) => {
            const visible = shouldShowTab(idx)
            if (!visible) return null
            const icons = {
              requirements: <Target className="w-4 h-4" />,
              estimation: <BookMarked className="w-4 h-4" />,
              architecture: <Server className="w-4 h-4" />,
              deepDive: <Layers className="w-4 h-4" />,
              scaleTradeoffs: <Scale className="w-4 h-4" />,
            }
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {icons[tab]}
                {t(`tab.${tab}`)}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {activeTab === 'requirements' && renderRequirements(q)}
          {activeTab === 'estimation' && renderEstimation(q)}
          {activeTab === 'architecture' && renderArchitecture(q)}
          {activeTab === 'deepDive' && renderDeepDive(q)}
          {activeTab === 'scaleTradeoffs' && renderScaleTradeoffs(q)}
        </div>
      </div>
    )
  }

  const renderRequirements = (q: SystemDesignQuestion) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          {t('section.functional')}
        </h3>
        <ol className="space-y-2">
          {q.requirements.functional.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          {t('section.nonFunctional')}
        </h3>
        <ol className="space-y-2">
          {q.requirements.nonFunctional.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )

  const renderEstimation = (q: SystemDesignQuestion) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <BookMarked className="w-5 h-5 text-purple-500" />
        {q.estimations.title}
      </h3>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
        {q.estimations.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
            <span className="text-purple-500 flex-shrink-0">{'>'}</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )

  const renderArchitecture = (q: SystemDesignQuestion) => (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('tab.architecture')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{q.architecture.overview}</p>
      </div>

      {/* ASCII diagram */}
      {q.diagramAscii && (
        <div className="font-mono bg-gray-900 dark:bg-gray-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre leading-relaxed">
          {q.diagramAscii}
        </div>
      )}

      {/* Components */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-500" />
          {t('section.components')}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {q.architecture.components.map((comp, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{comp.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{comp.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data flow */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-teal-500" />
          {t('section.dataFlow')}
        </h3>
        <div className="space-y-0">
          {q.architecture.dataFlow.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {i < q.architecture.dataFlow.length - 1 && (
                  <div className="w-0.5 h-6 bg-teal-200 dark:bg-teal-800" />
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 pt-1">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDeepDive = (q: SystemDesignQuestion) => (
    <div className="space-y-2">
      {q.deepDive.map((dive, i) => {
        const isExpanded = expandedDive === i
        return (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedDive(isExpanded ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="font-medium text-sm text-gray-900 dark:text-white">{dive.title}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {dive.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderScaleTradeoffs = (q: SystemDesignQuestion) => (
    <div className="space-y-6">
      {/* Scalability */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-500" />
          {t('section.scalability')}
        </h3>
        <div className="space-y-2">
          {q.scalability.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500 flex-shrink-0 mt-0.5">&#x2191;</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Tradeoffs */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Scale className="w-5 h-5 text-orange-500" />
          {t('section.tradeoffs')}
        </h3>
        <div className="space-y-2">
          {q.tradeoffs.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Scale className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Interview tips */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          {t('section.interviewTips')}
        </h3>
        <div className="space-y-2">
          {q.interviewTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {mode === 'overview' ? renderOverview() : renderDetail()}
    </div>
  )
}
