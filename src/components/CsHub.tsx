'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import Link from 'next/link'
import {
  BookOpen, Brain, Code, Target, GraduationCap,
  ArrowRight, BarChart3, Zap, Trophy,
  ChevronRight, Layers, Monitor, Search, FileQuestion,
  Cpu, Database, Globe, Shield, Terminal, Layout,
  Wrench,
} from 'lucide-react'

// ── localStorage helpers ──

function loadSetSize(key: string): number {
  try {
    if (typeof window === 'undefined') return 0
    const raw = localStorage.getItem(key)
    if (raw) return (JSON.parse(raw) as string[]).length
  } catch { /* ignore */ }
  return 0
}

// ── Category data (static counts from data files) ──

interface CategoryStats {
  id: string
  nameKo: string
  icon: typeof BookOpen
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  terms: number
  quiz: number
  interview: number
  algorithms: number
}

const CATEGORY_STATS: CategoryStats[] = [
  { id: 'dataStructures', nameKo: 'categories.dataStructures', icon: Layers, color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 26, quiz: 25, interview: 10, algorithms: 13 },
  { id: 'algorithms', nameKo: 'categories.algorithms', icon: Zap, color: 'purple', bgColor: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 25, quiz: 25, interview: 10, algorithms: 9 },
  { id: 'network', nameKo: 'categories.network', icon: Globe, color: 'cyan', bgColor: 'bg-cyan-100 dark:bg-cyan-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'os', nameKo: 'categories.os', icon: Monitor, color: 'orange', bgColor: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'database', nameKo: 'categories.database', icon: Database, color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'architecture', nameKo: 'categories.architecture', icon: Layout, color: 'indigo', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'softwareEngineering', nameKo: 'categories.softwareEngineering', icon: Wrench, color: 'pink', bgColor: 'bg-pink-100 dark:bg-pink-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'security', nameKo: 'categories.security', icon: Shield, color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/40', textColor: 'text-red-700 dark:text-red-300', borderColor: 'border-red-300 dark:border-red-700', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'linux', nameKo: 'categories.linux', icon: Terminal, color: 'amber', bgColor: 'bg-amber-100 dark:bg-amber-900/40', textColor: 'text-amber-700 dark:text-amber-300', borderColor: 'border-amber-300 dark:border-amber-700', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'web', nameKo: 'categories.web', icon: Code, color: 'teal', bgColor: 'bg-teal-100 dark:bg-teal-900/40', textColor: 'text-sub', borderColor: 'border-line', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
]

const TOTAL_TERMS = 211
const TOTAL_QUIZ = 251
const TOTAL_INTERVIEW = 100
const TOTAL_ALGORITHMS = 55
const TOTAL_VISUALIZERS = 10

// ── Tool card definitions ──

interface ToolCard {
  id: string
  href: string
  icon: typeof BookOpen
  themeGradient: string
  themeBorder: string
  themeAccent: string
  themeBg: string
  themeProgressBg: string
  themeProgressFill: string
  totalCount: number
  progressKey?: string
}

const TOOL_CARDS: ToolCard[] = [
  {
    id: 'algorithm',
    href: '/algorithm/',
    icon: Brain,
    themeGradient: 'from-indigo-500 to-violet-600',
    themeBorder: 'border-line',
    themeAccent: 'text-indigo-600 dark:text-indigo-400',
    themeBg: 'bg-subtle',
    themeProgressBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    themeProgressFill: 'bg-indigo-500',
    totalCount: TOTAL_ALGORITHMS,
  },
  {
    id: 'visualizer',
    href: '/cs-visualizer/',
    icon: Cpu,
    themeGradient: 'from-emerald-500 to-teal-600',
    themeBorder: 'border-line',
    themeAccent: 'text-emerald-600 dark:text-emerald-400',
    themeBg: 'bg-subtle',
    themeProgressBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    themeProgressFill: 'bg-emerald-500',
    totalCount: TOTAL_VISUALIZERS,
  },
  {
    id: 'dictionary',
    href: '/cs-dictionary/',
    icon: BookOpen,
    themeGradient: 'from-blue-500 to-cyan-600',
    themeBorder: 'border-line',
    themeAccent: 'text-blue-600 dark:text-blue-400',
    themeBg: 'bg-subtle',
    themeProgressBg: 'bg-blue-100 dark:bg-blue-900/50',
    themeProgressFill: 'bg-blue-500',
    totalCount: TOTAL_TERMS,
    progressKey: 'cs-dictionary-progress',
  },
  {
    id: 'quiz',
    href: '/cs-quiz/',
    icon: FileQuestion,
    themeGradient: 'from-purple-500 to-fuchsia-600',
    themeBorder: 'border-line',
    themeAccent: 'text-purple-600 dark:text-purple-400',
    themeBg: 'bg-subtle',
    themeProgressBg: 'bg-purple-100 dark:bg-purple-900/50',
    themeProgressFill: 'bg-purple-500',
    totalCount: TOTAL_QUIZ,
  },
  {
    id: 'interview',
    href: '/cs-interview/',
    icon: Target,
    themeGradient: 'from-rose-500 to-pink-600',
    themeBorder: 'border-line',
    themeAccent: 'text-rose-600 dark:text-rose-400',
    themeBg: 'bg-subtle',
    themeProgressBg: 'bg-rose-100 dark:bg-rose-900/50',
    themeProgressFill: 'bg-rose-500',
    totalCount: TOTAL_INTERVIEW,
    progressKey: 'cs-interview-mastered',
  },
]

// ── Roadmap steps ──

const ROADMAP_STEPS = [
  { id: 1, href: '/cs-dictionary/', icon: BookOpen, color: 'blue' },
  { id: 2, href: '/cs-visualizer/', icon: Cpu, color: 'emerald' },
  { id: 3, href: '/algorithm/', icon: Brain, color: 'indigo' },
  { id: 4, href: '/cs-quiz/', icon: FileQuestion, color: 'purple' },
  { id: 5, href: '/cs-interview/', icon: Target, color: 'rose' },
]

// ── Roadmap color classes (explicit for Tailwind JIT) ──

const roadmapColors: Record<string, { bg: string; ring: string; text: string; line: string; hoverBg: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', ring: 'ring-blue-500', text: 'text-blue-600 dark:text-blue-400', line: 'bg-blue-300 dark:bg-blue-700', hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', ring: 'ring-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', line: 'bg-emerald-300 dark:bg-emerald-700', hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', ring: 'ring-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', line: 'bg-indigo-300 dark:bg-indigo-700', hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', ring: 'ring-purple-500', text: 'text-purple-600 dark:text-purple-400', line: 'bg-purple-300 dark:bg-purple-700', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/40', ring: 'ring-rose-500', text: 'text-rose-600 dark:text-rose-400', line: 'bg-rose-300 dark:bg-rose-700', hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-950/30' },
}

// ── Component ──

export default function CsHub() {
  const t = useTranslations('csHub')
  const [termsLearned, setTermsLearned] = useState(0)
  const [interviewMastered, setInterviewMastered] = useState(0)

  useEffect(() => {
    setTermsLearned(loadSetSize('cs-dictionary-progress'))
    setInterviewMastered(loadSetSize('cs-interview-mastered'))
  }, [])

  const overallProgress = useMemo(() => {
    const total = TOTAL_TERMS + TOTAL_INTERVIEW
    const done = termsLearned + interviewMastered
    return total > 0 ? Math.round((done / total) * 100) : 0
  }, [termsLearned, interviewMastered])

  function getProgress(card: ToolCard): number {
    if (card.id === 'dictionary') return termsLearned
    if (card.id === 'interview') return interviewMastered
    return 0
  }

  function getProgressPercent(card: ToolCard): number {
    const p = getProgress(card)
    return card.totalCount > 0 ? Math.round((p / card.totalCount) * 100) : 0
  }

  return (
    <div className="space-y-12">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden bg-surface rounded-2xl shadow-xl p-8 md:p-12">
        {/* Decorative gradient blobs */}

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white shadow-lg shadow-blue-500/25">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-soft text-primary">
                {t('badge')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
              <span className="bg-clip-text text-transparent bg-primary">
                {t('title')}
              </span>
            </h1>
            <p className="text-base md:text-lg text-sub max-w-2xl leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Overall progress ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-gray-200 dark:stroke-gray-700" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                  strokeLinecap="round"
                  className="stroke-blue-500 dark:stroke-blue-400"
                  strokeDasharray={`${overallProgress * 2.64} ${264 - overallProgress * 2.64}`}
                  style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-fg">{overallProgress}%</span>
              </div>
            </div>
            <span className="text-sm font-medium text-muted">{t('progress.overall')}</span>
          </div>
        </div>

        {/* Progress stats bar */}
        <div className="relative z-10 mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('progress.terms'), value: termsLearned, total: TOTAL_TERMS, icon: BookOpen, color: 'text-blue-600 dark:text-blue-400' },
            { label: t('progress.interview'), value: interviewMastered, total: TOTAL_INTERVIEW, icon: Target, color: 'text-rose-600 dark:text-rose-400' },
            { label: t('progress.algorithms'), value: TOTAL_ALGORITHMS, total: TOTAL_ALGORITHMS, icon: Brain, color: 'text-indigo-600 dark:text-indigo-400', isStatic: true },
            { label: t('progress.quizQuestions'), value: TOTAL_QUIZ, total: TOTAL_QUIZ, icon: FileQuestion, color: 'text-purple-600 dark:text-purple-400', isStatic: true },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 px-4 py-3 bg-subtle rounded-xl">
              <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-lg font-bold text-fg">
                  {('isStatic' in stat && stat.isStatic) ? stat.total : `${stat.value}/${stat.total}`}
                </p>
                <p className="text-xs text-muted truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tool Cards ── */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-fg" />
          <h2 className="text-2xl font-bold text-fg">{t('tools.title')}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOOL_CARDS.map((card) => {
            const progress = getProgress(card)
            const percent = getProgressPercent(card)
            const hasProgress = card.progressKey && progress > 0
            const Icon = card.icon

            return (
              <Link
                key={card.id}
                href={card.href}
                className={`group relative bg-surface rounded-xl shadow-lg border ${card.themeBorder} overflow-hidden transition-all duration-300 hover:shadow-xl`}
              >
                {/* Top gradient bar */}

                <div className="p-6">
                  {/* Icon + Stats */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-soft text-body`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${card.themeBg} ${card.themeAccent}`}>
                      {t(`tools.${card.id}.stats`)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-fg mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t(`tools.${card.id}.title`)}
                  </h3>
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {t(`tools.${card.id}.description`)}
                  </p>

                  {/* Progress bar */}
                  {card.progressKey ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted">
                          {hasProgress ? `${progress}/${card.totalCount}` : t('progress.notStarted')}
                        </span>
                        {hasProgress && (
                          <span className={`font-semibold ${card.themeAccent}`}>{percent}%</span>
                        )}
                      </div>
                      <div className={`h-2 rounded-full ${card.themeProgressBg} overflow-hidden`}>
                        <div
                          className={`h-full rounded-full ${card.themeProgressFill} transition-all duration-700 ease-out`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{t(`tools.${card.id}.cta`)}</span>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${card.themeAccent} group-hover:gap-2.5 transition-all`}>
                    <span>{hasProgress ? t('cta.continue') : t('cta.start')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Learning Roadmap ── */}
      <section className="bg-surface rounded-xl shadow-lg p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold text-fg">{t('roadmap.title')}</h2>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden md:flex items-start justify-between relative">
          {ROADMAP_STEPS.map((step, idx) => {
            const c = roadmapColors[step.color]
            const Icon = step.icon
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                {/* Connector line */}
                {idx < ROADMAP_STEPS.length - 1 && (
                  <div className={`absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 ${c.line}`} />
                )}
                <Link
                  href={step.href}
                  className={`group flex flex-col items-center ${c.hoverBg} rounded-xl p-3 transition-all`}
                >
                  <div className={`w-12 h-12 rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <span className="text-xs font-bold text-faint mb-1">STEP {step.id}</span>
                  <span className={`text-sm font-semibold text-fg text-center`}>
                    {t(`roadmap.step${step.id}.title`)}
                  </span>
                  <span className="text-xs text-muted text-center mt-1 max-w-[120px]">
                    {t(`roadmap.step${step.id}.description`)}
                  </span>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Mobile vertical stepper */}
        <div className="md:hidden space-y-0">
          {ROADMAP_STEPS.map((step, idx) => {
            const c = roadmapColors[step.color]
            const Icon = step.icon
            return (
              <div key={step.id} className="relative">
                {/* Vertical connector */}
                {idx < ROADMAP_STEPS.length - 1 && (
                  <div className={`absolute left-6 top-14 bottom-0 w-0.5 ${c.line}`} />
                )}
                <Link
                  href={step.href}
                  className={`flex items-center gap-4 p-3 rounded-xl ${c.hoverBg} transition-all group relative z-10`}
                >
                  <div className={`w-12 h-12 rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-faint">STEP {step.id}</span>
                      <span className="text-sm font-semibold text-fg">
                        {t(`roadmap.step${step.id}.title`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {t(`roadmap.step${step.id}.description`)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Category Overview ── */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-fg" />
          <h2 className="text-2xl font-bold text-fg">{t('categories.title')}</h2>
        </div>
        <p className="text-sm text-muted mb-6">{t('categories.description')}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CATEGORY_STATS.map((cat) => {
            const Icon = cat.icon
            const total = cat.terms + cat.quiz + cat.interview + cat.algorithms
            return (
              <div
                key={cat.id}
                className={`bg-surface rounded-xl shadow-md border ${cat.borderColor} p-5 hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${cat.textColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-fg truncate">
                      {t(cat.nameKo)}
                    </h3>
                    <p className="text-xs text-muted">
                      {t('categories.totalResources', { count: total })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{t('categories.terms')}</span>
                    <span className="font-semibold text-body">{cat.terms}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{t('categories.quiz')}</span>
                    <span className="font-semibold text-body">{cat.quiz}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{t('categories.interview')}</span>
                    <span className="font-semibold text-body">{cat.interview}</span>
                  </div>
                  {cat.algorithms > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">{t('categories.algorithms')}</span>
                      <span className="font-semibold text-body">{cat.algorithms}</span>
                    </div>
                  )}
                </div>

                {/* Mini total bar */}
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-soft overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cat.bgColor}`}
                        style={{ width: `${Math.min(100, (total / 80) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-faint">{total}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Quick Start CTA ── */}
      <section className="relative overflow-hidden bg-primary rounded-2xl shadow-xl p-8 md:p-10 text-white">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{t('quickStart.title')}</h3>
            <p className="text-blue-100 text-sm md:text-base">{t('quickStart.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/cs-dictionary/"
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              <BookOpen className="w-5 h-5" />
              {t('quickStart.beginnerCta')}
            </Link>
            <Link
              href="/cs-quiz/"
              className="flex items-center gap-2 px-6 py-3 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors border border-white/20"
            >
              <Zap className="w-5 h-5" />
              {t('quickStart.testCta')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
