'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/devRoadmap'
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

const LEVEL_CONFIG: Record<SkillLevel, { dot: string; label: string }> = {
  beginner: { dot: 'bg-green-500', label: 'level.beginner' },
  intermediate: { dot: 'bg-amber-500', label: 'level.intermediate' },
  advanced: { dot: 'bg-red-500', label: 'level.advanced' },
}

// ── Component ──

export default function DevRoadmap() {
  const t = useTranslations('devRoadmap')
  const tc = useTranslations('common')

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
          <Map className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        </div>
        <p className="text-sm text-muted">{t('description')}</p>
      </div>

      {/* Track Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ROADMAP_TRACKS.map(track => {
          const Icon = TRACK_ICONS[track.id]
          const trackStudied = progress[track.id].studied.length
          const trackTotal = countSkills(track.sections)
          const isSelected = selectedTrack === track.id
          return (
            <button
              key={track.id}
              onClick={() => { setSelectedTrack(track.id); setFilter('all'); setExpandedSkill(null) }}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary-soft'
                  : 'border-line bg-surface hover:border-line-strong'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-fg'}`}>
                  {track.title}
                </span>
              </div>
              <p className="text-xs text-muted line-clamp-2 mb-3">
                {track.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-faint">{trackTotal} {t('stats.total')}</span>
                {trackStudied > 0 && (
                  <span className="text-sub font-medium">
                    {trackStudied}/{trackTotal}
                  </span>
                )}
              </div>
              {/* Mini progress bar */}
              {trackStudied > 0 && (
                <div className={`mt-2 h-1 rounded-full bg-track`}>
                  <div
                    className={`h-1 rounded-full bg-primary transition-all`}
                    style={{ width: `${Math.round((trackStudied / trackTotal) * 100)}%` }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats + Filter Bar */}
      <div className="ui-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-body">
                {t('stats.progress')}: <strong className="text-primary">{studiedCount}</strong> / {totalSkills}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-body">
                {t('stats.essentialProgress')}: <strong className="text-primary">{essentialStudied}</strong> / {totalEssential}
              </span>
            </div>
            {studiedCount > 0 && (
              <button
                onClick={resetTrackProgress}
                className="flex items-center gap-1 text-xs text-faint hover:text-red-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                {tc('reset')}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-faint" />
            {(['all', 'essential', 'beginner', 'intermediate', 'advanced'] as SkillFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-soft text-sub hover:bg-subtle'
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
        <div className={`mt-4 h-2 rounded-full bg-track`}>
          <div
            className={`h-2 rounded-full bg-primary transition-all duration-500`}
            style={{ width: `${totalSkills > 0 ? Math.round((studiedCount / totalSkills) * 100) : 0}%` }}
          />
        </div>
        <div className="text-right mt-1 text-xs text-faint">
          {totalSkills > 0 ? Math.round((studiedCount / totalSkills) * 100) : 0}%
        </div>
      </div>

      {/* Level Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(level => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${LEVEL_CONFIG[level].dot}`} />
            <span>{t(LEVEL_CONFIG[level].label)}</span>
          </div>
        ))}
        <span className="text-faint">|</span>
        <div className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-primary" />
          <span>{t('legend.essential')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 border border-line-strong rounded" />
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
                <div className={`absolute left-5 top-14 bottom-0 w-0.5 bg-line`} />
              )}

              <div className={`ui-card rounded-xl overflow-hidden`}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-subtle transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-fg">
                        {section.title}
                        <span className="ml-2 text-xs font-normal text-faint">
                          {section.titleEn}
                        </span>
                      </h3>
                      <span className="text-xs text-faint">
                        {sectionStudied}/{section.skills.length} {t('stats.studied')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Section mini progress */}
                    <div className={`hidden sm:block w-24 h-1.5 rounded-full bg-track`}>
                      <div
                        className={`h-1.5 rounded-full bg-primary transition-all`}
                        style={{ width: `${section.skills.length > 0 ? Math.round((sectionStudied / section.skills.length) * 100) : 0}%` }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-faint" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-faint" />
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
                                ? 'bg-subtle'
                                : 'hover:bg-subtle'
                            }`}
                            onClick={() => setExpandedSkill(isDetailOpen ? null : skill.id)}
                          >
                            {/* Check button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleStudied(skill.id) }}
                              className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                isStudied
                                  ? 'bg-primary border-primary text-white'
                                  : 'border-line-strong hover:border-faint'
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
                                {/* 행 클릭은 마우스용, 키보드는 이 버튼으로 상세를 연다 */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setExpandedSkill(isDetailOpen ? null : skill.id) }}
                                  aria-expanded={isDetailOpen}
                                  className={`text-left cursor-pointer font-medium text-sm ${
                                    isStudied
                                      ? 'text-faint line-through'
                                      : 'text-fg'
                                  }`}
                                >
                                  {skill.name}
                                </button>
                                {skill.isEssential && (
                                  <Star className="w-3 h-3 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className={`w-4 h-4 text-faint transition-transform ${isDetailOpen ? 'rotate-90' : ''}`} />
                          </div>

                          {/* Expanded detail */}
                          {isDetailOpen && (
                            <div className="ml-12 mr-3 mt-1 mb-2 p-3 rounded-lg bg-subtle text-sm space-y-2">
                              <p className="text-sub">{skill.description}</p>
                              {skill.resources && skill.resources.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <BookOpen className="w-3.5 h-3.5 text-faint" />
                                  <span className="text-xs text-faint">{t('skill.resources')}:</span>
                                  {skill.resources.map((res, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs px-2 py-0.5 rounded-full bg-soft text-body`}
                                    >
                                      {res}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${LEVEL_CONFIG[skill.level].dot}`} />
                                <span className="text-xs text-faint">{t(LEVEL_CONFIG[skill.level].label)}</span>
                                {skill.isEssential && (
                                  <>
                                    <span className="text-faint">|</span>
                                    <Star className="w-3 h-3 text-primary" />
                                    <span className="text-xs text-primary">{t('legend.essential')}</span>
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
        <div className={`text-center py-8 px-6 rounded-xl bg-subtle border-2 border-primary`}>
          <div className="text-4xl mb-3">🎉</div>
          <h3 className={`text-xl font-bold text-primary mb-2`}>
            {currentTrack.title} {t('stats.total')} {t('stats.studied')}!
          </h3>
          <p className="text-sm text-muted">
            {t('completion', { count: totalSkills })}
          </p>
        </div>
      )}
    </div>
  )
}
