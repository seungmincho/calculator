'use client'

import { useTranslations } from '@/lib/i18n'
import { Trophy, Medal, Crown, RefreshCw } from 'lucide-react'
import type { UseLeaderboardReturn } from '@/hooks/useLeaderboard'
import { glassCard, glassInset } from '@/lib/glass'

interface LeaderboardPanelProps {
  leaderboard: UseLeaderboardReturn
  className?: string
}

export default function LeaderboardPanel({ leaderboard, className = '' }: LeaderboardPanelProps) {
  const t = useTranslations('leaderboard')
  const { entries, playerRank, playerScore, isLoading, config, playerId, isSupabaseAvailable, fetchLeaderboard } = leaderboard

  if (!isSupabaseAvailable) return null

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 text-center text-sm font-bold text-muted">{rank}</span>
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) return t('today')
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className={`${glassCard} ${glassInset} p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-fg flex items-center gap-2">
          {t('title')}
        </h2>
        <button
          onClick={() => fetchLeaderboard()}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="text-center py-8 text-faint text-sm">
          {t('loading')}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-faint text-sm">
          {t('noEntries')}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted uppercase">
            <div className="col-span-2">{t('rank')}</div>
            <div className="col-span-5">{t('playerName')}</div>
            <div className="col-span-3 text-right">{t('score')}</div>
            <div className="col-span-2 text-right">{t('date')}</div>
          </div>

          {/* Entries */}
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const rank = index + 1
              const isMe = entry.player_id === playerId
              return (
                <div
                  key={`${entry.player_id}-${index}`}
                  className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg transition-colors ${
                    isMe
                      ? 'bg-primary-soft text-primary'
                      : rank <= 3
                        ? 'bg-subtle'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <div className="col-span-2 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>
                  <div className="col-span-5 font-medium text-fg truncate">
                    {entry.player_name}
                    {isMe && (
                      <span className="ml-1 text-xs text-blue-500 dark:text-blue-400">{t('you')}</span>
                    )}
                  </div>
                  <div className={`col-span-3 text-right font-bold ${
                    rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                    rank <= 3 ? 'text-body' :
                    'text-body'
                  }`}>
                    {config.formatScore(entry.score)}
                  </div>
                  <div className="col-span-2 text-right text-xs text-faint">
                    {formatDate(entry.created_at)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Player's rank if outside top 10 */}
          {playerRank && playerRank > 10 && playerScore !== null && (
            <div className="mt-4 pt-3 border-t border-line">
              <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-subtle rounded-lg ring-1 ring-blue-200 dark:ring-blue-800">
                <div className="col-span-2 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                  {playerRank}
                </div>
                <div className="col-span-5 font-medium text-fg">
                  {t('myRank')}
                </div>
                <div className="col-span-5 text-right font-bold text-blue-600 dark:text-blue-400">
                  {config.formatScore(playerScore)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
