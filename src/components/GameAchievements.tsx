'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Trophy, X } from 'lucide-react'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Achievement {
  id: string
  icon: string
  nameKey: string
  descKey: string
  unlocked: boolean
  unlockedAt?: number
}

interface GameAchievementsProps {
  achievements: Achievement[]
  unlockedCount: number
  totalCount: number
  compact?: boolean
}

interface AchievementToastProps {
  achievement: {
    icon: string
    nameKey: string
    descKey: string
  } | null
  onDismiss: () => void
}

// ──────────────────────────────────────────────
// AchievementBadge — individual badge cell
// ──────────────────────────────────────────────

interface AchievementBadgeProps {
  achievement: Achievement
  compact: boolean
  t: ReturnType<typeof useTranslations>
}

function AchievementBadge({ achievement, compact, t }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const name = t(achievement.nameKey as Parameters<typeof t>[0])
  const desc = t(achievement.descKey as Parameters<typeof t>[0])

  const iconSize = compact ? 'text-2xl' : 'text-3xl'
  const paddingClass = compact ? 'p-2' : 'p-3'
  const minHeightClass = compact ? 'min-h-[80px]' : 'min-h-[100px]'

  if (achievement.unlocked) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center ${paddingClass} ${minHeightClass} rounded-xl border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-yellow-400 dark:hover:border-yellow-600`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="button"
        aria-label={`${name}: ${desc}`}
      >
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-300/40 dark:ring-yellow-600/40" />

        {/* Icon */}
        <span className={`${iconSize} leading-none mb-1 drop-shadow-sm`} aria-hidden="true">
          {achievement.icon}
        </span>

        {/* Name */}
        <p className={`text-center font-semibold text-yellow-800 dark:text-yellow-300 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {name}
        </p>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-44 pointer-events-none">
            <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl text-center">
              <p className="font-semibold mb-0.5">{name}</p>
              <p className="text-gray-300 dark:text-gray-400 leading-snug">{desc}</p>
              {achievement.unlockedAt && (
                <p className="text-gray-400 dark:text-gray-500 mt-1 text-[10px]">
                  {new Date(achievement.unlockedAt).toLocaleDateString('ko-KR')}
                </p>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Locked badge
  return (
    <div
      className={`relative flex flex-col items-center justify-center ${paddingClass} ${minHeightClass} rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 opacity-60 cursor-default select-none`}
      aria-label={t('locked')}
      title={t('locked')}
    >
      {/* Locked icon overlay */}
      <span className={`${iconSize} leading-none mb-1 grayscale`} aria-hidden="true">
        {achievement.icon}
      </span>
      <div className="absolute top-1.5 right-1.5">
        <span className="text-xs text-gray-400 dark:text-gray-500" aria-hidden="true">🔒</span>
      </div>
      <p className={`text-center font-medium text-gray-400 dark:text-gray-500 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {name}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────
// GameAchievements — main export (collapsible panel)
// ──────────────────────────────────────────────

export default function GameAchievements({
  achievements,
  unlockedCount,
  totalCount,
  compact = false,
}: GameAchievementsProps) {
  const t = useTranslations('achievements')
  const [isOpen, setIsOpen] = useState(!compact)

  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="achievements-panel"
      >
        <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left font-bold text-gray-900 dark:text-white text-sm">
          {t('title')}
        </span>

        {/* Progress badge */}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
          {unlockedCount}/{totalCount}
        </span>

        {isOpen
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
        }
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div id="achievements-panel" className="px-5 pb-5">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('progress')}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* Badge grid */}
          {achievements.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">{t('noAchievements')}</p>
          ) : (
            <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'}`}>
              {achievements.map(achievement => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  compact={compact}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Completed message */}
          {unlockedCount > 0 && unlockedCount === totalCount && (
            <div className="mt-4 text-center py-2 px-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                🏆 {t('allUnlocked')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// AchievementToast — named export
// ──────────────────────────────────────────────

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const t = useTranslations('achievements')

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!achievement) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [achievement, onDismiss])

  if (!achievement) return null

  const name = t(achievement.nameKey as Parameters<typeof t>[0])
  const desc = t(achievement.descKey as Parameters<typeof t>[0])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white animate-in slide-in-from-top-2 fade-in duration-300 min-w-[260px] max-w-xs">
        {/* Trophy + icon */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span className="text-xl leading-none" aria-hidden="true">{achievement.icon}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide opacity-90 mb-0.5">
            {t('unlocked')}
          </p>
          <p className="font-bold text-sm leading-tight truncate">{name}</p>
          <p className="text-xs opacity-80 leading-snug mt-0.5">{desc}</p>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors mt-0.5"
          aria-label={t('dismiss')}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
