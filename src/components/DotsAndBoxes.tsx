'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, Flag, Users, Copy, Check, Send, MessageCircle, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom, sendRoomHeartbeat, incrementGamesPlayed } from '@/utils/webrtc'
import { PeerMessage } from '@/utils/webrtc/peerManager'
import GameLobby from './GameLobby'
import DotsAndBoxesBoard, {
  DotsAndBoxesGameState,
  DotsPlayer,
  createInitialDotsState,
  makeDotsMove
} from './DotsAndBoxesBoard'

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

interface DotsAndBoxesProps {
  initialRoom?: GameRoom
  isHost?: boolean
  hostPeerId?: string
  onBack?: () => void
}

export default function DotsAndBoxes({ initialRoom, isHost: isHostProp, hostPeerId, onBack }: DotsAndBoxesProps) {
  const t = useTranslations('dotsandboxes')
  const tCommon = useTranslations('common')

  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [myRole, setMyRole] = useState<DotsPlayer | null>(null)
  const [opponentName, setOpponentName] = useState<string>('')
  const [gameState, setGameState] = useState<DotsAndBoxesGameState>(createInitialDotsState())
  const [playerName, setPlayerName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [winCount, setWinCount] = useState<{ player1: number; player2: number }>({ player1: 0, player2: 0 })
  const [showRules, setShowRules] = useState(false)
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

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Supabase
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
  } = useGameRoom('dotsandboxes')

  // PeerJS
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
    const stored = localStorage.getItem('dotsandboxes_player_name')
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
        setMyRole('player1')
        setChatMessages([])
        setWinCount({ player1: 0, player2: 0 })
        setGamePhase('waiting')
        return
      }

      // 게스트로 방 입장 - 바로 실행
      const joinInitialRoom = async () => {
        const stored = localStorage.getItem('dotsandboxes_player_name')
        const name = stored || t('guest')
        setPlayerName(name)
        if (!stored) localStorage.setItem('dotsandboxes_player_name', name)
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
        setWinCount({ player1: 0, player2: 0 })
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

  useEffect(() => {
    if (showChat) {
      setUnreadCount(0)
    }
  }, [showChat])

  // 연결 끊김
  useEffect(() => {
    if (onDisconnect) {
      onDisconnect(() => {
        console.log('[DotsAndBoxes] Opponent disconnected')
        if (gamePhase === 'playing' || gamePhase === 'waiting' || gamePhase === 'finished') {
          showToast(t('opponentDisconnected') || 'Opponent has disconnected', 'error')
          handleBackToLobby()
        }
      })
    }
  }, [onDisconnect, gamePhase, t, showToast])

  // 연결 성공
  useEffect(() => {
    if (isConnected && gamePhase === 'waiting') {
      console.log('[DotsAndBoxes] Connected! Starting game...')

      if (isHostRef.current) {
        setMyRole('player1')
        sendMessage('ready', { playerName, role: 'player1' })

        // 게임 시작 시 게임판수 증가 (호스트만, 중복 방지)
        if (currentRoom && !gameCountedRef.current) {
          gameCountedRef.current = true
          incrementGamesPlayed(currentRoom.id)
        }
      } else {
        setMyRole('player2')
        sendMessage('ready', { playerName, role: 'player2' })
      }

      setGamePhase('playing')
    }
  }, [isConnected, gamePhase, playerName, sendMessage, currentRoom])

  // 메시지 처리
  useEffect(() => {
    if (!lastMessage) return

    const { type, payload } = lastMessage as PeerMessage

    console.log('[DotsAndBoxes] Message received:', type, payload)

    switch (type) {
      case 'ready':
        const readyData = payload as { playerName: string; role: string }
        setOpponentName(readyData.playerName)
        break

      case 'move':
        const move = payload as { type: 'horizontal' | 'vertical'; row: number; col: number; player: DotsPlayer }
        setGameState(prev => {
          const newState = makeDotsMove(prev, move.type, move.row, move.col, move.player)
          return newState || prev
        })
        break

      case 'restart':
        setGameState(createInitialDotsState())
        setGamePhase('playing')
        break

      case 'surrender':
        setGameState(prev => ({
          ...prev,
          winner: myRole || 'player1'
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
  }, [lastMessage, myRole, showChat])

  // 박스 완성 알림
  useEffect(() => {
    if (gameState.lastMove && gameState.lastMove.boxesCompleted > 0) {
      const isMyMove = gameState.lastMove.player === myRole
      showToast(
        isMyMove
          ? (t('youCompletedBox') || `You completed ${gameState.lastMove.boxesCompleted} box(es)!`).replace('{count}', String(gameState.lastMove.boxesCompleted))
          : (t('opponentCompletedBox') || `Opponent completed ${gameState.lastMove.boxesCompleted} box(es)!`).replace('{count}', String(gameState.lastMove.boxesCompleted)),
        isMyMove ? 'success' : 'warning'
      )
    }
  }, [gameState.lastMove, myRole, t, showToast])

  // 승자 확인
  useEffect(() => {
    if (gameState.winner && gamePhase === 'playing') {
      setGamePhase('finished')
      if (gameState.winner === 'player1' || gameState.winner === 'player2') {
        setWinCount(prev => ({
          ...prev,
          [gameState.winner as 'player1' | 'player2']: prev[gameState.winner as 'player1' | 'player2'] + 1
        }))
      }
    }
  }, [gameState.winner, gamePhase])

  // 방 heartbeat
  useEffect(() => {
    if (!currentRoom || gamePhase === 'lobby') return

    sendRoomHeartbeat(currentRoom.id)

    const interval = setInterval(() => {
      sendRoomHeartbeat(currentRoom.id)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [currentRoom, gamePhase])

  // 방 생성
  const handleCreateRoom = async (hostName: string, isPrivate: boolean) => {
    setPlayerName(hostName)
    localStorage.setItem('dotsandboxes_player_name', hostName)
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
    setWinCount({ player1: 0, player2: 0 })
    setGamePhase('waiting')

    return room
  }

  // 방 입장
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
    localStorage.setItem('dotsandboxes_player_name', name)
    isHostRef.current = false
    setOpponentName(room.host_name)

    const joined = await joinSupabaseRoom(room.id)
    if (!joined) {
      showToast(t('roomAlreadyFull') || 'Room is already full', 'error')
      return
    }

    setCurrentRoom(room)
    setChatMessages([])
    setWinCount({ player1: 0, player2: 0 })
    setGamePhase('waiting')

    const success = await joinPeerRoom(room.host_id)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
      return
    }
  }

  // 착수
  const handleMove = useCallback((type: 'horizontal' | 'vertical', row: number, col: number) => {
    if (!myRole || gameState.currentTurn !== myRole || gameState.winner) return

    const newState = makeDotsMove(gameState, type, row, col, myRole)
    if (!newState) return

    setGameState(newState)
    sendMessage('move', { type, row, col, player: myRole })
  }, [myRole, gameState, sendMessage])

  // 재시작 (새 게임)
  const handleRestart = () => {
    setGameState(createInitialDotsState())
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
      winner: myRole === 'player1' ? 'player2' : 'player1'
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
    setMyRole(null)
    setOpponentName('')
    setGameState(createInitialDotsState())
    setChatMessages([])
    setUnreadCount(0)
    setShowChat(false)
    setWinCount({ player1: 0, player2: 0 })
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

  // 직접 입장
  const handleDirectJoin = async () => {
    const hostPeerId = prompt(t('enterPeerId') || 'Enter host Peer ID:')
    if (!hostPeerId) return

    const name = playerName || prompt(t('enterYourName')) || t('guest')
    setPlayerName(name)
    localStorage.setItem('dotsandboxes_player_name', name)
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

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw') || 'Draw!'
    if (gameState.winner === myRole) return t('youWin') || 'You Win!'
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

        {/* 게임 규칙 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('howToPlay') || 'How to Play'}
            </h3>
            {showRules ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>

          {showRules && (
            <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>{t('rules.objective') || 'Objective'}:</strong> {t('rules.objectiveDesc') || 'Complete more boxes than your opponent.'}</p>
              <p><strong>{t('rules.gameplay') || 'Gameplay'}:</strong> {t('rules.gameplayDesc') || 'Take turns drawing lines between adjacent dots.'}</p>
              <p><strong>{t('rules.scoring') || 'Scoring'}:</strong> {t('rules.scoringDesc') || 'Complete a box by drawing its 4th side to claim it and get an extra turn.'}</p>
              <p><strong>{t('rules.end') || 'End'}:</strong> {t('rules.endDesc') || 'Game ends when all boxes are claimed. Player with more boxes wins.'}</p>
            </div>
          )}
        </div>

        {/* 직접 입장 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('directConnect') || 'Direct Connect'}
          </h3>
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

  // 대기 화면
  if (gamePhase === 'waiting' && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className={isHostRef.current ? 'animate-pulse' : 'animate-spin'}>
            {isHostRef.current ? (
              <Users className="w-16 h-16 mx-auto text-indigo-600" />
            ) : (
              <RefreshCw className="w-16 h-16 mx-auto text-indigo-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-6">
            {isHostRef.current ? t('waitingForOpponent') : (t('connecting') || 'Connecting...')}
          </h2>

          {isHostRef.current && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6 mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Peer ID</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-lg text-gray-900 dark:text-white break-all">
                  {peerId || 'Loading...'}
                </p>
                <button onClick={handleCopyPeerId} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                </button>
              </div>
            </div>
          )}

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

          {/* 점수판 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'player1' && !gameState.winner
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">{gameState.scores.player1}</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {winCount.player1}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {myRole === 'player1' ? playerName : opponentName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {myRole === 'player1' ? t('you') : t('opponent')} (P1)
                  </p>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">VS</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {winCount.player1} : {winCount.player2}
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'player2' && !gameState.winner
                  ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="relative">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">{gameState.scores.player2}</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {winCount.player2}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {myRole === 'player2' ? playerName : opponentName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {myRole === 'player2' ? t('you') : t('opponent')} (P2)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 턴 표시 */}
          {!gameState.winner && (
            <div className={`text-center py-2 px-4 rounded-xl ${
              gameState.currentTurn === myRole
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {gameState.currentTurn === myRole ? t('yourTurn') : t('opponentTurn')}
              {gameState.lastMove?.boxesCompleted && gameState.lastMove.boxesCompleted > 0 && gameState.currentTurn === myRole && (
                <span className="ml-2 text-sm font-bold">
                  ({t('extraTurnLabel') || 'Extra Turn!'})
                </span>
              )}
            </div>
          )}

          {/* 승리 메시지 */}
          {gameState.winner && (
            <div className={`text-center py-4 px-6 rounded-2xl ${
              gameState.winner === myRole
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                : gameState.winner === 'draw'
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xl font-bold">{getWinnerMessage()}</p>
              <p className="text-sm opacity-80">
                {t('finalScore') || 'Final Score'}: P1 {gameState.scores.player1} - {gameState.scores.player2} P2
              </p>
            </div>
          )}

          {/* 게임 보드 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <DotsAndBoxesBoard
              gameState={gameState}
              myRole={myRole}
              isMyTurn={gameState.currentTurn === myRole}
              onMove={handleMove}
              disabled={!!gameState.winner}
            />
          </div>

          {/* 게임 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('moves') || 'Moves'}: {gameState.moveHistory.length}</span>
              <span>{t('boxesRemaining') || 'Boxes Left'}: {16 - gameState.scores.player1 - gameState.scores.player2}</span>
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

        {/* 채팅 영역 */}
        {showChat && (
          <div className="w-80 flex-shrink-0 sticky top-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg h-[500px] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {t('chat') || 'Chat'}
                </h3>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <p className={`text-xs mb-1 ${msg.isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {msg.sender}
                      </p>
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

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

      {/* 토스트 */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-200 ${
                toast.type === 'error' ? 'bg-red-500 text-white'
                  : toast.type === 'warning' ? 'bg-amber-500 text-white'
                  : toast.type === 'success' ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
