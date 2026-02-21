'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '@/utils/webrtc/supabaseClient'
import { LEADERBOARD_CONFIGS, type GameLeaderboardConfig } from '@/config/leaderboardConfig'

const PLAYER_NAME_KEY = 'leaderboard_player_name'
const PLAYER_ID_KEY = 'ai_game_player_id'

export interface LeaderboardEntry {
  player_name: string
  score: number
  player_id: string
  created_at: string
}

export interface SubmitResult {
  submitted: boolean
  reason?: string
  rank: number
  personal_best: number | null
}

export interface UseLeaderboardReturn {
  entries: LeaderboardEntry[]
  playerRank: number | null
  playerScore: number | null
  isLoading: boolean
  config: GameLeaderboardConfig
  playerId: string
  savedPlayerName: string | null
  isSupabaseAvailable: boolean
  fetchLeaderboard: () => Promise<void>
  checkQualifies: (score: number) => boolean
  submitScore: (score: number, playerName: string, gameDurationMs?: number) => Promise<SubmitResult | null>
  savePlayerName: (name: string) => void
}

export function useLeaderboard(gameKey: string, difficulty?: string): UseLeaderboardReturn {
  const config = LEADERBOARD_CONFIGS[gameKey]
  const effectiveDifficulty = difficulty ?? 'default'

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerRank, setPlayerRank] = useState<number | null>(null)
  const [playerScore, setPlayerScore] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [savedPlayerName, setSavedPlayerName] = useState<string | null>(null)
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false)

  useEffect(() => {
    let id = ''
    try {
      id = localStorage.getItem(PLAYER_ID_KEY) ?? ''
      if (!id) {
        id = crypto.randomUUID?.() ??
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
        localStorage.setItem(PLAYER_ID_KEY, id)
      }
      setPlayerId(id)
      setSavedPlayerName(localStorage.getItem(PLAYER_NAME_KEY))
    } catch {
      // localStorage not available
    }
    setIsSupabaseAvailable(isSupabaseConfigured())
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured() || !playerId || !config) return

    setIsLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_game_type: config.gameType,
        p_difficulty: effectiveDifficulty,
        p_score_type: config.scoreType,
        p_player_id: playerId,
      })

      if (error) throw error

      setEntries(data?.entries ?? [])
      setPlayerRank(data?.player_rank ?? null)
      setPlayerScore(data?.player_score ?? null)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }, [playerId, config, effectiveDifficulty])

  useEffect(() => {
    if (playerId && config) {
      fetchLeaderboard()
    }
  }, [playerId, config, fetchLeaderboard])

  const checkQualifies = useCallback((score: number): boolean => {
    if (!config) return false
    if (entries.length < 10) return true
    if (config.scoreType === 'lower_better') {
      const worst = Math.max(...entries.map(e => e.score))
      return score < worst
    } else {
      const worst = Math.min(...entries.map(e => e.score))
      return score > worst
    }
  }, [entries, config])

  const submitScore = useCallback(async (
    score: number,
    playerName: string,
    gameDurationMs?: number
  ): Promise<SubmitResult | null> => {
    if (!isSupabaseConfigured() || !playerId || !config) return null

    if (!config.validate(score, effectiveDifficulty)) return null
    if (gameDurationMs !== undefined && config.minDurationMs !== undefined) {
      if (gameDurationMs < config.minDurationMs) return null
    }

    try {
      const supabase = getSupabase()
      if (!supabase) return null

      const { data, error } = await supabase.rpc('submit_leaderboard_score', {
        p_game_type: config.gameType,
        p_difficulty: effectiveDifficulty,
        p_player_id: playerId,
        p_player_name: playerName.trim().slice(0, 20),
        p_score: score,
        p_score_type: config.scoreType,
        p_game_duration_ms: gameDurationMs ?? null,
        p_extra_data: {},
      })

      if (error) throw error

      await fetchLeaderboard()
      return data as SubmitResult
    } catch (err) {
      console.error('Failed to submit score:', err)
      return null
    }
  }, [playerId, config, effectiveDifficulty, fetchLeaderboard])

  const savePlayerName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20)
    try {
      localStorage.setItem(PLAYER_NAME_KEY, trimmed)
    } catch {
      // ignore
    }
    setSavedPlayerName(trimmed)
  }, [])

  return {
    entries,
    playerRank,
    playerScore,
    isLoading,
    config,
    playerId,
    savedPlayerName,
    isSupabaseAvailable,
    fetchLeaderboard,
    checkQualifies,
    submitScore,
    savePlayerName,
  }
}
