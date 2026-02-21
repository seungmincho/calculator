'use client'

import { useState, useEffect, useCallback } from 'react'

export type AchievementId =
  | 'first_win'
  | 'win_streak_3'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'beat_hard'
  | 'games_10'
  | 'games_50'
  | 'games_100'
  | 'all_games_played'
  | 'all_games_won'
  | 'speed_win'
  | 'comeback_king'

export interface Achievement {
  id: AchievementId
  icon: string
  nameKey: string
  descKey: string
  unlocked: boolean
  unlockedAt?: number
}

interface AchievementData {
  unlocked: Partial<Record<AchievementId, number>>
  totalGames: number
  totalWins: number
  currentWinStreak: number
  maxWinStreak: number
  currentLossStreak: number
  gamesPlayedByType: Record<string, number>
  gamesWonByType: Record<string, number>
  hardWins: number
  minWinMoves: number
}

export type GameType =
  | 'omok'
  | 'othello'
  | 'connect4'
  | 'checkers'
  | 'mancala'
  | 'battleship'
  | 'dotsandboxes'

const ALL_GAME_TYPES: GameType[] = [
  'omok',
  'othello',
  'connect4',
  'checkers',
  'mancala',
  'battleship',
  'dotsandboxes',
]

const STORAGE_KEY = 'game_achievements'

interface AchievementDefinition {
  id: AchievementId
  icon: string
  nameKey: string
  descKey: string
}

export const ACHIEVEMENTS_LIST: AchievementDefinition[] = [
  {
    id: 'first_win',
    icon: '🏆',
    nameKey: 'first_win.name',
    descKey: 'first_win.desc',
  },
  {
    id: 'win_streak_3',
    icon: '🔥',
    nameKey: 'win_streak_3.name',
    descKey: 'win_streak_3.desc',
  },
  {
    id: 'win_streak_5',
    icon: '⚡',
    nameKey: 'win_streak_5.name',
    descKey: 'win_streak_5.desc',
  },
  {
    id: 'win_streak_10',
    icon: '👑',
    nameKey: 'win_streak_10.name',
    descKey: 'win_streak_10.desc',
  },
  {
    id: 'beat_hard',
    icon: '💪',
    nameKey: 'beat_hard.name',
    descKey: 'beat_hard.desc',
  },
  {
    id: 'games_10',
    icon: '🎮',
    nameKey: 'games_10.name',
    descKey: 'games_10.desc',
  },
  {
    id: 'games_50',
    icon: '🎯',
    nameKey: 'games_50.name',
    descKey: 'games_50.desc',
  },
  {
    id: 'games_100',
    icon: '🌟',
    nameKey: 'games_100.name',
    descKey: 'games_100.desc',
  },
  {
    id: 'all_games_played',
    icon: '🗺️',
    nameKey: 'all_games_played.name',
    descKey: 'all_games_played.desc',
  },
  {
    id: 'all_games_won',
    icon: '🏅',
    nameKey: 'all_games_won.name',
    descKey: 'all_games_won.desc',
  },
  {
    id: 'speed_win',
    icon: '⚡',
    nameKey: 'speed_win.name',
    descKey: 'speed_win.desc',
  },
  {
    id: 'comeback_king',
    icon: '👊',
    nameKey: 'comeback_king.name',
    descKey: 'comeback_king.desc',
  },
]

const DEFAULT_DATA: AchievementData = {
  unlocked: {},
  totalGames: 0,
  totalWins: 0,
  currentWinStreak: 0,
  maxWinStreak: 0,
  currentLossStreak: 0,
  gamesPlayedByType: {},
  gamesWonByType: {},
  hardWins: 0,
  minWinMoves: Infinity,
}

function loadData(): AchievementData {
  if (typeof window === 'undefined') return { ...DEFAULT_DATA }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DATA }
    const parsed = JSON.parse(raw) as AchievementData
    // Ensure minWinMoves is restored correctly (Infinity serialises as null in JSON)
    if (parsed.minWinMoves === null || parsed.minWinMoves === undefined) {
      parsed.minWinMoves = Infinity
    }
    if (!parsed.unlocked) parsed.unlocked = {}
    if (!parsed.gamesPlayedByType) parsed.gamesPlayedByType = {}
    if (!parsed.gamesWonByType) parsed.gamesWonByType = {}
    return parsed
  } catch {
    return { ...DEFAULT_DATA }
  }
}

function saveData(data: AchievementData): void {
  if (typeof window === 'undefined') return
  try {
    // Replace Infinity with a sentinel so JSON.stringify keeps it round-trippable
    const serialisable = {
      ...data,
      minWinMoves: isFinite(data.minWinMoves) ? data.minWinMoves : null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialisable))
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

function checkAchievements(
  data: AchievementData,
  result: 'win' | 'loss' | 'draw',
  difficulty: string,
  moves: number
): AchievementId[] {
  const newlyUnlocked: AchievementId[] = []

  function tryUnlock(id: AchievementId, condition: boolean): void {
    if (condition && !data.unlocked[id]) {
      data.unlocked[id] = Date.now()
      newlyUnlocked.push(id)
    }
  }

  const allTypesPlayed = ALL_GAME_TYPES.every(
    (gt) => (data.gamesPlayedByType[gt] ?? 0) > 0
  )
  const allTypesWon = ALL_GAME_TYPES.every(
    (gt) => (data.gamesWonByType[gt] ?? 0) > 0
  )

  tryUnlock('first_win', data.totalWins >= 1)
  tryUnlock('win_streak_3', data.currentWinStreak >= 3)
  tryUnlock('win_streak_5', data.currentWinStreak >= 5)
  tryUnlock('win_streak_10', data.currentWinStreak >= 10)
  tryUnlock('beat_hard', data.hardWins >= 1)
  tryUnlock('games_10', data.totalGames >= 10)
  tryUnlock('games_50', data.totalGames >= 50)
  tryUnlock('games_100', data.totalGames >= 100)
  tryUnlock('all_games_played', allTypesPlayed)
  tryUnlock('all_games_won', allTypesWon)
  tryUnlock('speed_win', result === 'win' && moves <= 15)
  tryUnlock(
    'comeback_king',
    result === 'win' && data.currentWinStreak === 1 && data.currentLossStreak === 0
    // currentLossStreak was reset to 0 after this win; we check via the
    // previous loss streak tracked before mutation — see recordGameResult
  )

  return newlyUnlocked
}

function buildAchievements(data: AchievementData): Achievement[] {
  return ACHIEVEMENTS_LIST.map((def) => ({
    id: def.id,
    icon: def.icon,
    nameKey: def.nameKey,
    descKey: def.descKey,
    unlocked: !!data.unlocked[def.id],
    unlockedAt: data.unlocked[def.id],
  }))
}

export function useGameAchievements() {
  const [data, setData] = useState<AchievementData>(() => loadData())
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([])

  // Persist whenever data changes
  useEffect(() => {
    saveData(data)
  }, [data])

  const recordGameResult = useCallback(
    (params: {
      gameType: string
      result: 'win' | 'loss' | 'draw'
      difficulty: string
      moves: number
    }) => {
      const { gameType, result, difficulty, moves } = params

      setData((prev) => {
        const next: AchievementData = {
          ...prev,
          unlocked: { ...prev.unlocked },
          gamesPlayedByType: { ...prev.gamesPlayedByType },
          gamesWonByType: { ...prev.gamesWonByType },
        }

        // --- accumulate stats ---
        next.totalGames += 1
        next.gamesPlayedByType[gameType] = (next.gamesPlayedByType[gameType] ?? 0) + 1

        const prevLossStreak = next.currentLossStreak

        if (result === 'win') {
          next.totalWins += 1
          next.currentWinStreak += 1
          next.currentLossStreak = 0
          next.gamesWonByType[gameType] = (next.gamesWonByType[gameType] ?? 0) + 1

          if (next.currentWinStreak > next.maxWinStreak) {
            next.maxWinStreak = next.currentWinStreak
          }

          if (difficulty === 'hard') {
            next.hardWins += 1
          }

          if (moves < next.minWinMoves) {
            next.minWinMoves = moves
          }
        } else if (result === 'loss') {
          next.currentWinStreak = 0
          next.currentLossStreak += 1
        } else {
          // draw — reset streaks
          next.currentWinStreak = 0
          next.currentLossStreak = 0
        }

        // --- check achievements ---
        // comeback_king: win after 3+ consecutive losses
        // We need the pre-win loss streak, captured in prevLossStreak
        const newIds = checkAchievements(next, result, difficulty, moves)

        // Override comeback_king check with accurate prevLossStreak
        if (
          result === 'win' &&
          prevLossStreak >= 3 &&
          !prev.unlocked['comeback_king']
        ) {
          if (!next.unlocked['comeback_king']) {
            next.unlocked['comeback_king'] = Date.now()
            if (!newIds.includes('comeback_king')) {
              newIds.push('comeback_king')
            }
          }
        } else if (newIds.includes('comeback_king') && !(result === 'win' && prevLossStreak >= 3)) {
          // Remove incorrectly added comeback_king (from checkAchievements heuristic)
          const idx = newIds.indexOf('comeback_king')
          if (idx !== -1) newIds.splice(idx, 1)
          delete next.unlocked['comeback_king']
        }

        if (newIds.length > 0) {
          const newAchievements = newIds.map((id) => {
            const def = ACHIEVEMENTS_LIST.find((a) => a.id === id)!
            return {
              id,
              icon: def.icon,
              nameKey: def.nameKey,
              descKey: def.descKey,
              unlocked: true,
              unlockedAt: next.unlocked[id],
            } satisfies Achievement
          })
          setNewlyUnlocked((prev) => [...prev, ...newAchievements])
        }

        return next
      })
    },
    []
  )

  const dismissNewAchievements = useCallback(() => {
    setNewlyUnlocked(prev => prev.slice(1))
  }, [])

  const achievements = buildAchievements(data)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = ACHIEVEMENTS_LIST.length

  return {
    achievements,
    newlyUnlocked,
    unlockedCount,
    totalCount,
    recordGameResult,
    dismissNewAchievements,
  }
}
