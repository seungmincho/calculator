import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { AIGameStats, GameType, Difficulty, GameResult, PlayerGameStats } from './types'

const AI_STATS_TABLE = 'ai_game_stats'

// localStorage fallback 키
const LOCAL_STORAGE_KEY = 'ai_game_stats_local'

interface LocalStats {
  [key: string]: { // key: `${gameType}_${difficulty}`
    wins: number
    losses: number
    draws: number
  }
}

// localStorage에서 통계 가져오기
const getLocalStats = (): LocalStats => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// localStorage에 통계 저장
const setLocalStats = (stats: LocalStats): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats))
  } catch (e) {
    console.error('Failed to save local stats:', e)
  }
}

// 게임 결과 기록 (Supabase + localStorage fallback)
export const recordAIGameResult = async (
  playerId: string,
  gameType: GameType,
  difficulty: Difficulty,
  result: GameResult
): Promise<boolean> => {
  // localStorage에도 항상 저장 (fallback)
  const localStats = getLocalStats()
  const key = `${gameType}_${difficulty}`
  if (!localStats[key]) {
    localStats[key] = { wins: 0, losses: 0, draws: 0 }
  }
  if (result === 'win') localStats[key].wins++
  else if (result === 'loss') localStats[key].losses++
  else localStats[key].draws++
  setLocalStats(localStats)

  // Supabase가 설정되어 있으면 서버에도 저장
  const supabase = getSupabase()
  if (!supabase) return true // localStorage만 사용

  try {
    // RPC 함수 호출 (upsert 처리)
    const { error } = await supabase.rpc('record_ai_game_result', {
      p_player_id: playerId,
      p_game_type: gameType,
      p_difficulty: difficulty,
      p_result: result
    })

    if (error) {
      // RPC가 없으면 직접 upsert 시도
      console.warn('RPC not available, using direct upsert:', error)
      return await upsertAIStats(playerId, gameType, difficulty, result)
    }

    return true
  } catch (err) {
    console.error('Error recording AI game result:', err)
    return true // localStorage에는 저장됨
  }
}

// 직접 upsert (RPC fallback)
const upsertAIStats = async (
  playerId: string,
  gameType: GameType,
  difficulty: Difficulty,
  result: GameResult
): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  // 기존 통계 조회
  const { data: existing } = await supabase
    .from(AI_STATS_TABLE)
    .select('*')
    .eq('player_id', playerId)
    .eq('game_type', gameType)
    .eq('difficulty', difficulty)
    .single()

  if (existing) {
    // 업데이트
    const updates: Partial<AIGameStats> = {}
    if (result === 'win') updates.wins = (existing.wins || 0) + 1
    else if (result === 'loss') updates.losses = (existing.losses || 0) + 1
    else updates.draws = (existing.draws || 0) + 1

    const { error } = await supabase
      .from(AI_STATS_TABLE)
      .update(updates)
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating AI stats:', error)
      return false
    }
  } else {
    // 새로 생성
    const { error } = await supabase
      .from(AI_STATS_TABLE)
      .insert({
        player_id: playerId,
        game_type: gameType,
        difficulty: difficulty,
        wins: result === 'win' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        draws: result === 'draw' ? 1 : 0
      })

    if (error) {
      console.error('Error inserting AI stats:', error)
      return false
    }
  }

  return true
}

// 플레이어의 특정 게임 통계 조회
export const getPlayerGameStats = async (
  playerId: string,
  gameType: GameType
): Promise<PlayerGameStats> => {
  const emptyDifficulty = { wins: 0, losses: 0, draws: 0, total: 0 }
  const defaultStats: PlayerGameStats = {
    game_type: gameType,
    easy: { ...emptyDifficulty },
    normal: { ...emptyDifficulty },
    hard: { ...emptyDifficulty },
    totalGames: 0,
    totalWins: 0
  }

  // Supabase에서 조회 시도
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase
      .from(AI_STATS_TABLE)
      .select('*')
      .eq('player_id', playerId)
      .eq('game_type', gameType)

    if (!error && data && data.length > 0) {
      data.forEach((stat: AIGameStats) => {
        const diffStats = {
          wins: stat.wins || 0,
          losses: stat.losses || 0,
          draws: stat.draws || 0,
          total: (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0)
        }

        if (stat.difficulty === 'easy') defaultStats.easy = diffStats
        else if (stat.difficulty === 'normal') defaultStats.normal = diffStats
        else if (stat.difficulty === 'hard') defaultStats.hard = diffStats
      })

      defaultStats.totalGames =
        defaultStats.easy.total + defaultStats.normal.total + defaultStats.hard.total
      defaultStats.totalWins =
        defaultStats.easy.wins + defaultStats.normal.wins + defaultStats.hard.wins

      return defaultStats
    }
  }

  // localStorage fallback
  const localStats = getLocalStats()
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard']

  difficulties.forEach(diff => {
    const key = `${gameType}_${diff}`
    const stat = localStats[key]
    if (stat) {
      defaultStats[diff] = {
        wins: stat.wins || 0,
        losses: stat.losses || 0,
        draws: stat.draws || 0,
        total: (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0)
      }
    }
  })

  defaultStats.totalGames =
    defaultStats.easy.total + defaultStats.normal.total + defaultStats.hard.total
  defaultStats.totalWins =
    defaultStats.easy.wins + defaultStats.normal.wins + defaultStats.hard.wins

  return defaultStats
}

// 플레이어의 모든 게임 통계 조회
export const getAllPlayerStats = async (
  playerId: string,
  gameTypes: GameType[]
): Promise<PlayerGameStats[]> => {
  const results = await Promise.all(
    gameTypes.map(gameType => getPlayerGameStats(playerId, gameType))
  )
  return results
}

// 전체 AI 게임 판 수 (모든 플레이어)
export const getTotalAIGamesCount = async (): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase) {
    // localStorage에서 계산
    const localStats = getLocalStats()
    return Object.values(localStats).reduce(
      (sum, stat) => sum + (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0),
      0
    )
  }

  const { data, error } = await supabase
    .from(AI_STATS_TABLE)
    .select('wins, losses, draws')

  if (error || !data) return 0

  return data.reduce(
    (sum, stat) => sum + (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0),
    0
  )
}

// 게임별 전체 AI 대전 횟수
export const getAIGamesCountByType = async (gameType: GameType): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase) {
    // localStorage에서 계산
    const localStats = getLocalStats()
    let total = 0
    Object.entries(localStats).forEach(([key, stat]) => {
      if (key.startsWith(`${gameType}_`)) {
        total += (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0)
      }
    })
    return total
  }

  const { data, error } = await supabase
    .from(AI_STATS_TABLE)
    .select('wins, losses, draws')
    .eq('game_type', gameType)

  if (error || !data) return 0

  return data.reduce(
    (sum, stat) => sum + (stat.wins || 0) + (stat.losses || 0) + (stat.draws || 0),
    0
  )
}

// 전체 글로벌 통계 (AI 대전 + 온라인 대전 통합)
export interface GlobalStats {
  // 전체 통계
  totalGames: number           // AI + 온라인 총 게임 수
  totalAIGames: number         // AI 대전 수
  totalOnlineGames: number     // 온라인 대전 수
  totalRoomsCreated: number    // 생성된 방 수
  uniquePlayers: number        // 고유 플레이어 수
  // AI 대전 통계
  totalWins: number
  totalLosses: number
  totalDraws: number
  // 게임별 통계
  byGameType: Record<GameType, {
    games: number          // 총 게임 수 (AI + 온라인)
    aiGames: number        // AI 대전 수
    onlineGames: number    // 온라인 대전 수
    roomsCreated: number   // 생성된 방 수
    wins: number
    losses: number
    draws: number
  }>
}

const ROOMS_TABLE = 'game_rooms'

export const getGlobalStats = async (gameTypes: GameType[]): Promise<GlobalStats> => {
  const defaultStats: GlobalStats = {
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

  // 게임 타입별 초기화
  gameTypes.forEach(gt => {
    defaultStats.byGameType[gt] = {
      games: 0, aiGames: 0, onlineGames: 0, roomsCreated: 0,
      wins: 0, losses: 0, draws: 0
    }
  })

  const supabase = getSupabase()
  if (!supabase) {
    return defaultStats
  }

  try {
    // 1. AI 대전 통계 조회
    const { data: aiData, error: aiError } = await supabase
      .from(AI_STATS_TABLE)
      .select('player_id, game_type, wins, losses, draws')

    // 2. 온라인 대전 통계 조회 (game_rooms 테이블)
    const { data: roomData, error: roomError } = await supabase
      .from(ROOMS_TABLE)
      .select('game_type, games_played, host_id')

    const uniquePlayerIds = new Set<string>()

    // AI 대전 통계 집계
    if (!aiError && aiData) {
      aiData.forEach((stat: { player_id: string, game_type: string, wins: number, losses: number, draws: number }) => {
        uniquePlayerIds.add(stat.player_id)

        const wins = stat.wins || 0
        const losses = stat.losses || 0
        const draws = stat.draws || 0
        const games = wins + losses + draws

        defaultStats.totalAIGames += games
        defaultStats.totalWins += wins
        defaultStats.totalLosses += losses
        defaultStats.totalDraws += draws

        const gameType = stat.game_type as GameType
        if (defaultStats.byGameType[gameType]) {
          defaultStats.byGameType[gameType].aiGames += games
          defaultStats.byGameType[gameType].wins += wins
          defaultStats.byGameType[gameType].losses += losses
          defaultStats.byGameType[gameType].draws += draws
        }
      })
    }

    // 온라인 대전 통계 집계
    if (!roomError && roomData) {
      roomData.forEach((room: { game_type: string, games_played: number, host_id: string }) => {
        if (room.host_id) {
          uniquePlayerIds.add(room.host_id)
        }

        const gamesPlayed = room.games_played || 0
        const gameType = room.game_type as GameType

        defaultStats.totalRoomsCreated += 1
        defaultStats.totalOnlineGames += gamesPlayed

        if (defaultStats.byGameType[gameType]) {
          defaultStats.byGameType[gameType].roomsCreated += 1
          defaultStats.byGameType[gameType].onlineGames += gamesPlayed
        }
      })
    }

    // 총 게임 수 계산
    defaultStats.totalGames = defaultStats.totalAIGames + defaultStats.totalOnlineGames
    defaultStats.uniquePlayers = uniquePlayerIds.size

    // 게임별 총 게임 수 계산
    gameTypes.forEach(gt => {
      const stats = defaultStats.byGameType[gt]
      stats.games = stats.aiGames + stats.onlineGames
    })

    return defaultStats
  } catch (err) {
    console.error('Error fetching global stats:', err)
    return defaultStats
  }
}
