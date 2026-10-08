'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csHub'
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
  terms: number
  quiz: number
  interview: number
  algorithms: number
}

const CATEGORY_STATS: CategoryStats[] = [
  { id: 'dataStructures', nameKo: 'categories.dataStructures', icon: Layers, color: 'blue', terms: 26, quiz: 25, interview: 10, algorithms: 13 },
  { id: 'algorithms', nameKo: 'categories.algorithms', icon: Zap, color: 'purple', terms: 25, quiz: 25, interview: 10, algorithms: 9 },
  { id: 'network', nameKo: 'categories.network', icon: Globe, color: 'cyan', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'os', nameKo: 'categories.os', icon: Monitor, color: 'orange', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'database', nameKo: 'categories.database', icon: Database, color: 'green', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'architecture', nameKo: 'categories.architecture', icon: Layout, color: 'indigo', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'softwareEngineering', nameKo: 'categories.softwareEngineering', icon: Wrench, color: 'pink', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'security', nameKo: 'categories.security', icon: Shield, color: 'red', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'linux', nameKo: 'categories.linux', icon: Terminal, color: 'amber', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
  { id: 'web', nameKo: 'categories.web', icon: Code, color: 'teal', terms: 20, quiz: 25, interview: 10, algorithms: 0 },
]

const TOTAL_TERMS = 211
const TOTAL_QUIZ = 250
const TOTAL_INTERVIEW = 100
const TOTAL_ALGORITHMS = 55
const TOTAL_VISUALIZERS = 10

// ── Tool card definitions ──

interface ToolCard {
  id: string
  href: string
  icon: typeof BookOpen
  totalCount: number
  progressKey?: string
}

const TOOL_CARDS: ToolCard[] = [
  {
    id: 'algorithm',
    href: '/algorithm/',
    icon: Brain,
    totalCount: TOTAL_ALGORITHMS,
  },
  {
    id: 'visualizer',
    href: '/cs-visualizer/',
    icon: Cpu,
    totalCount: TOTAL_VISUALIZERS,
  },
  {
    id: 'dictionary',
    href: '/cs-dictionary/',
    icon: BookOpen,
    totalCount: TOTAL_TERMS,
    progressKey: 'cs-dictionary-progress',
  },
  {
    id: 'quiz',
    href: '/cs-quiz/',
    icon: FileQuestion,
    totalCount: TOTAL_QUIZ,
  },
  {
    id: 'interview',
    href: '/cs-interview/',
    icon: Target,
    totalCount: TOTAL_INTERVIEW,
    progressKey: 'cs-interview-mastered',
  },
]

// ── Roadmap steps ──

const ROADMAP_STEPS = [
  { id: 1, href: '/cs-dictionary/', icon: BookOpen },
  { id: 2, href: '/cs-visualizer/', icon: Cpu },
  { id: 3, href: '/algorithm/', icon: Brain },
  { id: 4, href: '/cs-quiz/', icon: FileQuestion },
  { id: 5, href: '/cs-interview/', icon: Target },
]

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
      <div className="relative overflow-hidden ui-card rounded-2xl p-8 md:p-12">

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-soft text-primary">
                {t('badge')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
              <span className="text-fg">
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
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-track" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                  strokeLinecap="round"
                  className="stroke-primary"
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
            { label: t('progress.terms'), value: termsLearned, total: TOTAL_TERMS, icon: BookOpen },
            { label: t('progress.interview'), value: interviewMastered, total: TOTAL_INTERVIEW, icon: Target },
            { label: t('progress.algorithms'), value: TOTAL_ALGORITHMS, total: TOTAL_ALGORITHMS, icon: Brain, isStatic: true },
            { label: t('progress.quizQuestions'), value: TOTAL_QUIZ, total: TOTAL_QUIZ, icon: FileQuestion, isStatic: true },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 px-4 py-3 bg-subtle rounded-xl">
              <stat.icon className={`w-5 h-5 text-sub shrink-0`} />
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
                className={`group relative ui-card rounded-xl overflow-hidden transition-all duration-300 hover:border-line-strong`}
              >

                <div className="p-6">
                  {/* Icon + Stats */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-soft text-body`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full bg-soft text-body`}>
                      {t(`tools.${card.id}.stats`)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-fg mb-1.5 group-hover:text-primary transition-colors">
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
                          <span className={`font-semibold text-primary`}>{percent}%</span>
                        )}
                      </div>
                      <div className={`h-2 rounded-full bg-track overflow-hidden`}>
                        <div
                          className={`h-full rounded-full bg-primary transition-all duration-700 ease-out`}
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
                  <div className={`flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all`}>
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
      <section className="ui-card rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-fg" />
          <h2 className="text-2xl font-bold text-fg">{t('roadmap.title')}</h2>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden md:flex items-start justify-between relative">
          {ROADMAP_STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
                {/* Connector line */}
                {idx < ROADMAP_STEPS.length - 1 && (
                  <div className={`absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 bg-line`} />
                )}
                <Link
                  href={step.href}
                  className={`group flex flex-col items-center hover:bg-subtle rounded-xl p-3 transition-all`}
                >
                  <div className={`w-12 h-12 rounded-full bg-soft ring-2 ring-line flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-body`} />
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
            const Icon = step.icon
            return (
              <div key={step.id} className="relative">
                {/* Vertical connector */}
                {idx < ROADMAP_STEPS.length - 1 && (
                  <div className={`absolute left-6 top-14 bottom-0 w-0.5 bg-line`} />
                )}
                <Link
                  href={step.href}
                  className={`flex items-center gap-4 p-3 rounded-xl hover:bg-subtle transition-all group relative z-10`}
                >
                  <div className={`w-12 h-12 rounded-full bg-soft ring-2 ring-line flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-body`} />
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
                  <ChevronRight className="w-4 h-4 text-faint shrink-0 group-hover:translate-x-1 transition-transform" />
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
                className={`ui-card rounded-xl p-5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-soft flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-body`} />
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
                        className={`h-full rounded-full bg-primary`}
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
      <section className="relative overflow-hidden bg-primary rounded-2xl p-8 md:p-10 text-white">

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{t('quickStart.title')}</h3>
            <p className="text-white/70 text-sm md:text-base">{t('quickStart.description')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/cs-dictionary/"
              className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
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
