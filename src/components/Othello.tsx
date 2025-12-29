'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, Flag, Users, Copy, Check, Send, MessageCircle, AlertCircle, X } from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom, sendRoomHeartbeat, incrementGamesPlayed, updateRoomHostId } from '@/utils/webrtc'
import { PeerMessage } from '@/utils/webrtc/peerManager'
import GameLobby from './GameLobby'
import OthelloBoard, {
  OthelloGameState,
  OthelloMove,
  createInitialOthelloState,
  makeMove,
  getValidMoves
} from './OthelloBoard'

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

interface OthelloProps {
  initialRoom?: GameRoom
  isHost?: boolean
  hostPeerId?: string
  onBack?: () => void
}

export default function Othello({ initialRoom, isHost: isHostProp, hostPeerId, onBack }: OthelloProps) {
  const t = useTranslations('othello')
  const tCommon = useTranslations('common')

  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [myColor, setMyColor] = useState<'black' | 'white' | null>(null)
  const [opponentName, setOpponentName] = useState<string>('')
  const [gameState, setGameState] = useState<OthelloGameState>(createInitialOthelloState())
  const [playerName, setPlayerName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [winCount, setWinCount] = useState<{ black: number; white: number }>({ black: 0, white: 0 })
  const isHostRef = useRef(false)
  const gameCountedRef = useRef(false)  // 게임 시작 시 중복 카운트 방지

  // 채팅 관련 상태
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 토스트 알림 상태
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // 토스트 표시 함수
  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
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
  } = useGameRoom('othello')

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
    const stored = localStorage.getItem('othello_player_name')
    if (stored) setPlayerName(stored)
  }, [])

  // initialRoom이 있으면 자동으로 방에 접속 (GameHub에서 온 경우)
  const initialRoomProcessed = useRef(false)
  useEffect(() => {
    if (initialRoom && !initialRoomProcessed.current) {
      initialRoomProcessed.current = true

      // 방 생성한 호스트인 경우 - GameHub에서 이미 PeerJS 방 생성됨
      if (isHostProp && hostPeerId) {
        setCurrentRoom(initialRoom)
        setPlayerName(initialRoom.host_name)
        setOpponentName('')
        isHostRef.current = true
        setMyColor('black')
        setChatMessages([])
        setWinCount({ black: 0, white: 0 })
        setGamePhase('waiting')
        return
      }

      // 게스트로 방 입장 - 바로 실행
      const joinInitialRoom = async () => {
        const stored = localStorage.getItem('othello_player_name')
        const name = stored || t('guest')
        setPlayerName(name)
        if (!stored) localStorage.setItem('othello_player_name', name)
        isHostRef.current = false
        setOpponentName(initialRoom.host_name)

        // Supabase에서 방 상태 변경
        const joined = await joinSupabaseRoom(initialRoom.id)
        if (!joined) {
          showToast(t('roomAlreadyFull') || 'Room is already full', 'error')
          if (onBack) onBack()
          return
        }

        setCurrentRoom(initialRoom)
        setChatMessages([])
        setWinCount({ black: 0, white: 0 })
        setGamePhase('waiting')

        // PeerJS로 호스트에 연결
        const success = await joinPeerRoom(initialRoom.host_id)
        if (!success) {
          // 연결 실패 시 Supabase 방 상태 복구
          await leaveSupabaseRoom(initialRoom.id)
          setGamePhase('lobby')
          showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
          if (onBack) onBack()
        }
      }
      joinInitialRoom()
    }
  }, [initialRoom, isHostProp, hostPeerId, joinSupabaseRoom, joinPeerRoom, leaveSupabaseRoom, showToast, t, onBack])

  // 채팅 스크롤
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

  // 상대방 연결 끊김 처리
  useEffect(() => {
    if (onDisconnect) {
      onDisconnect(() => {
        console.log('[Othello] Opponent disconnected')
        if (gamePhase === 'playing' || gamePhase === 'waiting' || gamePhase === 'finished') {
          showToast(t('opponentDisconnected') || 'Opponent has disconnected', 'error')
          handleBackToLobby()
        }
      })
    }
  }, [onDisconnect, gamePhase, t, showToast])

  // PeerJS 연결 성공 시 게임 시작
  useEffect(() => {
    if (isConnected && gamePhase === 'waiting') {
      console.log('[Othello] Connected! Starting game...')

      if (isHostRef.current) {
        // 호스트는 흑돌 (오셀로는 흑이 먼저)
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

    console.log('[Othello] Message received:', type, payload)

    switch (type) {
      case 'ready':
        const readyData = payload as { playerName: string; color: string }
        setOpponentName(readyData.playerName)
        break

      case 'move':
        const move = payload as { x: number; y: number; player: 'black' | 'white' }
        setGameState(prev => {
          const newState = makeMove(prev, move.x, move.y, move.player)
          return newState || prev
        })
        break

      case 'pass':
        // 상대가 패스함 - 다음 턴은 나
        showToast(t('opponentPassed') || 'Opponent passed their turn', 'info')
        break

      case 'restart':
        setGameState(createInitialOthelloState())
        setGamePhase('playing')
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
        if (!showChat) {
          setUnreadCount(prev => prev + 1)
        }
        break
    }
  }, [lastMessage, myColor, showChat, t, showToast])

  // 게임 상태에서 승자 확인
  useEffect(() => {
    if (gameState.winner && gamePhase === 'playing') {
      setGamePhase('finished')
      // 승리 횟수 업데이트
      if (gameState.winner === 'black' || gameState.winner === 'white') {
        setWinCount(prev => ({
          ...prev,
          [gameState.winner as 'black' | 'white']: prev[gameState.winner as 'black' | 'white'] + 1
        }))
      }
    }
  }, [gameState.winner, gamePhase])

  // 턴 패스 체크 (현재 플레이어가 둘 수 없으면 자동 패스)
  useEffect(() => {
    if (gamePhase !== 'playing' || gameState.winner) return
    if (gameState.currentTurn !== myColor) return

    // 내 턴인데 유효한 수가 없으면 패스
    if (gameState.validMoves.length === 0) {
      showToast(t('noValidMoves') || 'No valid moves, passing turn', 'warning')
      sendMessage('pass', {})
    }
  }, [gameState.currentTurn, gameState.validMoves, myColor, gamePhase, gameState.winner, t, showToast, sendMessage])

  // 방 heartbeat
  useEffect(() => {
    if (!currentRoom || gamePhase === 'lobby') return

    sendRoomHeartbeat(currentRoom.id)

    const interval = setInterval(() => {
      sendRoomHeartbeat(currentRoom.id)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [currentRoom, gamePhase])

  // 방 생성 핸들러 (호스트)
  const handleCreateRoom = async (hostName: string, isPrivate: boolean) => {
    setPlayerName(hostName)
    localStorage.setItem('othello_player_name', hostName)
    isHostRef.current = true

    const newPeerId = await createPeerRoom()
    if (!newPeerId) return null

    const room = await createSupabaseRoom(hostName, newPeerId, isPrivate)
    if (!room) {
      disconnectPeer()
      return null
    }

    setCurrentRoom(room)
    setOpponentName('')
    setChatMessages([])
    setWinCount({ black: 0, white: 0 })
    setGamePhase('waiting')

    return room
  }

  // 방 입장 핸들러 (게스트)
  const handleJoinRoom = async (room: GameRoom) => {
    if (room.host_id === peerId) {
      setCurrentRoom(room)
      setPlayerName(room.host_name)
      setOpponentName('')
      setGamePhase('waiting')
      return
    }

    const name = playerName || prompt(t('enterYourName')) || t('guest')
    setPlayerName(name)
    localStorage.setItem('othello_player_name', name)
    isHostRef.current = false
    setOpponentName(room.host_name)

    const joined = await joinSupabaseRoom(room.id)
    if (!joined) {
      showToast(t('roomAlreadyFull') || 'Room is already full', 'error')
      return
    }

    setCurrentRoom(room)
    setChatMessages([])
    setWinCount({ black: 0, white: 0 })
    setGamePhase('waiting')

    const success = await joinPeerRoom(room.host_id)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
      return
    }
  }

  // 착수 핸들러
  const handleMove = useCallback((x: number, y: number) => {
    if (!myColor || gameState.currentTurn !== myColor || gameState.winner) return

    const newState = makeMove(gameState, x, y, myColor)
    if (!newState) return

    setGameState(newState)

    // 상대방에게 전송
    sendMessage('move', { x, y, player: myColor })
  }, [myColor, gameState, sendMessage])

  // 재시작 (새 게임)
  const handleRestart = () => {
    setGameState(createInitialOthelloState())
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
    setGameState(createInitialOthelloState())
    setChatMessages([])
    setUnreadCount(0)
    setShowChat(false)
    setWinCount({ black: 0, white: 0 })
    setGamePhase('lobby')
    isHostRef.current = false
    gameCountedRef.current = false
  }, [currentRoom, leaveSupabaseRoom, disconnectPeer, sendMessage])

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
    localStorage.setItem('othello_player_name', name)
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

    setChatMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: playerName,
      content,
      timestamp: Date.now(),
      isMe: true
    }])

    sendMessage('chat', { sender: playerName, content })

    setChatInput('')
  }

  // 승리 메시지 계산
  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw') || 'Draw!'
    if (gameState.winner === myColor) return t('youWin') || 'You Win!'
    return t('youLose') || 'You Lose!'
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
            <Users className="w-16 h-16 mx-auto text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('waitingForOpponent')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('sharePeerId') || 'Share this Peer ID with your opponent:'}
          </p>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Peer ID</p>
            <div className="flex items-center justify-center gap-2">
              <p className="font-mono text-lg text-gray-900 dark:text-white break-all">
                {peerId || 'Loading...'}
              </p>
              <button
                onClick={handleCopyPeerId}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500" />
                )}
              </button>
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
            <RefreshCw className="w-16 h-16 mx-auto text-green-500" />
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
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
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

          {/* 점수판 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              {/* 흑돌 플레이어 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'black' && !gameState.winner
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-600 shadow-md flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{gameState.blackCount}</span>
                  </div>
                  {/* 승리 횟수 배지 */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {winCount.black}
                  </div>
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
                <div className="relative">
                  <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 shadow-md flex items-center justify-center">
                    <span className="text-gray-900 font-bold text-lg">{gameState.whiteCount}</span>
                  </div>
                  {/* 승리 횟수 배지 */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {winCount.white}
                  </div>
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
              {gameState.validMoves.length > 0 && gameState.currentTurn === myColor && (
                <span className="ml-2 text-sm opacity-70">
                  ({gameState.validMoves.length} {t('validMoves') || 'moves available'})
                </span>
              )}
            </div>
          )}

          {/* 승리 메시지 */}
          {gameState.winner && (
            <div className={`text-center py-4 px-6 rounded-2xl ${
              gameState.winner === myColor
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                : gameState.winner === 'draw'
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xl font-bold">{getWinnerMessage()}</p>
              <p className="text-sm opacity-80">
                {t('finalScore') || 'Final Score'}: {t('black') || 'Black'} {gameState.blackCount} - {gameState.whiteCount} {t('white') || 'White'}
              </p>
            </div>
          )}

          {/* 오셀로판 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <OthelloBoard
              gameState={gameState}
              myColor={myColor}
              isMyTurn={gameState.currentTurn === myColor}
              onMove={handleMove}
              disabled={!!gameState.winner || gameState.validMoves.length === 0}
            />
          </div>

          {/* 수순 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('moves') || 'Moves'}: {gameState.moveHistory.length}</span>
              <span>{t('total') || 'Total'}: {gameState.blackCount + gameState.whiteCount} / 64</span>
            </div>
          </div>

          {/* 게임 종료 후 버튼 */}
          {gamePhase === 'finished' && (
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all"
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
                          ? 'ml-auto bg-green-500 text-white'
                          : 'mr-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      } rounded-xl px-3 py-2 max-w-[80%]`}
                    >
                      <p className={`text-xs mb-1 ${
                        msg.isMe ? 'text-green-200' : 'text-gray-500 dark:text-gray-400'
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
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !isConnected}
                    className="p-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
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
