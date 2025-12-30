'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, Flag, Users, Copy, Check, Send, MessageCircle, AlertCircle, X } from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom, OmokGameState, OmokMove, sendRoomHeartbeat, incrementGamesPlayed, getRoom } from '@/utils/webrtc'
import { PeerMessage } from '@/utils/webrtc/peerManager'
import GameLobby from './GameLobby'
import OmokBoard from './OmokBoard'
import { createInitialGameState, checkWinner, checkForbiddenMove } from '@/utils/gameRules/omokRules'

type GamePhase = 'lobby' | 'waiting' | 'playing' | 'finished'

interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
  isMe: boolean
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
}

interface OmokProps {
  initialRoom?: GameRoom
  isHost?: boolean
  hostPeerId?: string
  onBack?: () => void
}

export default function Omok({ initialRoom, isHost: isHostProp, onBack }: OmokProps) {
  const t = useTranslations('omok')

  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [myColor, setMyColor] = useState<'black' | 'white' | null>(null)
  const [opponentName, setOpponentName] = useState<string>('')
  const [gameState, setGameState] = useState<OmokGameState>(createInitialGameState())
  const [playerName, setPlayerName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [winCount, setWinCount] = useState<{ black: number; white: number }>({ black: 0, white: 0 })
  const isHostRef = useRef(false)
  const gameCountedRef = useRef(false)  // 게임 시작 시 중복 카운트 방지
  const wasConnectedRef = useRef(false)  // 실제로 연결된 적이 있는지 추적

  // 채팅 관련 상태
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(true)  // 기본값: 열림
  const [unreadCount, setUnreadCount] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 토스트 알림 상태
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // 토스트 표시 함수
  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    // 2초 후 자동 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2000)
  }, [])

  // 토스트 수동 제거
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Supabase - 방 목록만 관리
  const {
    rooms,
    stats,
    monthlyStats,
    isLoading,
    error: roomError,
    isConfigured,
    createRoom: createSupabaseRoom,
    joinRoom: joinSupabaseRoom,
    leaveRoom: leaveSupabaseRoom,
    refreshRooms
  } = useGameRoom('omok')

  // PeerJS - 실시간 게임 통신
  const {
    isConnected,
    peerId,
    error: peerError,
    createRoom: createPeerRoom,
    joinRoom: joinPeerRoom,
    sendMessage,
    disconnect: disconnectPeer,
    lastMessage,
    onDisconnect
  } = usePeerConnection()

  // 플레이어 이름 로드
  useEffect(() => {
    const stored = localStorage.getItem('omok_player_name')
    if (stored) setPlayerName(stored)
  }, [])

  // initialRoom이 있으면 자동으로 방에 접속 (GameHub에서 온 경우)
  const [isCreatingPeer, setIsCreatingPeer] = useState(false)
  const initialRoomIdRef = useRef<string | null>(null)
  const setupInProgressRef = useRef(false)

  // 함수들을 ref로 저장하여 deps 문제 방지
  const createPeerRoomRef = useRef(createPeerRoom)
  const joinPeerRoomRef = useRef(joinPeerRoom)
  const leaveSupabaseRoomRef = useRef(leaveSupabaseRoom)
  const showToastRef = useRef(showToast)
  const onBackRef = useRef(onBack)

  useEffect(() => {
    createPeerRoomRef.current = createPeerRoom
    joinPeerRoomRef.current = joinPeerRoom
    leaveSupabaseRoomRef.current = leaveSupabaseRoom
    showToastRef.current = showToast
    onBackRef.current = onBack
  })

  useEffect(() => {
    // 이미 처리한 방이면 스킵
    if (!initialRoom || initialRoomIdRef.current === initialRoom.id) {
      return
    }

    // 이미 설정 중이면 스킵 (React Strict Mode 대응)
    if (setupInProgressRef.current) {
      console.log('[Omok] Setup already in progress, skipping...')
      return
    }

    console.log('[Omok] Processing initialRoom:', initialRoom.id, 'isHost:', isHostProp)
    initialRoomIdRef.current = initialRoom.id
    setupInProgressRef.current = true

    // 방 생성한 호스트인 경우
    // GameHub에서 이미 PeerJS 연결을 생성하고 실제 PeerID로 Supabase에 등록함
    // 여기서는 기존 연결을 재사용하기만 하면 됨
    if (isHostProp) {
      console.log('[Omok] Setting up as host (PeerJS already created by GameHub)')
      setCurrentRoom(initialRoom)
      setPlayerName(initialRoom.host_name)
      setOpponentName('')
      isHostRef.current = true
      setMyColor('black')
      setChatMessages([])
      setWinCount({ black: 0, white: 0 })
      setGamePhase('waiting')
      setIsCreatingPeer(false)  // GameHub에서 이미 생성됨
      setupInProgressRef.current = false

      // GameHub에서 이미 PeerJS를 생성했으므로, usePeerConnection hook이
      // 전역 PeerManager를 재사용하여 자동으로 콜백을 등록함
      // 추가로 PeerJS 연결을 생성할 필요 없음
      return
    }

    // 게스트로 방 입장
    console.log('[Omok] Setting up as guest')
    const joinInitialRoom = async () => {
      // 다른 사람 방에 입장
      // GameHub에서 넘어온 경우 gameNickname 사용, 아니면 omok_player_name 사용
      const gameNickname = localStorage.getItem('gameNickname')
      const omokNickname = localStorage.getItem('omok_player_name')
      const name = gameNickname || omokNickname || t('guest')
      setPlayerName(name)
      if (!omokNickname) localStorage.setItem('omok_player_name', name)
      isHostRef.current = false
      setOpponentName(initialRoom.host_name)

      setCurrentRoom(initialRoom)
      setChatMessages([])
      setWinCount({ black: 0, white: 0 })
      setGamePhase('waiting')

      // PeerJS로 호스트에 연결
      // GameHub에서 실제 PeerID로 방이 생성되므로 pending_ 체크 불필요
      // 하위 호환성을 위해 pending_ 체크는 유지하되, 빠르게 실패 처리
      let hostId = initialRoom.host_id
      console.log('[Omok] Host ID:', hostId)

      if (hostId.startsWith('pending_')) {
        // 이 경우는 이전 버전 호환성을 위해 남겨둠 (드물게 발생)
        console.log('[Omok] Host ID is pending (legacy), polling for real ID...')
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const updatedRoom = await getRoom(initialRoom.id)
          if (updatedRoom && !updatedRoom.host_id.startsWith('pending_')) {
            hostId = updatedRoom.host_id
            break
          }
        }

        if (hostId.startsWith('pending_')) {
          console.log('[Omok] Host ID still pending')
          await leaveSupabaseRoomRef.current(initialRoom.id)
          setGamePhase('lobby')
          showToastRef.current(t('connectionFailed') || '호스트에 연결할 수 없습니다.', 'error')
          setupInProgressRef.current = false
          if (onBackRef.current) onBackRef.current()
          return
        }
      }

      console.log('[Omok] Connecting to host:', hostId)
      const success = await joinPeerRoomRef.current(hostId)
      console.log('[Omok] Join result:', success)
      setupInProgressRef.current = false
      if (!success) {
        await leaveSupabaseRoomRef.current(initialRoom.id)
        setGamePhase('lobby')
        showToastRef.current(t('connectionFailed') || '호스트에 연결할 수 없습니다.', 'error')
        if (onBackRef.current) onBackRef.current()
      }
    }
    joinInitialRoom()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom, isHostProp, t])

  // 채팅 스크롤 - 채팅창 내부에서만 스크롤
  useEffect(() => {
    if (showChat && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, showChat])

  // 채팅 창 열면 읽음 처리
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0)
    }
  }, [showChat])

  // 연결 상태 추적 - 실제로 연결된 적이 있는지 확인
  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true
    }
  }, [isConnected])

  // PeerJS 연결 성공 시 게임 시작
  useEffect(() => {
    if (isConnected && gamePhase === 'waiting') {
      console.log('[Omok] Connected! Starting game...')

      if (isHostRef.current) {
        // 호스트는 흑돌
        setMyColor('black')
        sendMessage('ready', { playerName, color: 'black' })

        // 게임 시작 시 게임판수 증가 (호스트만, 중복 방지)
        if (currentRoom && !gameCountedRef.current) {
          gameCountedRef.current = true
          incrementGamesPlayed(currentRoom.id)
        }
      } else {
        // 게스트는 백돌
        setMyColor('white')
        sendMessage('ready', { playerName, color: 'white' })
      }

      setGamePhase('playing')
    }
  }, [isConnected, gamePhase, playerName, sendMessage, currentRoom])

  // 메시지 처리
  useEffect(() => {
    if (!lastMessage) return

    const { type, payload } = lastMessage as PeerMessage

    console.log('[Omok] Message received:', type, payload)

    switch (type) {
      case 'ready':
        const readyData = payload as { playerName: string; color: string }
        setOpponentName(readyData.playerName)
        break

      case 'move':
        const move = payload as OmokMove
        setGameState(prev => {
          const newBoard = prev.board.map(row => [...row])
          newBoard[move.y][move.x] = move.player

          const winner = checkWinner(newBoard, move)

          return {
            ...prev,
            board: newBoard,
            currentTurn: move.player === 'black' ? 'white' : 'black',
            moveHistory: [...prev.moveHistory, move],
            lastMove: move,
            winner
          }
        })
        break

      case 'restart':
        setGameState(createInitialGameState())
        setGamePhase('playing')
        // 게스트 입장에서 새 게임 시작 (호스트가 restart 메시지 보냈을 때)
        // 호스트가 이미 카운트했으므로 게스트는 카운트하지 않음
        break

      case 'surrender':
        setGameState(prev => ({
          ...prev,
          winner: myColor || 'black'
        }))
        setGamePhase('finished')
        break

      case 'leave':
        handleBackToLobby()
        break

      case 'chat':
        const chatData = payload as { sender: string; content: string }
        setChatMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: chatData.sender,
          content: chatData.content,
          timestamp: Date.now(),
          isMe: false
        }])
        // 채팅창이 닫혀있으면 읽지 않은 메시지 카운트 증가
        if (!showChat) {
          setUnreadCount(prev => prev + 1)
        }
        break
    }
  }, [lastMessage, myColor, showChat])

  // 게임 상태에서 승자 확인
  useEffect(() => {
    if (gameState.winner && gamePhase === 'playing') {
      setGamePhase('finished')
      // 승리 카운트 업데이트
      if (gameState.winner === 'black' || gameState.winner === 'white') {
        setWinCount(prev => ({
          ...prev,
          [gameState.winner as 'black' | 'white']: prev[gameState.winner as 'black' | 'white'] + 1
        }))
      }
    }
  }, [gameState.winner, gamePhase])

  // 방 heartbeat (5분마다 updated_at 갱신 - 비활성 방 정리용)
  useEffect(() => {
    if (!currentRoom || gamePhase === 'lobby') return

    // 즉시 한 번 전송
    sendRoomHeartbeat(currentRoom.id)

    // 5분마다 heartbeat 전송
    const interval = setInterval(() => {
      sendRoomHeartbeat(currentRoom.id)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [currentRoom, gamePhase])

  // 방 생성 핸들러 (호스트)
  const handleCreateRoom = async (hostName: string, isPrivate: boolean) => {
    setPlayerName(hostName)
    localStorage.setItem('omok_player_name', hostName)
    isHostRef.current = true

    // 1. PeerJS 피어 생성
    const newPeerId = await createPeerRoom()
    if (!newPeerId) return null

    // 2. Supabase에 방 등록 (host_id에 peerId 저장, 공개/비공개 설정)
    const room = await createSupabaseRoom(hostName, newPeerId, isPrivate)
    if (!room) {
      disconnectPeer()
      return null
    }

    // 3. 호스트는 바로 대기 화면으로 이동
    setCurrentRoom(room)
    setOpponentName('')
    setChatMessages([])
    setWinCount({ black: 0, white: 0 })
    setGamePhase('waiting')

    return room
  }

  // 방 입장 핸들러 (게스트)
  const handleJoinRoom = async (room: GameRoom) => {
    // 자신이 만든 방이면 대기 화면으로 (peerId로 비교)
    if (room.host_id === peerId) {
      setCurrentRoom(room)
      setPlayerName(room.host_name)
      setOpponentName('')
      setGamePhase('waiting')
      return
    }

    // 다른 사람 방에 입장
    const name = playerName || prompt(t('enterYourName')) || t('guest')
    setPlayerName(name)
    localStorage.setItem('omok_player_name', name)
    isHostRef.current = false
    setOpponentName(room.host_name)

    // 먼저 Supabase에서 방 상태를 playing으로 변경 (동시 입장 방지)
    const joined = await joinSupabaseRoom(room.id)
    if (!joined) {
      showToast(t('roomAlreadyFull') || '이미 다른 플레이어가 입장했습니다.', 'error')
      return
    }

    setCurrentRoom(room)
    setChatMessages([])
    setWinCount({ black: 0, white: 0 })
    setGamePhase('waiting')

    // PeerJS로 호스트에 연결 (room.host_id가 peerId)
    const success = await joinPeerRoom(room.host_id)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
      return
    }
  }

  // Get forbidden move message
  const getForbiddenMessage = (reason: string): string => {
    switch (reason) {
      case 'double-three':
        return t('doubleThreeForbidden') || '쌍삼(3-3)은 금수입니다!'
      case 'double-four':
        return t('doubleFourForbidden') || '쌍사(4-4)는 금수입니다!'
      case 'overline':
        return t('overlineForbidden') || '장목(6목 이상)은 금수입니다!'
      default:
        return t('forbiddenMove') || '금수입니다!'
    }
  }

  // 착수 핸들러
  const handleMove = useCallback((x: number, y: number) => {
    if (!myColor || gameState.currentTurn !== myColor || gameState.winner) return

    // 금수 체크 (렌주 룰 - 흑돌만 적용)
    if (myColor === 'black') {
      const forbidden = checkForbiddenMove(gameState.board, x, y, myColor)
      if (forbidden.forbidden && forbidden.reason) {
        showToast(getForbiddenMessage(forbidden.reason), 'warning')
        return
      }
    }

    const move: OmokMove = {
      x,
      y,
      player: myColor,
      moveNumber: gameState.moveHistory.length + 1
    }

    // 로컬 상태 업데이트
    setGameState(prev => {
      const newBoard = prev.board.map(row => [...row])
      newBoard[y][x] = myColor

      const winner = checkWinner(newBoard, move)

      return {
        ...prev,
        board: newBoard,
        currentTurn: myColor === 'black' ? 'white' : 'black',
        moveHistory: [...prev.moveHistory, move],
        lastMove: move,
        winner
      }
    })

    // 상대방에게 전송 (PeerJS)
    sendMessage('move', move)
  }, [myColor, gameState, sendMessage, t, showToast])

  // 재시작 (새 게임)
  const handleRestart = () => {
    setGameState(createInitialGameState())
    setGamePhase('playing')
    sendMessage('restart', {})

    // 호스트만 게임판수 증가 (새 게임 시작 기준)
    if (currentRoom && isHostRef.current) {
      incrementGamesPlayed(currentRoom.id)
    }
  }

  // 기권
  const handleSurrender = () => {
    if (!confirm(t('confirmSurrender'))) return

    setGameState(prev => ({
      ...prev,
      winner: myColor === 'black' ? 'white' : 'black'
    }))
    setGamePhase('finished')
    sendMessage('surrender', {})
  }

  // 로비로 돌아가기
  const handleBackToLobby = useCallback(async () => {
    sendMessage('leave', {})

    if (currentRoom) {
      await leaveSupabaseRoom(currentRoom.id)
    }

    disconnectPeer()

    setCurrentRoom(null)
    setMyColor(null)
    setOpponentName('')
    setGameState(createInitialGameState())
    setChatMessages([])
    setUnreadCount(0)
    setShowChat(false)
    setWinCount({ black: 0, white: 0 })
    setGamePhase('lobby')
    isHostRef.current = false
    gameCountedRef.current = false
    wasConnectedRef.current = false
  }, [currentRoom, leaveSupabaseRoom, disconnectPeer, sendMessage])

  // 상대방 연결 끊김 처리 - 실제로 연결된 적이 있을 때만 반응
  useEffect(() => {
    if (onDisconnect) {
      onDisconnect(() => {
        console.log('[Omok] Disconnect callback called, wasConnected:', wasConnectedRef.current)
        // 실제로 연결된 적이 있고, 게임 중이거나 끝났을 때만 로비로 이동
        if (wasConnectedRef.current && (gamePhase === 'playing' || gamePhase === 'finished')) {
          showToast(t('opponentDisconnected') || 'Opponent has disconnected', 'error')
          handleBackToLobby()
        }
      })
    }
  }, [onDisconnect, gamePhase, t, showToast, handleBackToLobby])

  // Peer ID 복사
  const handleCopyPeerId = async () => {
    if (peerId) {
      await navigator.clipboard.writeText(peerId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 직접 Peer ID로 입장
  const handleDirectJoin = async () => {
    const hostPeerId = prompt(t('enterPeerId') || 'Enter host Peer ID:')
    if (!hostPeerId) return

    const name = playerName || prompt(t('enterYourName')) || t('guest')
    setPlayerName(name)
    localStorage.setItem('omok_player_name', name)
    isHostRef.current = false

    setChatMessages([])
    setGamePhase('waiting')

    const success = await joinPeerRoom(hostPeerId)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
    }
  }

  // 채팅 전송
  const handleSendChat = () => {
    if (!chatInput.trim() || !isConnected) return

    const content = chatInput.trim()

    // 로컬에 추가
    setChatMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: playerName,
      content,
      timestamp: Date.now(),
      isMe: true
    }])

    // 상대방에게 전송
    sendMessage('chat', { sender: playerName, content })

    setChatInput('')
  }

  // 로비 화면
  if (gamePhase === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <GameLobby
          rooms={rooms}
          stats={stats}
          monthlyStats={monthlyStats}
          isLoading={isLoading}
          error={roomError || peerError}
          isConfigured={isConfigured}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onRefresh={refreshRooms}
          gameTitle={t('title')}
          gameDescription={t('description')}
        />

        {/* 직접 입장 옵션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('directConnect') || 'Direct Connect'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('directConnectDesc') || 'Enter the Peer ID shared by the host to join directly.'}
          </p>
          <button
            onClick={handleDirectJoin}
            className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
          >
            {t('enterPeerIdButton') || 'Enter Peer ID to Join'}
          </button>
        </div>
      </div>
    )
  }

  // 대기 화면 (호스트)
  if (gamePhase === 'waiting' && isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-pulse mb-6">
            <Users className="w-16 h-16 mx-auto text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('waitingForOpponent')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('sharePeerId') || 'Share this Peer ID with your opponent:'}
          </p>

          {/* Peer ID 표시 및 복사 */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Peer ID</p>
            <div className="flex items-center justify-center gap-2">
              {isCreatingPeer ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('creatingConnection') || 'Creating connection...'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-mono text-lg text-gray-900 dark:text-white break-all">
                    {peerId || 'Loading...'}
                  </p>
                  <button
                    onClick={handleCopyPeerId}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                    title="Copy"
                    disabled={!peerId}
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
          >
            {t('cancelAndBack')}
          </button>
        </div>
      </div>
    )
  }

  // 대기 화면 (게스트 - 연결 중)
  if (gamePhase === 'waiting' && !isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-spin mb-6">
            <RefreshCw className="w-16 h-16 mx-auto text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('connecting') || 'Connecting...'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('connectingDesc') || 'Establishing connection with the host...'}
          </p>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
          >
            {t('cancelAndBack')}
          </button>
        </div>
      </div>
    )
  }

  // 게임 화면
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-4 items-start">
        {/* 왼쪽: 게임 영역 */}
        <div className="flex-1 space-y-4">
          {/* 상단 바 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLobby}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('backToLobby')}
            </button>

            <div className="flex items-center gap-2">
              {/* 채팅 토글 */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`relative p-2 rounded-lg transition-all ${
                  showChat
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {gamePhase === 'playing' && (
                <button
                  onClick={handleSurrender}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                >
                  <Flag className="w-5 h-5" />
                  {t('surrender')}
                </button>
              )}
            </div>
          </div>

          {/* 플레이어 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              {/* 흑돌 플레이어 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'black' && !gameState.winner
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-600 shadow-md flex items-center justify-center">
                  <span className="text-white font-bold">{winCount.black}</span>
                </div>
                <div>
                  <p className={`font-medium ${
                    gameState.currentTurn === 'black' && !gameState.winner
                      ? 'text-white'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {myColor === 'black' ? playerName : opponentName}
                  </p>
                  <p className={`text-xs ${
                    gameState.currentTurn === 'black' && !gameState.winner
                      ? 'text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {myColor === 'black' ? t('you') : t('opponent')}
                  </p>
                </div>
              </div>

              {/* VS 및 전적 */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {winCount.black} : {winCount.white}
                </div>
              </div>

              {/* 백돌 플레이어 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'white' && !gameState.winner
                  ? 'bg-white border-2 border-gray-300 shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 shadow-md flex items-center justify-center">
                  <span className="text-gray-900 font-bold">{winCount.white}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {myColor === 'white' ? playerName : opponentName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {myColor === 'white' ? t('you') : t('opponent')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 턴 표시 */}
          {!gameState.winner && (
            <div className={`text-center py-2 px-4 rounded-xl ${
              gameState.currentTurn === myColor
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {gameState.currentTurn === myColor ? t('yourTurn') : t('opponentTurn')}
            </div>
          )}

          {/* 승리 메시지 */}
          {gameState.winner && (
            <div className={`text-center py-4 px-6 rounded-2xl ${
              gameState.winner === myColor
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xl font-bold">
                {gameState.winner === myColor ? t('youWin') : t('youLose')}
              </p>
              <p className="text-sm opacity-80">
                {gameState.winner === 'black' ? t('blackWins') : t('whiteWins')}
              </p>
            </div>
          )}

          {/* 오목판 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <OmokBoard
              gameState={gameState}
              myColor={myColor}
              isMyTurn={gameState.currentTurn === myColor}
              onMove={handleMove}
              disabled={!!gameState.winner}
            />
          </div>

          {/* 수순 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('moves')}: {gameState.moveHistory.length}</span>
              {gameState.lastMove && (
                <span>
                  {t('lastMove')}: {String.fromCharCode(65 + gameState.lastMove.x)}{19 - gameState.lastMove.y}
                </span>
              )}
            </div>
          </div>

          {/* 게임 종료 후 버튼 */}
          {gamePhase === 'finished' && (
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                {t('playAgain')}
              </button>
              <button
                onClick={handleBackToLobby}
                className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
              >
                {t('backToLobby')}
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 채팅 영역 */}
        {showChat && (
          <div className="w-80 flex-shrink-0 sticky top-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg h-[500px] flex flex-col">
              {/* 채팅 헤더 */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {t('chat') || 'Chat'}
                </h3>
              </div>

              {/* 채팅 메시지 목록 */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {chatMessages.length === 0 ? (
                  <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                    {t('noChatMessages') || 'No messages yet'}
                  </p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${
                        msg.isMe
                          ? 'ml-auto bg-indigo-500 text-white'
                          : 'mr-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      } rounded-xl px-3 py-2 max-w-[80%]`}
                    >
                      <p className={`text-xs mb-1 ${
                        msg.isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {msg.sender}
                      </p>
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* 채팅 입력 */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendChat()
                      }
                    }}
                    placeholder={t('typeMessage') || 'Type a message...'}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !isConnected}
                    className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 토스트 알림 */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-200 ${
                toast.type === 'error'
                  ? 'bg-red-500 text-white'
                  : toast.type === 'warning'
                  ? 'bg-amber-500 text-white'
                  : toast.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
