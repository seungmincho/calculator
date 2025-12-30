// Supabase Client
export { getSupabase, isSupabaseConfigured } from './supabaseClient'

// Types
export type {
  GameType,
  RoomStatus,
  GameRoom,
  CreateRoomInput,
  OmokMove,
  OmokGameState,
  Difficulty,
  GameResult,
  AIGameStats,
  PlayerGameStats
} from './types'

// Room Manager (Supabase - 방 목록만 관리)
export {
  getRooms,
  getRoomStats,
  getMonthlyStats,
  createRoom,
  updateRoomStatus,
  updateRoomHostId,
  tryJoinRoom,
  sendRoomHeartbeat,
  closeRoom,
  incrementGamesPlayed,
  deleteRoom,
  getRoom,
  subscribeToRooms,
  unsubscribeFromRooms
} from './roomManager'
export type { RoomStats, MonthlyStats } from './roomManager'

// Peer Manager (PeerJS - 실시간 게임 통신)
export { PeerManager, createPeerManager } from './peerManager'
export type { PeerMessage, MessageType } from './peerManager'

// AI Stats Manager (AI 대전 통계)
export {
  recordAIGameResult,
  getPlayerGameStats,
  getAllPlayerStats,
  getTotalAIGamesCount,
  getAIGamesCountByType,
  getGlobalStats
} from './aiStatsManager'
export type { GlobalStats } from './aiStatsManager'

// Utils
export { generatePlayerId } from './gameChannel'
