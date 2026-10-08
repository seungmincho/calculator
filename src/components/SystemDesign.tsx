'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/systemDesign'
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

const DIFFICULTY_COLORS: Record<DesignDifficulty, { bg: string; text: string }> = {
  intermediate: { bg: 'bg-soft', text: 'text-body' },
  advanced: { bg: 'bg-soft', text: 'text-body' },
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
        <div className="ui-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-fg">{SYSTEM_DESIGN_QUESTIONS.length}</div>
          <div className="text-xs text-muted">{t('stats.total')}</div>
        </div>
        <div className="ui-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{completed.length}</div>
          <div className="text-xs text-muted">{t('stats.completed')}</div>
        </div>
        <div className="ui-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-fg">{bookmarks.length}</div>
          <div className="text-xs text-muted">{t('stats.bookmarked')}</div>
        </div>
      </div>

      {/* Category filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-soft text-body hover:bg-subtle'
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
                    ? 'bg-primary text-white'
                    : 'bg-soft text-body hover:bg-subtle'
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
                ? 'bg-primary text-white'
                : 'bg-soft text-body hover:bg-subtle'
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
                  ? 'bg-primary text-white'
                  : 'bg-soft text-body hover:bg-subtle'
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
              className="ui-card rounded-xl p-5 cursor-pointer hover:border-line-strong transition-all relative group"
            >
              {/* Bookmark star */}
              <button
                onClick={e => { e.stopPropagation(); toggleBookmark(q.id) }}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-soft transition-colors"
                title={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-primary text-primary' : 'text-faint group-hover:text-muted'}`} />
              </button>

              {/* Completed check */}
              {isCompleted && (
                <div className="absolute top-3 right-10">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-soft text-body`}>
                  {DESIGN_CATEGORIES[q.category].icon} {DESIGN_CATEGORIES[q.category].nameKo}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text}`}>
                  {t(`difficulty.${q.difficulty}`)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-fg mb-1 pr-12">
                {/* 카드 클릭은 마우스용, 키보드는 이 버튼 */}
                <button type="button" onClick={e => { e.stopPropagation(); openDetail(q.id) }} className="text-left cursor-pointer">{q.title}</button>
              </h3>
              <p className="text-xs text-faint mb-2">{q.titleEn}</p>

              {/* Description */}
              <p className="text-sm text-sub line-clamp-2">{q.description}</p>

              {/* Components count */}
              <div className="flex items-center gap-3 mt-3 text-xs text-faint">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {q.architecture.components.length} {t('section.components')}</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {q.deepDive.length} {t('tab.deepDive')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="text-center py-12 text-muted">
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
            className="flex items-center gap-2 text-sub hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('back')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleBookmark(q.id)}
              className="p-2 rounded-lg hover:bg-soft transition-colors"
              title={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-primary text-primary' : 'text-faint'}`} />
            </button>

            {!practicing ? (
              <button
                onClick={startPractice}
                className="flex items-center gap-2 ui-btn rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                {t('practice.start')}
              </button>
            ) : (
              <button
                onClick={resetPractice}
                className="flex items-center gap-2 bg-soft text-body rounded-lg px-4 py-2 text-sm font-medium hover:bg-subtle transition-colors"
              >
                {t('practice.reset')}
              </button>
            )}
          </div>
        </div>

        {/* Title card */}
        <div className="ui-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-soft text-body`}>
              {DESIGN_CATEGORIES[q.category].icon} {DESIGN_CATEGORIES[q.category].nameKo}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text}`}>
              {t(`difficulty.${q.difficulty}`)}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-fg">{q.title}</h2>
          <p className="text-sm text-faint mt-1">{q.titleEn}</p>
          <p className="text-sub mt-3">{q.description}</p>

          {/* Practice progress */}
          {practicing && (
            <div className="mt-4 p-3 bg-subtle rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-sub">
                  {isPracticeComplete
                    ? t('practice.complete')
                    : `${t('practice.step')} ${practiceStep + 1} / ${TABS.length}`
                  }
                </span>
                {!isPracticeComplete && (
                  <button
                    onClick={nextPracticeStep}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-colors"
                  >
                    {t('practice.next')} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="w-full bg-track rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((practiceStep + 1) / TABS.length) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 ui-card rounded-xl p-1.5">
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
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-soft'
                }`}
              >
                {icons[tab]}
                {t(`tab.${tab}`)}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="ui-card rounded-xl p-6">
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
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.functional')}
        </h3>
        <ol className="space-y-2">
          {q.requirements.functional.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-body">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.nonFunctional')}
        </h3>
        <ol className="space-y-2">
          {q.requirements.nonFunctional.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-body">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )

  const renderEstimation = (q: SystemDesignQuestion) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
        {q.estimations.title}
      </h3>
      <div className="bg-subtle rounded-lg p-4 space-y-2">
        {q.estimations.items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-body font-mono">
            <span className="text-primary flex-shrink-0">{'>'}</span>
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
        <h3 className="text-lg font-semibold text-fg mb-2">{t('tab.architecture')}</h3>
        <p className="text-sm text-sub">{q.architecture.overview}</p>
      </div>

      {/* ASCII diagram */}
      {q.diagramAscii && (
        <div className="font-mono bg-subtle text-body p-4 rounded-lg text-xs overflow-x-auto whitespace-pre leading-relaxed">
          {q.diagramAscii}
        </div>
      )}

      {/* Components */}
      <div>
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.components')}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {q.architecture.components.map((comp, i) => (
            <div key={i} className="p-3 rounded-lg border border-line bg-subtle">
              <div className="font-semibold text-sm text-fg mb-1">{comp.name}</div>
              <div className="text-xs text-sub">{comp.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data flow */}
      <div>
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.dataFlow')}
        </h3>
        <div className="space-y-0">
          {q.architecture.dataFlow.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-soft text-sub flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {i < q.architecture.dataFlow.length - 1 && (
                  <div className="w-0.5 h-6 bg-line" />
                )}
              </div>
              <p className="text-sm text-body pt-1">{step}</p>
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
          <div key={i} className="border border-line rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedDive(isExpanded ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-subtle transition-colors"
            >
              <span className="font-medium text-sm text-fg">{dive.title}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-faint" /> : <ChevronDown className="w-4 h-4 text-faint" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 text-sm text-sub leading-relaxed border-t border-line pt-3">
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
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.scalability')}
        </h3>
        <div className="space-y-2">
          {q.scalability.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-body">
              <span className="text-primary flex-shrink-0 mt-0.5">&#x2191;</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Tradeoffs */}
      <div>
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.tradeoffs')}
        </h3>
        <div className="space-y-2">
          {q.tradeoffs.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-body">
              <Scale className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Interview tips */}
      <div className="bg-subtle border border-line rounded-lg p-4">
        <h3 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
          {t('section.interviewTips')}
        </h3>
        <div className="space-y-2">
          {q.interviewTips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-body">
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
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {mode === 'overview' ? renderOverview() : renderDetail()}
    </div>
  )
}
