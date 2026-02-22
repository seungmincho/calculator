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

// 전역 PeerManager 저장소 (React Strict Mode 대응)
const globalPeerManager: {
  instance: PeerManager | null
  peerId: string
  isHost: boolean
} = {
  instance: null,
  peerId: '',
  isHost: false
}

export const usePeerConnection = (): UsePeerConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [isHost, setIsHost] = useState(globalPeerManager.isHost)
  const [peerId, setPeerId] = useState(globalPeerManager.peerId)
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<PeerMessage | null>(null)
  const onDisconnectCallbackRef = useRef<(() => void) | null>(null)
  const isMountedRef = useRef(true)

  // 콜백 설정
  const setupCallbacks = useCallback((manager: PeerManager) => {
    manager.onMessage((message) => {
      if (isMountedRef.current) {
        setLastMessage(message)
      }
    })

    manager.onConnected(() => {
      if (isMountedRef.current) {
        setIsConnected(true)
        setError(null)
      }
    })

    manager.onDisconnected(() => {
      if (isMountedRef.current) {
        setIsConnected(false)
        // 외부 콜백 호출
        if (onDisconnectCallbackRef.current) {
          onDisconnectCallbackRef.current()
        }
      }
    })
  }, [])

  // 방 생성 (호스트)
  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      setError(null)

      // 이미 전역 PeerManager가 있고 peerId가 있으면 재사용
      if (globalPeerManager.instance && globalPeerManager.peerId) {
        setPeerId(globalPeerManager.peerId)
        setIsHost(globalPeerManager.isHost)
        setupCallbacks(globalPeerManager.instance)
        return globalPeerManager.peerId
      }

      // 기존 매니저가 있으면 정리
      if (globalPeerManager.instance) {
        globalPeerManager.instance.disconnect()
        globalPeerManager.instance = null
        globalPeerManager.peerId = ''
        globalPeerManager.isHost = false
      }

      const manager = new PeerManager()
      globalPeerManager.instance = manager
      setupCallbacks(manager)

      const id = await manager.createPeer()
      globalPeerManager.peerId = id
      globalPeerManager.isHost = true

      if (isMountedRef.current) {
        setPeerId(id)
        setIsHost(true)
      }
      return id
    } catch (err) {
      console.error('[usePeerConnection] Create room error:', err)
      if (isMountedRef.current) {
        setError('방 생성에 실패했습니다.')
      }
      return null
    }
  }, [setupCallbacks])

  // 방 입장 (게스트)
  const joinRoom = useCallback(async (hostPeerId: string): Promise<boolean> => {
    try {
      setError(null)

      // 기존 매니저가 있으면 정리
      if (globalPeerManager.instance) {
        globalPeerManager.instance.disconnect()
        globalPeerManager.instance = null
        globalPeerManager.peerId = ''
        globalPeerManager.isHost = false
      }

      const manager = new PeerManager()
      globalPeerManager.instance = manager
      setupCallbacks(manager)

      await manager.connectToPeer(hostPeerId)
      const myPeerId = manager.getPeerId()
      globalPeerManager.peerId = myPeerId
      globalPeerManager.isHost = false

      if (isMountedRef.current) {
        setPeerId(myPeerId)
        setIsHost(false)
      }
      return true
    } catch (err) {
      console.error('[usePeerConnection] Join room error:', err)
      if (isMountedRef.current) {
        setError('방 입장에 실패했습니다. 방이 존재하지 않거나 연결할 수 없습니다.')
      }
      return false
    }
  }, [setupCallbacks])

  // 메시지 전송
  const sendMessage = useCallback((type: MessageType, payload: unknown): boolean => {
    if (!globalPeerManager.instance) {
      console.error('[usePeerConnection] No peer manager')
      return false
    }
    return globalPeerManager.instance.sendMessage(type, payload)
  }, [])

  // 연결 해제
  const disconnect = useCallback(() => {
    if (globalPeerManager.instance) {
      globalPeerManager.instance.disconnect()
      globalPeerManager.instance = null
      globalPeerManager.peerId = ''
      globalPeerManager.isHost = false
    }
    if (isMountedRef.current) {
      setIsConnected(false)
      setIsHost(false)
      setPeerId('')
      setLastMessage(null)
    }
  }, [])

  // 외부 연결 끊김 콜백 설정
  const onDisconnect = useCallback((callback: () => void) => {
    onDisconnectCallbackRef.current = callback
  }, [])

  // 마운트/언마운트 추적 - 전역 매니저는 정리하지 않음
  useEffect(() => {
    isMountedRef.current = true

    // 기존 전역 매니저가 있으면 상태 동기화
    if (globalPeerManager.instance && globalPeerManager.peerId) {
      setPeerId(globalPeerManager.peerId)
      setIsHost(globalPeerManager.isHost)
      setupCallbacks(globalPeerManager.instance)
    }

    return () => {
      isMountedRef.current = false
      onDisconnectCallbackRef.current = null
      // 전역 매니저는 유지 - 다른 컴포넌트에서 재사용할 수 있음
    }
  }, [setupCallbacks])

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
