// 게임 타입
export type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes' | string

// 방 상태
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed'

// 방 정보 (Supabase rooms 테이블)
export interface GameRoom {
  id: string
  host_name: string
  host_id: string
  room_title?: string  // 방 제목 (선택)
  game_type: GameType
  status: RoomStatus
  is_private: boolean
  games_played: number  // 완료된 게임 수
  created_at: string
  updated_at: string
}

// 방 생성 입력
export interface CreateRoomInput {
  hostName: string
  hostId: string
  gameType: GameType
  isPrivate?: boolean
  roomTitle?: string  // 방 제목 (선택)
}

// 플레이어 정보 (Presence용)
export interface PlayerPresence {
  playerId: string
  playerName: string
  playerColor: 'black' | 'white' | 'spectator'
  onlineAt: string
}

// Broadcast 메시지 타입
export interface BroadcastMessage {
  type: 'move' | 'chat' | 'ready' | 'restart' | 'surrender' | 'leave'
  payload: unknown
  senderId: string
  timestamp: number
}

// 오목 착수 정보
export interface OmokMove {
  x: number  // 0-18
  y: number  // 0-18
  player: 'black' | 'white'
  moveNumber: number
}

// 오목 게임 상태
export interface OmokGameState {
  board: (null | 'black' | 'white')[][]  // 19x19
  currentTurn: 'black' | 'white'
  moveHistory: OmokMove[]
  winner: 'black' | 'white' | 'draw' | null
  lastMove: OmokMove | null
}

// 게임 기록 (Supabase game_records 테이블)
export interface GameRecord {
  id: string
  room_id: string
  game_type: GameType
  black_player: string
  white_player: string
  winner: 'black' | 'white' | 'draw' | null
  move_history: OmokMove[]
  created_at: string
  finished_at: string | null
}

// AI 대전 난이도
export type Difficulty = 'easy' | 'normal' | 'hard'

// AI 대전 결과
export type GameResult = 'win' | 'loss' | 'draw'

// AI 게임 통계 (Supabase ai_game_stats 테이블)
export interface AIGameStats {
  id: string
  player_id: string
  game_type: GameType
  difficulty: Difficulty
  wins: number
  losses: number
  draws: number
  created_at: string
  updated_at: string
}

// 플레이어의 게임별 통계 요약
export interface PlayerGameStats {
  game_type: GameType
  easy: { wins: number; losses: number; draws: number; total: number }
  normal: { wins: number; losses: number; draws: number; total: number }
  hard: { wins: number; losses: number; draws: number; total: number }
  totalGames: number
  totalWins: number
}
