import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from './supabaseClient'
import { GameRoom, CreateRoomInput, GameType, RoomStatus } from './types'

const ROOMS_TABLE = 'game_rooms'

// 방 목록 조회 (특정 게임 타입) - waiting 상태 + 공개방만 조회
export const getRooms = async (gameType: GameType): Promise<GameRoom[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .select('*')
    .eq('game_type', gameType)
    .eq('status', 'waiting')
    .eq('is_private', false)  // 공개방만 표시
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }

  return data || []
}

// 방 통계 조회 (공개/비공개/전체 게임 수)
export interface RoomStats {
  total: number
  public: number
  private: number
  waiting: number
  playing: number
}

export const getRoomStats = async (gameType: GameType): Promise<RoomStats> => {
  const supabase = getSupabase()
  if (!supabase) return { total: 0, public: 0, private: 0, waiting: 0, playing: 0 }

  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .select('status, is_private')
    .eq('game_type', gameType)
    .in('status', ['waiting', 'playing'])

  if (error) {
    console.error('Error fetching room stats:', error)
    return { total: 0, public: 0, private: 0, waiting: 0, playing: 0 }
  }

  const stats = {
    total: data?.length || 0,
    public: data?.filter(r => !r.is_private).length || 0,
    private: data?.filter(r => r.is_private).length || 0,
    waiting: data?.filter(r => r.status === 'waiting').length || 0,
    playing: data?.filter(r => r.status === 'playing').length || 0
  }

  return stats
}

// 방 생성
export const createRoom = async (input: CreateRoomInput): Promise<GameRoom | null> => {
  const supabase = getSupabase()
  if (!supabase) return null

  // room_title 포함하여 저장
  const insertData: Record<string, unknown> = {
    host_name: input.hostName,
    host_id: input.hostId,
    game_type: input.gameType,
    status: 'waiting' as RoomStatus,
    is_private: input.isPrivate ?? false,
    room_title: input.roomTitle || null
  }

  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating room:', error)
    return null
  }

  return data
}

// 방 상태 업데이트
export const updateRoomStatus = async (roomId: string, status: RoomStatus): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from(ROOMS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', roomId)

  if (error) {
    console.error('Error updating room status:', error)
    return false
  }

  return true
}

// 방 호스트 ID 업데이트 (PeerJS ID로 업데이트)
export const updateRoomHostId = async (roomId: string, hostId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from(ROOMS_TABLE)
    .update({ host_id: hostId, updated_at: new Date().toISOString() })
    .eq('id', roomId)

  if (error) {
    console.error('Error updating room host ID:', error)
    return false
  }

  return true
}

// 방 입장 시도 (waiting 상태일 때만 playing으로 변경 - atomic operation)
export const tryJoinRoom = async (roomId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  // waiting 상태인 방만 playing으로 업데이트 (atomic)
  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .update({ status: 'playing' as RoomStatus, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .eq('status', 'waiting')  // 오직 waiting 상태일 때만 업데이트
    .select()

  if (error) {
    console.error('Error joining room:', error)
    return false
  }

  // 업데이트된 행이 없으면 이미 다른 사람이 입장한 것
  return data && data.length > 0
}

// 방 heartbeat (updated_at 갱신 - 방이 살아있음을 알림)
export const sendRoomHeartbeat = async (roomId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from(ROOMS_TABLE)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', roomId)

  if (error) {
    console.error('Error sending heartbeat:', error)
    return false
  }

  return true
}

// 방 닫기 (삭제 대신 closed 상태로 변경 - 통계 보존)
export const closeRoom = async (roomId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from(ROOMS_TABLE)
    .update({
      status: 'closed' as RoomStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', roomId)

  if (error) {
    console.error('Error closing room:', error)
    return false
  }

  return true
}

// 게임 완료 시 games_played 증가
export const incrementGamesPlayed = async (roomId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  // RPC 호출로 atomic하게 증가
  const { error } = await supabase.rpc('increment_games_played', { room_id: roomId })

  if (error) {
    // RPC가 없으면 일반 update 시도
    console.warn('RPC not available, using regular update:', error)
    const room = await getRoom(roomId)
    if (!room) return false

    const { error: updateError } = await supabase
      .from(ROOMS_TABLE)
      .update({
        games_played: (room.games_played || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    if (updateError) {
      console.error('Error incrementing games_played:', updateError)
      return false
    }
  }

  return true
}

// 월별 게임 통계 조회
export interface MonthlyStats {
  month: string  // YYYY-MM 형식
  totalGames: number
  totalRooms: number
}

export const getMonthlyStats = async (gameType: GameType, months: number = 6): Promise<MonthlyStats[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  // 최근 N개월 데이터 조회
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .select('created_at, games_played')
    .eq('game_type', gameType)
    .gte('created_at', startDate.toISOString())

  if (error) {
    console.error('Error fetching monthly stats:', error)
    return []
  }

  // 월별로 그룹화
  const monthlyMap = new Map<string, { games: number; rooms: number }>()

  data?.forEach(room => {
    const date = new Date(room.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const current = monthlyMap.get(monthKey) || { games: 0, rooms: 0 }
    monthlyMap.set(monthKey, {
      games: current.games + (room.games_played || 0),
      rooms: current.rooms + 1
    })
  })

  // 배열로 변환 후 정렬
  return Array.from(monthlyMap.entries())
    .map(([month, stats]) => ({
      month,
      totalGames: stats.games,
      totalRooms: stats.rooms
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// 방 삭제 (실제 삭제 - 필요한 경우에만 사용)
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from(ROOMS_TABLE)
    .delete()
    .eq('id', roomId)

  if (error) {
    console.error('Error deleting room:', error)
    return false
  }

  return true
}

// 방 정보 조회
export const getRoom = async (roomId: string): Promise<GameRoom | null> => {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .select('*')
    .eq('id', roomId)
    .single()

  if (error) {
    console.error('Error fetching room:', error)
    return null
  }

  return data
}

// 방 목록 실시간 구독 (Postgres Changes)
export const subscribeToRooms = (
  gameType: GameType,
  onInsert: (room: GameRoom) => void,
  onUpdate: (room: GameRoom) => void,
  onDelete: (roomId: string) => void
): RealtimeChannel | null => {
  const supabase = getSupabase()
  if (!supabase) return null

  const channel = supabase
    .channel(`rooms:${gameType}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: ROOMS_TABLE,
        filter: `game_type=eq.${gameType}`
      },
      (payload) => {
        onInsert(payload.new as GameRoom)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: ROOMS_TABLE,
        filter: `game_type=eq.${gameType}`
      },
      (payload) => {
        onUpdate(payload.new as GameRoom)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: ROOMS_TABLE,
        filter: `game_type=eq.${gameType}`
      },
      (payload) => {
        onDelete((payload.old as { id: string }).id)
      }
    )
    .subscribe()

  return channel
}

// 구독 해제
export const unsubscribeFromRooms = async (channel: RealtimeChannel): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase || !channel) return

  await supabase.removeChannel(channel)
}
