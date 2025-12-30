'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GameType,
  Difficulty,
  GameResult,
  PlayerGameStats,
  GlobalStats,
  recordAIGameResult,
  getPlayerGameStats,
  getAllPlayerStats,
  getAIGamesCountByType,
  getGlobalStats,
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
  // 나의 통계
  myStats: PlayerGameStats[]
  myTotalGames: number
  myTotalWins: number
  myTotalLosses: number
  // 전체 글로벌 통계
  globalStats: GlobalStats | null
  // 레거시 호환성
  allStats: PlayerGameStats[]
  gameCountsByType: Record<GameType, number>
  totalGames: number
  totalWins: number
  isLoading: boolean
  refreshStats: () => Promise<void>
}

const defaultGlobalStats: GlobalStats = {
  totalGames: 0,
  totalAIGames: 0,
  totalOnlineGames: 0,
  totalRoomsCreated: 0,
  uniquePlayers: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  byGameType: {} as GlobalStats['byGameType']
}

export const useAllAIStats = (): UseAllAIStatsReturn => {
  const [playerId, setPlayerId] = useState<string>('')
  const [myStats, setMyStats] = useState<PlayerGameStats[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
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
      // 내 통계와 글로벌 통계를 병렬로 가져오기
      const [myStatsData, global] = await Promise.all([
        getAllPlayerStats(playerId, GAME_TYPES),
        getGlobalStats(GAME_TYPES)
      ])

      setMyStats(myStatsData)
      setGlobalStats(global)

      // 게임별 전체 판 수 (글로벌 통계에서 추출)
      const counts: Record<GameType, number> = {} as Record<GameType, number>
      GAME_TYPES.forEach((gameType) => {
        counts[gameType] = global.byGameType[gameType]?.games || 0
      })
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

  // 나의 통계 집계
  const myTotalGames = myStats.reduce((sum, s) => sum + s.totalGames, 0)
  const myTotalWins = myStats.reduce((sum, s) => sum + s.totalWins, 0)
  const myTotalLosses = myStats.reduce((sum, s) => {
    return sum + (s.easy.losses + s.normal.losses + s.hard.losses)
  }, 0)

  return {
    playerId,
    // 나의 통계
    myStats,
    myTotalGames,
    myTotalWins,
    myTotalLosses,
    // 전체 글로벌 통계
    globalStats,
    // 레거시 호환성 (기존 코드와 호환)
    allStats: myStats,
    gameCountsByType,
    totalGames: myTotalGames,
    totalWins: myTotalWins,
    isLoading,
    refreshStats
  }
}
