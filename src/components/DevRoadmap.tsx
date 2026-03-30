'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Map,
  Code,
  Server,
  Globe,
  Terminal,
  ChevronRight,
  ChevronDown,
  Check,
  Star,
  BookOpen,
  Zap,
  ArrowRight,
  Filter,
  RotateCcw,
} from 'lucide-react'
import {
  ROADMAP_TRACKS,
  type RoadmapTrack,
  type RoadmapTrackData,
  type RoadmapSection,
  type RoadmapSkill,
  type SkillLevel,
} from '@/data/devRoadmapData'

// ── Types ──

type SkillFilter = 'all' | 'essential' | SkillLevel

interface TrackProgress {
  studied: string[] // skill IDs
}

// ── Helpers ──

const STORAGE_KEY_PREFIX = 'dev-roadmap-'

function getStorageKey(track: RoadmapTrack): string {
  return `${STORAGE_KEY_PREFIX}${track}-progress`
}

function loadProgress(track: RoadmapTrack): TrackProgress {
  if (typeof window === 'undefined') return { studied: [] }
  try {
    const raw = localStorage.getItem(getStorageKey(track))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { studied: [] }
}

function saveProgress(track: RoadmapTrack, progress: TrackProgress): void {
  try {
    localStorage.setItem(getStorageKey(track), JSON.stringify(progress))
  } catch { /* ignore */ }
}

function countSkills(sections: RoadmapSection[]): number {
  return sections.reduce((sum, s) => sum + s.skills.length, 0)
}

function countEssential(sections: RoadmapSection[]): number {
  return sections.reduce((sum, s) => sum + s.skills.filter(sk => sk.isEssential).length, 0)
}

const TRACK_ICONS: Record<RoadmapTrack, typeof Code> = {
  frontend: Code,
  backend: Server,
  fullstack: Globe,
  devops: Terminal,
}

const TRACK_COLORS: Record<string, {
  bg: string; bgLight: string; border: string; text: string; ring: string
  gradientFrom: string; gradientTo: string; badge: string; badgeText: string
  progressBg: string; progressBar: string
}> = {
  blue: {
    bg: 'bg-blue-600', bgLight: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500', gradientFrom: 'from-blue-600', gradientTo: 'to-blue-700',
    badge: 'bg-blue-100 dark:bg-blue-900', badgeText: 'text-blue-700 dark:text-blue-300',
    progressBg: 'bg-blue-100 dark:bg-blue-900', progressBar: 'bg-blue-500',
  },
  green: {
    bg: 'bg-green-600', bgLight: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-500', text: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-500', gradientFrom: 'from-green-600', gradientTo: 'to-green-700',
    badge: 'bg-green-100 dark:bg-green-900', badgeText: 'text-green-700 dark:text-green-300',
    progressBg: 'bg-green-100 dark:bg-green-900', progressBar: 'bg-green-500',
  },
  purple: {
    bg: 'bg-purple-600', bgLight: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-500', gradientFrom: 'from-purple-600', gradientTo: 'to-purple-700',
    badge: 'bg-purple-100 dark:bg-purple-900', badgeText: 'text-purple-700 dark:text-purple-300',
    progressBg: 'bg-purple-100 dark:bg-purple-900', progressBar: 'bg-purple-500',
  },
  orange: {
    bg: 'bg-orange-600', bgLight: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-500', gradientFrom: 'from-orange-600', gradientTo: 'to-orange-700',
    badge: 'bg-orange-100 dark:bg-orange-900', badgeText: 'text-orange-700 dark:text-orange-300',
    progressBg: 'bg-orange-100 dark:bg-orange-900', progressBar: 'bg-orange-500',
  },
}

const LEVEL_CONFIG: Record<SkillLevel, { dot: string; label: string }> = {
  beginner: { dot: 'bg-green-500', label: 'level.beginner' },
  intermediate: { dot: 'bg-yellow-500', label: 'level.intermediate' },
  advanced: { dot: 'bg-red-500', label: 'level.advanced' },
}

// ── Component ──

export default function DevRoadmap() {
  const t = useTranslations('devRoadmap')

  const [selectedTrack, setSelectedTrack] = useState<RoadmapTrack>('frontend')
  const [filter, setFilter] = useState<SkillFilter>('all')
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<RoadmapTrack, TrackProgress>>({
    frontend: { studied: [] },
    backend: { studied: [] },
    fullstack: { studied: [] },
    devops: { studied: [] },
  })

  // Load progress from localStorage on mount
  useEffect(() => {
    const loaded: Record<RoadmapTrack, TrackProgress> = {
      frontend: loadProgress('frontend'),
      backend: loadProgress('backend'),
      fullstack: loadProgress('fullstack'),
      devops: loadProgress('devops'),
    }
    setProgress(loaded)
    // Expand all sections by default
    const allSectionIds = new Set<string>()
    ROADMAP_TRACKS.forEach(track => track.sections.forEach(s => allSectionIds.add(s.id)))
    setExpandedSections(allSectionIds)
  }, [])

  const currentTrack = useMemo(
    () => ROADMAP_TRACKS.find(t => t.id === selectedTrack)!,
    [selectedTrack]
  )
  const colors = TRACK_COLORS[currentTrack.color]
  const currentProgress = progress[selectedTrack]

  const totalSkills = useMemo(() => countSkills(currentTrack.sections), [currentTrack])
  const totalEssential = useMemo(() => countEssential(currentTrack.sections), [currentTrack])
  const studiedCount = currentProgress.studied.length
  const essentialStudied = useMemo(() => {
    const essentialIds = new Set<string>()
    currentTrack.sections.forEach(s =>
      s.skills.filter(sk => sk.isEssential).forEach(sk => essentialIds.add(sk.id))
    )
    return currentProgress.studied.filter(id => essentialIds.has(id)).length
  }, [currentTrack, currentProgress])

  const toggleStudied = useCallback((skillId: string) => {
    setProgress(prev => {
      const trackProgress = prev[selectedTrack]
      const isStudied = trackProgress.studied.includes(skillId)
      const newStudied = isStudied
        ? trackProgress.studied.filter(id => id !== skillId)
        : [...trackProgress.studied, skillId]
      const newProgress = { ...prev, [selectedTrack]: { studied: newStudied } }
      saveProgress(selectedTrack, { studied: newStudied })
      return newProgress
    })
  }, [selectedTrack])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }, [])

  const resetTrackProgress = useCallback(() => {
    setProgress(prev => {
      const newProgress = { ...prev, [selectedTrack]: { studied: [] } }
      saveProgress(selectedTrack, { studied: [] })
      return newProgress
    })
  }, [selectedTrack])

  const filterSkills = useCallback((skills: RoadmapSkill[]): RoadmapSkill[] => {
    if (filter === 'all') return skills
    if (filter === 'essential') return skills.filter(s => s.isEssential)
    return skills.filter(s => s.level === filter)
  }, [filter])

  const getSectionStudiedCount = useCallback((section: RoadmapSection) => {
    return section.skills.filter(sk => currentProgress.studied.includes(sk.id)).length
  }, [currentProgress])

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Map className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
      </div>

      {/* Track Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ROADMAP_TRACKS.map(track => {
          const Icon = TRACK_ICONS[track.id]
          const tc = TRACK_COLORS[track.color]
          const trackStudied = progress[track.id].studied.length
          const trackTotal = countSkills(track.sections)
          const isSelected = selectedTrack === track.id
          return (
            <button
              key={track.id}
              onClick={() => { setSelectedTrack(track.id); setFilter('all'); setExpandedSkill(null) }}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${tc.border} ${tc.bgLight} shadow-lg`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? tc.text : 'text-gray-500 dark:text-gray-400'}`} />
                <span className={`font-semibold ${isSelected ? tc.text : 'text-gray-900 dark:text-white'}`}>
                  {track.title}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {track.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 dark:text-gray-500">{trackTotal} {t('stats.total')}</span>
                {trackStudied > 0 && (
                  <span className={tc.badgeText + ' font-medium'}>
                    {trackStudied}/{trackTotal}
                  </span>
                )}
              </div>
              {/* Mini progress bar */}
              {trackStudied > 0 && (
                <div className={`mt-2 h-1 rounded-full ${tc.progressBg}`}>
                  <div
                    className={`h-1 rounded-full ${tc.progressBar} transition-all`}
                    style={{ width: `${Math.round((trackStudied / trackTotal) * 100)}%` }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats + Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-4 h-4 ${colors.text}`} />
              <span className="text-gray-700 dark:text-gray-300">
                {t('stats.progress')}: <strong className={colors.text}>{studiedCount}</strong> / {totalSkills}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {t('stats.essentialProgress')}: <strong className="text-yellow-600 dark:text-yellow-400">{essentialStudied}</strong> / {totalEssential}
              </span>
            </div>
            {studiedCount > 0 && (
              <button
                onClick={resetTrackProgress}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                초기화
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(['all', 'essential', 'beginner', 'intermediate', 'advanced'] as SkillFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? `${colors.bg} text-white`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? t('filter.all')
                  : f === 'essential' ? t('filter.essential')
                  : t(LEVEL_CONFIG[f as SkillLevel].label)}
              </button>
            ))}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className={`mt-4 h-2 rounded-full ${colors.progressBg}`}>
          <div
            className={`h-2 rounded-full ${colors.progressBar} transition-all duration-500`}
            style={{ width: `${totalSkills > 0 ? Math.round((studiedCount / totalSkills) * 100) : 0}%` }}
          />
        </div>
        <div className="text-right mt-1 text-xs text-gray-400">
          {totalSkills > 0 ? Math.round((studiedCount / totalSkills) * 100) : 0}%
        </div>
      </div>

      {/* Level Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(level => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${LEVEL_CONFIG[level].dot}`} />
            <span>{t(LEVEL_CONFIG[level].label)}</span>
          </div>
        ))}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <div className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-yellow-500" />
          <span>{t('legend.essential')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 border border-gray-300 dark:border-gray-600 rounded" />
          <span>{t('legend.optional')}</span>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-6">
        {currentTrack.sections.map((section, sIdx) => {
          const filtered = filterSkills(section.skills)
          if (filtered.length === 0) return null
          const sectionStudied = getSectionStudiedCount(section)
          const isExpanded = expandedSections.has(section.id)

          return (
            <div key={section.id} className="relative">
              {/* Timeline connector */}
              {sIdx < currentTrack.sections.length - 1 && (
                <div className={`absolute left-5 top-14 bottom-0 w-0.5 ${colors.progressBg}`} />
              )}

              <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 ${colors.border} overflow-hidden`}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {section.title}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {section.titleEn}
                        </span>
                      </h3>
                      <span className="text-xs text-gray-400">
                        {sectionStudied}/{section.skills.length} {t('stats.studied')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Section mini progress */}
                    <div className={`hidden sm:block w-24 h-1.5 rounded-full ${colors.progressBg}`}>
                      <div
                        className={`h-1.5 rounded-full ${colors.progressBar} transition-all`}
                        style={{ width: `${section.skills.length > 0 ? Math.round((sectionStudied / section.skills.length) * 100) : 0}%` }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Skills */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {filtered.map(skill => {
                      const isStudied = currentProgress.studied.includes(skill.id)
                      const isDetailOpen = expandedSkill === skill.id

                      return (
                        <div key={skill.id}>
                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                              isStudied
                                ? 'bg-gray-50 dark:bg-gray-700'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => setExpandedSkill(isDetailOpen ? null : skill.id)}
                          >
                            {/* Check button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleStudied(skill.id) }}
                              className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                isStudied
                                  ? `${colors.bg} ${colors.border} text-white`
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                              aria-label={isStudied ? t('skill.studied') : t('skill.notStudied')}
                            >
                              {isStudied && <Check className="w-4 h-4" />}
                            </button>

                            {/* Level dot */}
                            <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${LEVEL_CONFIG[skill.level].dot}`} />

                            {/* Skill name */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${
                                  isStudied
                                    ? 'text-gray-400 dark:text-gray-500 line-through'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {skill.name}
                                </span>
                                {skill.isEssential && (
                                  <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isDetailOpen ? 'rotate-90' : ''}`} />
                          </div>

                          {/* Expanded detail */}
                          {isDetailOpen && (
                            <div className="ml-12 mr-3 mt-1 mb-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm space-y-2">
                              <p className="text-gray-600 dark:text-gray-300">{skill.description}</p>
                              {skill.resources && skill.resources.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-xs text-gray-400">{t('skill.resources')}:</span>
                                  {skill.resources.map((res, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs px-2 py-0.5 rounded-full ${colors.badge} ${colors.badgeText}`}
                                    >
                                      {res}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${LEVEL_CONFIG[skill.level].dot}`} />
                                <span className="text-xs text-gray-400">{t(LEVEL_CONFIG[skill.level].label)}</span>
                                {skill.isEssential && (
                                  <>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <Star className="w-3 h-3 text-yellow-500" />
                                    <span className="text-xs text-yellow-600 dark:text-yellow-400">{t('legend.essential')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion message */}
      {studiedCount === totalSkills && totalSkills > 0 && (
        <div className={`text-center py-8 px-6 rounded-xl ${colors.bgLight} border-2 ${colors.border}`}>
          <div className="text-4xl mb-3">🎉</div>
          <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
            {currentTrack.title} {t('stats.total')} {t('stats.studied')}!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalSkills}개 스킬을 모두 학습했습니다. 다른 트랙도 도전해 보세요!
          </p>
        </div>
      )}
    </div>
  )
}
