'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Trophy, TrendingUp, Users, Gamepad2,
  Calendar, Clock, BarChart3, PieChart,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'

type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'

interface GameInfo {
  id: GameType
  icon: string
  color: string
}

const GAMES: GameInfo[] = [
  { id: 'omok', icon: '⚫', color: 'from-slate-500 to-slate-700' },
  { id: 'othello', icon: '🟢', color: 'from-emerald-500 to-emerald-700' },
  { id: 'connect4', icon: '🔴', color: 'from-rose-500 to-amber-500' },
  { id: 'checkers', icon: '🏁', color: 'from-amber-500 to-red-600' },
  { id: 'mancala', icon: '🥜', color: 'from-amber-600 to-amber-800' },
  { id: 'battleship', icon: '🚢', color: 'from-blue-500 to-blue-700' },
  { id: 'dotsandboxes', icon: '📦', color: 'from-violet-500 to-purple-600' },
]

interface GameStatsProps {
  onClose?: () => void
}

export default function GameStats({ onClose }: GameStatsProps) {
  const t = useTranslations('gameHub')
  const tStats = useTranslations('gameStats')

  // 각 게임별 통계
  const omokRoom = useGameRoom('omok')
  const othelloRoom = useGameRoom('othello')
  const connect4Room = useGameRoom('connect4')
  const checkersRoom = useGameRoom('checkers')
  const mancalaRoom = useGameRoom('mancala')
  const battleshipRoom = useGameRoom('battleship')
  const dotsRoom = useGameRoom('dotsandboxes')

  const gameRooms: Record<GameType, typeof omokRoom> = {
    omok: omokRoom,
    othello: othelloRoom,
    connect4: connect4Room,
    checkers: checkersRoom,
    mancala: mancalaRoom,
    battleship: battleshipRoom,
    dotsandboxes: dotsRoom
  }

  // 전체 통계 계산
  const totalStats = GAMES.reduce((acc, game) => {
    const stats = gameRooms[game.id]?.stats
    const monthly = gameRooms[game.id]?.monthlyStats
    return {
      totalRooms: acc.totalRooms + (stats?.total || 0),
      activeGames: acc.activeGames + (stats?.playing || 0),
      waitingRooms: acc.waitingRooms + (stats?.waiting || 0),
      monthlyGames: acc.monthlyGames + (monthly?.reduce((sum, m) => sum + m.totalGames, 0) || 0)
    }
  }, { totalRooms: 0, activeGames: 0, waitingRooms: 0, monthlyGames: 0 })

  // 게임별 통계 데이터
  const gameStatsData = GAMES.map(game => {
    const monthly = gameRooms[game.id]?.monthlyStats
    const stats = gameRooms[game.id]?.stats
    return {
      ...game,
      name: t(`gameList.${game.id}.name`),
      gamesPlayed: monthly?.reduce((sum, m) => sum + m.totalGames, 0) || 0,
      activeRooms: stats?.playing || 0,
      waitingRooms: stats?.waiting || 0,
      totalRooms: stats?.total || 0
    }
  }).sort((a, b) => b.gamesPlayed - a.gamesPlayed)

  // 가장 인기있는 게임
  const topGame = gameStatsData[0]
  const maxGames = topGame?.gamesPlayed || 1

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{tStats('title')}</h1>
              <p className="text-white/80">{tStats('description')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.monthlyGames}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tStats('monthlyGames')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white shadow-lg">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.activeGames}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tStats('activeGames')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.waitingRooms}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tStats('waitingRooms')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalStats.totalRooms}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tStats('totalRooms')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 게임별 통계 */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {tStats('gameRanking')}
          </h2>
        </div>

        <div className="space-y-4">
          {gameStatsData.map((game, index) => {
            const percentage = maxGames > 0 ? (game.gamesPlayed / maxGames) * 100 : 0

            return (
              <div key={game.id} className="relative">
                <div className="flex items-center gap-4">
                  {/* 순위 */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                    index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                    index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                    'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    {index + 1}
                  </div>

                  {/* 게임 아이콘 */}
                  <div className="text-2xl">{game.icon}</div>

                  {/* 게임 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {game.name}
                      </span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {game.gamesPlayed} {tStats('games')}
                      </span>
                    </div>
                    {/* 프로그레스 바 */}
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${game.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {/* 추가 정보 */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {tStats('playing')}: {game.activeRooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        {tStats('waiting')}: {game.waitingRooms}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 인기 게임 하이라이트 */}
      {topGame && topGame.gamesPlayed > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{topGame.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  {tStats('mostPopular')}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {topGame.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {tStats('totalGamesPlayed', { count: topGame.gamesPlayed })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
