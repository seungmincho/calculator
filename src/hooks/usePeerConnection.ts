'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PeerManager, PeerMessage, MessageType } from '@/utils/webrtc'

interface UsePeerConnectionReturn {
  isConnected: boolean
  isHost: boolean
  peerId: string
  error: string | null
  createRoom: () => Promise<string | null>
  joinRoom: (hostPeerId: string) => Promise<boolean>
  sendMessage: (type: MessageType, payload: unknown) => boolean
  disconnect: () => void
  lastMessage: PeerMessage | null
  onDisconnect: (callback: () => void) => void
}

export const usePeerConnection = (): UsePeerConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [peerId, setPeerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<PeerMessage | null>(null)
  const peerManagerRef = useRef<PeerManager | null>(null)
  const onDisconnectCallbackRef = useRef<(() => void) | null>(null)

  // 콜백 설정
  const setupCallbacks = useCallback((manager: PeerManager) => {
    manager.onMessage((message) => {
      console.log('[usePeerConnection] Message received:', message)
      setLastMessage(message)
    })

    manager.onConnected(() => {
      console.log('[usePeerConnection] Connected')
      setIsConnected(true)
      setError(null)
    })

    manager.onDisconnected(() => {
      console.log('[usePeerConnection] Disconnected')
      setIsConnected(false)
      // 외부 콜백 호출
      if (onDisconnectCallbackRef.current) {
        onDisconnectCallbackRef.current()
      }
    })
  }, [])

  // 방 생성 (호스트)
  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      setError(null)
      const manager = new PeerManager()
      peerManagerRef.current = manager
      setupCallbacks(manager)

      const id = await manager.createPeer()
      setPeerId(id)
      setIsHost(true)
      console.log('[usePeerConnection] Room created with peer ID:', id)
      return id
    } catch (err) {
      console.error('[usePeerConnection] Create room error:', err)
      setError('방 생성에 실패했습니다.')
      return null
    }
  }, [setupCallbacks])

  // 방 입장 (게스트)
  const joinRoom = useCallback(async (hostPeerId: string): Promise<boolean> => {
    try {
      setError(null)
      const manager = new PeerManager()
      peerManagerRef.current = manager
      setupCallbacks(manager)

      await manager.connectToPeer(hostPeerId)
      setPeerId(manager.getPeerId())
      setIsHost(false)
      console.log('[usePeerConnection] Joined room')
      return true
    } catch (err) {
      console.error('[usePeerConnection] Join room error:', err)
      setError('방 입장에 실패했습니다. 방이 존재하지 않거나 연결할 수 없습니다.')
      return false
    }
  }, [setupCallbacks])

  // 메시지 전송
  const sendMessage = useCallback((type: MessageType, payload: unknown): boolean => {
    if (!peerManagerRef.current) {
      console.error('[usePeerConnection] No peer manager')
      return false
    }
    return peerManagerRef.current.sendMessage(type, payload)
  }, [])

  // 연결 해제
  const disconnect = useCallback(() => {
    if (peerManagerRef.current) {
      peerManagerRef.current.disconnect()
      peerManagerRef.current = null
    }
    setIsConnected(false)
    setIsHost(false)
    setPeerId('')
    setLastMessage(null)
  }, [])

  // 외부 연결 끊김 콜백 설정
  const onDisconnect = useCallback((callback: () => void) => {
    onDisconnectCallbackRef.current = callback
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.disconnect()
      }
    }
  }, [])

  return {
    isConnected,
    isHost,
    peerId,
    error,
    createRoom,
    joinRoom,
    sendMessage,
    disconnect,
    lastMessage,
    onDisconnect
  }
}
