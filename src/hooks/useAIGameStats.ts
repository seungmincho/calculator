'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GameType,
  Difficulty,
  GameResult,
  PlayerGameStats,
  recordAIGameResult,
  getPlayerGameStats,
  getAllPlayerStats,
  getAIGamesCountByType,
  generatePlayerId
} from '@/utils/webrtc'

interface UseAIGameStatsReturn {
  playerId: string
  stats: PlayerGameStats | null
  allStats: PlayerGameStats[]
  isLoading: boolean
  error: string | null
  recordResult: (result: GameResult) => Promise<boolean>
  refreshStats: () => Promise<void>
}

const GAME_TYPES: GameType[] = [
  'omok', 'othello', 'connect4', 'checkers', 'mancala', 'battleship', 'dotsandboxes'
]

export const useAIGameStats = (
  gameType: GameType,
  difficulty: Difficulty
): UseAIGameStatsReturn => {
  const [playerId, setPlayerId] = useState<string>('')
  const [stats, setStats] = useState<PlayerGameStats | null>(null)
  const [allStats, setAllStats] = useState<PlayerGameStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 플레이어 ID 초기화
  useEffect(() => {
    const storageKey = 'ai_game_player_id'
    let storedId = localStorage.getItem(storageKey)

    if (!storedId) {
      storedId = generatePlayerId()
      localStorage.setItem(storageKey, storedId)
    }

    setPlayerId(storedId)
  }, [])

  // 통계 조회
  const refreshStats = useCallback(async () => {
    if (!playerId) return

    setIsLoading(true)
    setError(null)

    try {
      const [gameStats, all] = await Promise.all([
        getPlayerGameStats(playerId, gameType),
        getAllPlayerStats(playerId, GAME_TYPES)
      ])
      setStats(gameStats)
      setAllStats(all)
    } catch (err) {
      setError('통계를 불러오는데 실패했습니다.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [playerId, gameType])

  // 초기 로딩
  useEffect(() => {
    if (playerId) {
      refreshStats()
    }
  }, [playerId, refreshStats])

  // 게임 결과 기록
  const recordResult = useCallback(
    async (result: GameResult): Promise<boolean> => {
      if (!playerId) return false

      try {
        const success = await recordAIGameResult(playerId, gameType, difficulty, result)
        if (success) {
          // 통계 갱신
          await refreshStats()
        }
        return success
      } catch (err) {
        console.error('Failed to record game result:', err)
        return false
      }
    },
    [playerId, gameType, difficulty, refreshStats]
  )

  return {
    playerId,
    stats,
    allStats,
    isLoading,
    error,
    recordResult,
    refreshStats
  }
}

// 전체 AI 게임 통계 조회용 (GameHub에서 사용)
interface UseAllAIStatsReturn {
  playerId: string
  allStats: PlayerGameStats[]
  gameCountsByType: Record<GameType, number>
  totalGames: number
  totalWins: number
  isLoading: boolean
  refreshStats: () => Promise<void>
}

export const useAllAIStats = (): UseAllAIStatsReturn => {
  const [playerId, setPlayerId] = useState<string>('')
  const [allStats, setAllStats] = useState<PlayerGameStats[]>([])
  const [gameCountsByType, setGameCountsByType] = useState<Record<GameType, number>>({} as Record<GameType, number>)
  const [isLoading, setIsLoading] = useState(true)

  // 플레이어 ID 초기화
  useEffect(() => {
    const storageKey = 'ai_game_player_id'
    let storedId = localStorage.getItem(storageKey)

    if (!storedId) {
      storedId = generatePlayerId()
      localStorage.setItem(storageKey, storedId)
    }

    setPlayerId(storedId)
  }, [])

  const refreshStats = useCallback(async () => {
    if (!playerId) return

    setIsLoading(true)

    try {
      // 내 통계
      const all = await getAllPlayerStats(playerId, GAME_TYPES)
      setAllStats(all)

      // 게임별 전체 판 수
      const counts: Record<GameType, number> = {} as Record<GameType, number>
      await Promise.all(
        GAME_TYPES.map(async (gameType) => {
          counts[gameType] = await getAIGamesCountByType(gameType)
        })
      )
      setGameCountsByType(counts)
    } catch (err) {
      console.error('Failed to load AI stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    if (playerId) {
      refreshStats()
    }
  }, [playerId, refreshStats])

  const totalGames = allStats.reduce((sum, s) => sum + s.totalGames, 0)
  const totalWins = allStats.reduce((sum, s) => sum + s.totalWins, 0)

  return {
    playerId,
    allStats,
    gameCountsByType,
    totalGames,
    totalWins,
    isLoading,
    refreshStats
  }
}
