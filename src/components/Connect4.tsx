'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, Flag, Users, Copy, Check, Send, MessageCircle, AlertCircle, X, HelpCircle } from 'lucide-react'
import { useGameRoom } from '@/hooks/useGameRoom'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom, sendRoomHeartbeat, incrementGamesPlayed } from '@/utils/webrtc'
import { PeerMessage } from '@/utils/webrtc/peerManager'
import GameLobby from './GameLobby'
import Connect4BoardComponent, {
  Connect4GameState,
  Connect4Move,
  createInitialConnect4State,
  makeConnect4Move
} from './Connect4Board'

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

interface WinCount {
  red: number
  yellow: number
}

export default function Connect4() {
  const t = useTranslations('connect4')

  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [myColor, setMyColor] = useState<'red' | 'yellow' | null>(null)
  const [opponentName, setOpponentName] = useState<string>('')
  const [gameState, setGameState] = useState<Connect4GameState>(createInitialConnect4State())
  const [playerName, setPlayerName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [winCount, setWinCount] = useState<WinCount>({ red: 0, yellow: 0 })
  const isHostRef = useRef(false)

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
  } = useGameRoom('connect4')

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
    const stored = localStorage.getItem('connect4_player_name')
    if (stored) setPlayerName(stored)
  }, [])

  // 채팅 스크롤
  useEffect(() => {
    if (showChat && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, showChat])

  useEffect(() => {
    if (showChat) setUnreadCount(0)
  }, [showChat])

  // 상대방 연결 끊김 처리
  useEffect(() => {
    if (onDisconnect) {
      onDisconnect(() => {
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
      if (isHostRef.current) {
        setMyColor('red')
        sendMessage('ready', { playerName, color: 'red' })
      } else {
        setMyColor('yellow')
        sendMessage('ready', { playerName, color: 'yellow' })
      }
      setGamePhase('playing')
    }
  }, [isConnected, gamePhase, playerName, sendMessage])

  // 메시지 처리
  useEffect(() => {
    if (!lastMessage) return

    const { type, payload } = lastMessage as PeerMessage

    switch (type) {
      case 'ready':
        const readyData = payload as { playerName: string; color: string }
        setOpponentName(readyData.playerName)
        break

      case 'move':
        const move = payload as { col: number; player: 'red' | 'yellow' }
        setGameState(prev => {
          const newState = makeConnect4Move(prev, move.col, move.player)
          return newState || prev
        })
        break

      case 'restart':
        setGameState(createInitialConnect4State())
        setGamePhase('playing')
        break

      case 'surrender':
        setGameState(prev => ({
          ...prev,
          winner: myColor || 'red'
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
        if (!showChat) setUnreadCount(prev => prev + 1)
        break
    }
  }, [lastMessage, myColor, showChat])

  // 게임 종료 및 승리 카운트 업데이트
  useEffect(() => {
    if (gameState.winner && gamePhase === 'playing') {
      setGamePhase('finished')
      if (gameState.winner === 'red' || gameState.winner === 'yellow') {
        setWinCount(prev => ({
          ...prev,
          [gameState.winner as 'red' | 'yellow']: prev[gameState.winner as 'red' | 'yellow'] + 1
        }))
      }
      if (currentRoom && isHostRef.current) {
        incrementGamesPlayed(currentRoom.id)
      }
    }
  }, [gameState.winner, gamePhase, currentRoom])

  // 방 heartbeat
  useEffect(() => {
    if (!currentRoom || gamePhase === 'lobby') return
    sendRoomHeartbeat(currentRoom.id)
    const interval = setInterval(() => {
      sendRoomHeartbeat(currentRoom.id)
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentRoom, gamePhase])

  // 방 생성 핸들러
  const handleCreateRoom = async (hostName: string, isPrivate: boolean) => {
    setPlayerName(hostName)
    localStorage.setItem('connect4_player_name', hostName)
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
    setWinCount({ red: 0, yellow: 0 })
    setGamePhase('waiting')

    return room
  }

  // 방 입장 핸들러
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
    localStorage.setItem('connect4_player_name', name)
    isHostRef.current = false
    setOpponentName(room.host_name)

    const joined = await joinSupabaseRoom(room.id)
    if (!joined) {
      showToast(t('roomAlreadyFull') || 'Room is already full', 'error')
      return
    }

    setCurrentRoom(room)
    setChatMessages([])
    setWinCount({ red: 0, yellow: 0 })
    setGamePhase('waiting')

    const success = await joinPeerRoom(room.host_id)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('connectionFailed') || 'Failed to connect to host', 'error')
    }
  }

  // 착수 핸들러
  const handleMove = useCallback((col: number) => {
    if (!myColor || gameState.currentTurn !== myColor || gameState.winner) return

    const newState = makeConnect4Move(gameState, col, myColor)
    if (!newState) return

    setGameState(newState)
    sendMessage('move', { col, player: myColor })
  }, [myColor, gameState, sendMessage])

  // 재시작
  const handleRestart = () => {
    setGameState(createInitialConnect4State())
    setGamePhase('playing')
    sendMessage('restart', {})
  }

  // 기권
  const handleSurrender = () => {
    if (!confirm(t('confirmSurrender'))) return
    setGameState(prev => ({
      ...prev,
      winner: myColor === 'red' ? 'yellow' : 'red'
    }))
    setGamePhase('finished')
    sendMessage('surrender', {})
  }

  // 로비로 돌아가기
  const handleBackToLobby = useCallback(async () => {
    sendMessage('leave', {})
    if (currentRoom) await leaveSupabaseRoom(currentRoom.id)
    disconnectPeer()

    setCurrentRoom(null)
    setMyColor(null)
    setOpponentName('')
    setGameState(createInitialConnect4State())
    setChatMessages([])
    setUnreadCount(0)
    setShowChat(false)
    setWinCount({ red: 0, yellow: 0 })
    setGamePhase('lobby')
    isHostRef.current = false
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
    localStorage.setItem('connect4_player_name', name)
    isHostRef.current = false

    setChatMessages([])
    setWinCount({ red: 0, yellow: 0 })
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

  // 승리 메시지
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

        {/* 게임 규칙 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              {t('howToPlay') || 'How to Play'}
            </span>
            <span>{showRules ? '−' : '+'}</span>
          </button>
          {showRules && (
            <div className="mt-4 text-gray-600 dark:text-gray-400 space-y-2">
              <p>1. {t('rules.rule1') || 'Players take turns dropping colored discs into a 7-column, 6-row grid.'}</p>
              <p>2. {t('rules.rule2') || 'Discs fall to the lowest available space in the column.'}</p>
              <p>3. {t('rules.rule3') || 'First player to connect 4 discs in a row (horizontally, vertically, or diagonally) wins!'}</p>
              <p>4. {t('rules.rule4') || 'If the board fills up with no winner, the game is a draw.'}</p>
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

  // 대기 화면 (호스트)
  if (gamePhase === 'waiting' && isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-pulse mb-6">
            <Users className="w-16 h-16 mx-auto text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('waitingForOpponent')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('sharePeerId') || 'Share this Peer ID:'}
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <p className="font-mono text-lg text-gray-900 dark:text-white break-all">
                {peerId || 'Loading...'}
              </p>
              <button onClick={handleCopyPeerId} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
          >
            {t('cancelAndBack')}
          </button>
        </div>
      </div>
    )
  }

  // 대기 화면 (게스트)
  if (gamePhase === 'waiting' && !isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-spin mb-6">
            <RefreshCw className="w-16 h-16 mx-auto text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('connecting') || 'Connecting...'}
          </h2>
          <button
            onClick={handleBackToLobby}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
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
        <div className="flex-1 space-y-4">
          {/* 상단 바 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLobby}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('backToLobby')}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChat(!showChat)}
                className={`relative p-2 rounded-lg ${showChat ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
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
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
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
              {/* 빨강 플레이어 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'red' && !gameState.winner
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-red-700 shadow-md flex items-center justify-center">
                  <span className="text-white font-bold">{winCount.red}</span>
                </div>
                <div>
                  <p className={`font-medium ${gameState.currentTurn === 'red' && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {myColor === 'red' ? playerName : opponentName}
                  </p>
                  <p className={`text-xs ${gameState.currentTurn === 'red' && !gameState.winner ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {myColor === 'red' ? t('you') : t('opponent')} ({t('red') || 'Red'})
                  </p>
                </div>
              </div>

              <div className="text-2xl font-bold text-gray-400">VS</div>

              {/* 노랑 플레이어 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                gameState.currentTurn === 'yellow' && !gameState.winner
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <div className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center">
                  <span className="text-gray-900 font-bold">{winCount.yellow}</span>
                </div>
                <div>
                  <p className={`font-medium ${gameState.currentTurn === 'yellow' && !gameState.winner ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                    {myColor === 'yellow' ? playerName : opponentName}
                  </p>
                  <p className={`text-xs ${gameState.currentTurn === 'yellow' && !gameState.winner ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                    {myColor === 'yellow' ? t('you') : t('opponent')} ({t('yellow') || 'Yellow'})
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
                : gameState.winner === 'draw'
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xl font-bold">{getWinnerMessage()}</p>
            </div>
          )}

          {/* 게임판 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <Connect4BoardComponent
              gameState={gameState}
              myColor={myColor}
              isMyTurn={gameState.currentTurn === myColor}
              onMove={handleMove}
              disabled={!!gameState.winner}
            />
          </div>

          {/* 수순 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('moves') || 'Moves'}: {gameState.moveHistory.length}
            </div>
          </div>

          {/* 게임 종료 버튼 */}
          {gamePhase === 'finished' && (
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl"
              >
                <RefreshCw className="w-5 h-5" />
                {t('playAgain')}
              </button>
              <button
                onClick={handleBackToLobby}
                className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                {t('backToLobby')}
              </button>
            </div>
          )}
        </div>

        {/* 채팅 */}
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
                  <p className="text-center text-gray-400 text-sm py-8">{t('noChatMessages') || 'No messages yet'}</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`${msg.isMe ? 'ml-auto bg-blue-500 text-white' : 'mr-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-xl px-3 py-2 max-w-[80%]`}>
                      <p className={`text-xs mb-1 ${msg.isMe ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{msg.sender}</p>
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    placeholder={t('typeMessage') || 'Type a message...'}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || !isConnected}
                    className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg"
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
            <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'error' ? 'bg-red-500 text-white' : toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-gray-800 text-white'
            }`}>
              <AlertCircle className="w-5 h-5" />
              <span>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/20 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
