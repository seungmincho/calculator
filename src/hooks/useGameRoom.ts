'use client'

import { useState, useEffect, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import {
  GameRoom,
  GameType,
  getRooms,
  getRoomStats,
  RoomStats,
  getMonthlyStats,
  MonthlyStats,
  createRoom as createRoomApi,
  closeRoom as closeRoomApi,
  tryJoinRoom,
  subscribeToRooms,
  unsubscribeFromRooms,
  generatePlayerId,
  isSupabaseConfigured
} from '@/utils/webrtc'

interface UseGameRoomReturn {
  rooms: GameRoom[]
  stats: RoomStats
  monthlyStats: MonthlyStats[]
  isLoading: boolean
  error: string | null
  playerId: string
  isConfigured: boolean
  createRoom: (hostName: string, peerId?: string, isPrivate?: boolean) => Promise<GameRoom | null>
  joinRoom: (roomId: string) => Promise<boolean>
  leaveRoom: (roomId: string) => Promise<boolean>
  refreshRooms: () => Promise<void>
}

export const useGameRoom = (gameType: GameType): UseGameRoomReturn => {
  const [rooms, setRooms] = useState<GameRoom[]>([])
  const [stats, setStats] = useState<RoomStats>({ total: 0, public: 0, private: 0, waiting: 0, playing: 0 })
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  // 플레이어 ID 초기화 (localStorage에서 복원 또는 새로 생성)
  useEffect(() => {
    const storageKey = `game_player_id_${gameType}`
    let storedId = localStorage.getItem(storageKey)

    if (!storedId) {
      storedId = generatePlayerId()
      localStorage.setItem(storageKey, storedId)
    }

    setPlayerId(storedId)
    setIsConfigured(isSupabaseConfigured())
  }, [gameType])

  // 방 목록 및 통계 조회
  const refreshRooms = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [roomList, roomStats, monthly] = await Promise.all([
        getRooms(gameType),
        getRoomStats(gameType),
        getMonthlyStats(gameType, 6)
      ])
      setRooms(roomList)
      setStats(roomStats)
      setMonthlyStats(monthly)
    } catch (err) {
      setError('방 목록을 불러오는데 실패했습니다.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [gameType])

  // 실시간 구독 설정
  useEffect(() => {
    if (!playerId || !isSupabaseConfigured()) return

    refreshRooms()

    const newChannel = subscribeToRooms(
      gameType,
      // INSERT
      (room) => {
        setRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev
          return [room, ...prev]
        })
      },
      // UPDATE
      (room) => {
        setRooms((prev) => {
          // waiting 상태가 아닌 방은 목록에서 제거
          if (room.status !== 'waiting') {
            return prev.filter((r) => r.id !== room.id)
          }
          return prev.map((r) => (r.id === room.id ? room : r))
        })
      },
      // DELETE
      (roomId) => {
        setRooms((prev) => prev.filter((r) => r.id !== roomId))
      }
    )

    setChannel(newChannel)

    return () => {
      if (newChannel) {
        unsubscribeFromRooms(newChannel)
      }
    }
  }, [gameType, playerId, refreshRooms])

  // 방 생성 (peerId가 있으면 host_id에 peerId 저장)
  const createRoom = useCallback(
    async (hostName: string, peerId?: string, isPrivate?: boolean): Promise<GameRoom | null> => {
      if (!playerId) return null

      setError(null)

      try {
        const room = await createRoomApi({
          hostName,
          hostId: peerId || playerId, // PeerJS의 peerId를 저장
          gameType,
          isPrivate: isPrivate ?? false
        })

        return room
      } catch (err) {
        setError('방 생성에 실패했습니다.')
        console.error(err)
        return null
      }
    },
    [playerId, gameType]
  )

  // 방 입장 (waiting 상태일 때만 playing으로 변경 - 동시 입장 방지)
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      const success = await tryJoinRoom(roomId)
      if (!success) {
        setError('이미 다른 플레이어가 입장했습니다.')
      }
      return success
    } catch (err) {
      setError('방 입장에 실패했습니다.')
      console.error(err)
      return false
    }
  }, [])

  // 방 나가기 (방 닫기 - 삭제 대신 closed 상태로 변경)
  const leaveRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      return await closeRoomApi(roomId)
    } catch (err) {
      setError('방 나가기에 실패했습니다.')
      console.error(err)
      return false
    }
  }, [])

  return {
    rooms,
    stats,
    monthlyStats,
    isLoading,
    error,
    playerId,
    isConfigured,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms
  }
}
