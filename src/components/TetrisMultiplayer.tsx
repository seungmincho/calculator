'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft, Trophy, RefreshCw, Users, Copy, Check, Send,
  MessageCircle, AlertCircle, X, Flag, Zap
} from 'lucide-react'
import GameInviteLink from './GameInviteLink'
import { useGameRoom } from '@/hooks/useGameRoom'
import { usePeerConnection } from '@/hooks/usePeerConnection'
import { GameRoom, sendRoomHeartbeat, incrementGamesPlayed, getRoom } from '@/utils/webrtc'
import { PeerMessage } from '@/utils/webrtc/peerManager'
import GameLobby from './GameLobby'

// ── Types ──────────────────────────────────────────────────────────────────
type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Grid = (string | null)[][]
type GamePhase = 'lobby' | 'waiting' | 'playing' | 'finished'

interface Piece {
  type: TetrominoType
  x: number
  y: number
  rotation: number
}

interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
}

interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
  isMe: boolean
}

interface BoardUpdatePayload {
  grid: Grid
  score: number
  level: number
  lines: number
  currentPiece: Piece | null
  gameOver: boolean
}

interface GarbagePayload {
  lines: number
  combo: number
}

interface GameOverPayload {
  finalScore: number
}

// ── Constants (same as solo Tetris) ──────────────────────────────────────
const COLS = 10
const ROWS = 20
const NEXT_COUNT = 3

const TETROMINOS: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
}

const COLORS: Record<string, string> = {
  I: '#06b6d4',
  O: '#eab308',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
  garbage: '#6b7280',
}

const SCORE_TABLE = [0, 100, 300, 500, 800]
const GARBAGE_TABLE = [0, 0, 1, 2, 4] // lines cleared -> garbage sent

const getDropInterval = (level: number) => Math.max(100, 1000 - (level - 1) * 50)

// SRS wall kicks
const WALL_KICKS_JLTSZ: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
}

const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
}

// ── Helpers ────────────────────────────────────────────────────────────────
function createBag(): TetrominoType[] {
  const pieces: TetrominoType[] = ['I','O','T','S','Z','J','L']
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]]
  }
  return pieces
}

function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function getShape(type: TetrominoType, rotation: number): number[][] {
  return TETROMINOS[type][rotation % TETROMINOS[type].length]
}

function isValidPosition(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): boolean {
  const shape = getShape(type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const nx = x + col
      const ny = y + row
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false
      if (ny >= 0 && grid[ny][nx]) return false
    }
  }
  return true
}

function placePieceOnGrid(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): Grid {
  const newGrid = grid.map(row => [...row])
  const shape = getShape(type, rotation)
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue
      const ny = y + row
      const nx = x + col
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        newGrid[ny][nx] = type
      }
    }
  }
  return newGrid
}

function clearLines(grid: Grid): { newGrid: Grid; linesCleared: number } {
  const newGrid = grid.filter(row => row.some(cell => cell === null))
  const linesCleared = ROWS - newGrid.length
  const emptyRows = Array.from({ length: linesCleared }, () => Array(COLS).fill(null))
  return { newGrid: [...emptyRows, ...newGrid], linesCleared }
}

function getGhostY(grid: Grid, type: TetrominoType, x: number, y: number, rotation: number): number {
  let ghostY = y
  while (isValidPosition(grid, type, x, ghostY + 1, rotation)) {
    ghostY++
  }
  return ghostY
}

function getSpawnPosition(type: TetrominoType): { x: number; y: number } {
  const shape = getShape(type, 0)
  const width = shape[0].length
  return { x: Math.floor((COLS - width) / 2), y: -1 }
}

function tryRotate(grid: Grid, piece: Piece, dir: 1 | -1): Piece | null {
  const numRotations = TETROMINOS[piece.type].length
  const newRotation = ((piece.rotation + dir) % numRotations + numRotations) % numRotations
  const key = `${piece.rotation}>${newRotation}`
  const kicks = piece.type === 'I' ? WALL_KICKS_I[key] : (piece.type === 'O' ? [[0,0]] as [number,number][] : WALL_KICKS_JLTSZ[key])
  if (!kicks) return null
  for (const [dx, dy] of kicks) {
    const nx = piece.x + dx
    const ny = piece.y - dy
    if (isValidPosition(grid, piece.type, nx, ny, newRotation)) {
      return { ...piece, x: nx, y: ny, rotation: newRotation }
    }
  }
  return null
}

function addGarbageLines(grid: Grid, count: number): Grid {
  const gapCol = Math.floor(Math.random() * COLS)
  const newGrid = grid.map(row => [...row])
  // Remove top rows
  for (let i = 0; i < count; i++) {
    newGrid.shift()
    const garbageLine = Array(COLS).fill('garbage').map((val, idx) => idx === gapCol ? null : val)
    newGrid.push(garbageLine)
  }
  return newGrid
}

// ── Props ──────────────────────────────────────────────────────────────────
interface TetrisMultiplayerProps {
  initialRoom?: GameRoom
  isHost?: boolean
  onBack?: () => void
  joinPeerId?: string | null
}

// ── Component ──────────────────────────────────────────────────────────────
export default function TetrisMultiplayer({ initialRoom, isHost: isHostProp, onBack, joinPeerId }: TetrisMultiplayerProps) {
  const t = useTranslations('tetris')

  // ── Game phase ──
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby')
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null)
  const [playerName, setPlayerName] = useState<string>('')
  const [opponentName, setOpponentName] = useState<string>('')
  const isHostRef = useRef(false)
  const gameCountedRef = useRef(false)
  const wasConnectedRef = useRef(false)

  // ── My game state ──
  const [grid, setGrid] = useState<Grid>(createEmptyGrid())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([])
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [myGameOver, setMyGameOver] = useState(false)
  const [clearingRows, setClearingRows] = useState<number[]>([])

  // ── Opponent state (received via P2P) ──
  const [opponentGrid, setOpponentGrid] = useState<Grid>(createEmptyGrid())
  const [opponentScore, setOpponentScore] = useState(0)
  const [opponentLevel, setOpponentLevel] = useState(1)
  const [opponentLines, setOpponentLines] = useState(0)
  const [opponentPiece, setOpponentPiece] = useState<Piece | null>(null)
  const [opponentGameOver, setOpponentGameOver] = useState(false)

  // ── Attack system ──
  const [pendingGarbage, setPendingGarbage] = useState(0)
  const [opponentPendingGarbage, setOpponentPendingGarbage] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [attackLog, setAttackLog] = useState<string[]>([])
  const [winCount, setWinCount] = useState({ me: 0, opponent: 0 })

  // ── Refs for game loop ──
  const gridRef = useRef<Grid>(createEmptyGrid())
  const currentPieceRef = useRef<Piece | null>(null)
  const holdPieceRef = useRef<TetrominoType | null>(null)
  const canHoldRef = useRef(true)
  const nextPiecesRef = useRef<TetrominoType[]>([])
  const bagRef = useRef<TetrominoType[]>([])
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const linesRef = useRef(0)
  const comboRef = useRef(0)
  const pendingGarbageRef = useRef(0)
  const myGameOverRef = useRef(false)
  const opponentGameOverRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastDropRef = useRef<number>(0)
  const softDropRef = useRef(false)
  const gameActiveRef = useRef(false)

  // ── Touch refs ──
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // ── Chat ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // ── Toast ──
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Supabase ──
  const {
    rooms, stats, monthlyStats, isLoading,
    error: roomError, isConfigured,
    createRoom: createSupabaseRoom,
    joinRoom: joinSupabaseRoom,
    leaveRoom: leaveSupabaseRoom,
    refreshRooms
  } = useGameRoom('tetris')

  // ── PeerJS ──
  const {
    isConnected, peerId,
    error: peerError,
    createRoom: createPeerRoom,
    joinRoom: joinPeerRoom,
    sendMessage, disconnect: disconnectPeer,
    lastMessage, onDisconnect
  } = usePeerConnection()

  // ── Player name ──
  useEffect(() => {
    const stored = localStorage.getItem('tetris_mp_player_name')
    if (stored) setPlayerName(stored)
  }, [])

  // ── initialRoom handling (from GameHub) ──
  const initialRoomIdRef = useRef<string | null>(null)
  const setupInProgressRef = useRef(false)

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
    if (!initialRoom || initialRoomIdRef.current === initialRoom.id) return
    if (setupInProgressRef.current) return

    initialRoomIdRef.current = initialRoom.id
    setupInProgressRef.current = true

    if (isHostProp) {
      setCurrentRoom(initialRoom)
      setPlayerName(initialRoom.host_name)
      setOpponentName('')
      isHostRef.current = true
      setChatMessages([])
      setWinCount({ me: 0, opponent: 0 })
      setGamePhase('waiting')
      setupInProgressRef.current = false
      return
    }

    const joinInitialRoom = async () => {
      const gameNickname = localStorage.getItem('gameNickname')
      const savedName = localStorage.getItem('tetris_mp_player_name')
      const name = gameNickname || savedName || t('multi.guest')
      setPlayerName(name)
      if (!savedName) localStorage.setItem('tetris_mp_player_name', name)
      isHostRef.current = false
      setOpponentName(initialRoom.host_name)
      setCurrentRoom(initialRoom)
      setChatMessages([])
      setWinCount({ me: 0, opponent: 0 })
      setGamePhase('waiting')

      let hostId = initialRoom.host_id
      if (hostId.startsWith('pending_')) {
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const updatedRoom = await getRoom(initialRoom.id)
          if (updatedRoom && !updatedRoom.host_id.startsWith('pending_')) {
            hostId = updatedRoom.host_id
            break
          }
        }
        if (hostId.startsWith('pending_')) {
          await leaveSupabaseRoomRef.current(initialRoom.id)
          setGamePhase('lobby')
          showToastRef.current(t('multi.connectionFailed'), 'error')
          setupInProgressRef.current = false
          if (onBackRef.current) onBackRef.current()
          return
        }
      }

      const success = await joinPeerRoomRef.current(hostId)
      setupInProgressRef.current = false
      if (!success) {
        await leaveSupabaseRoomRef.current(initialRoom.id)
        setGamePhase('lobby')
        showToastRef.current(t('multi.connectionFailed'), 'error')
        if (onBackRef.current) onBackRef.current()
      }
    }
    joinInitialRoom()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom, isHostProp, t])

  // ── Auto-join via URL ?join=PEER_ID ──
  const joinPeerIdHandledRef = useRef(false)
  useEffect(() => {
    if (!joinPeerId || joinPeerIdHandledRef.current) return
    if (initialRoom) return // initialRoom이 있으면 그쪽 로직 우선
    joinPeerIdHandledRef.current = true

    const autoJoin = async () => {
      const gameNickname = localStorage.getItem('gameNickname')
      const savedName = localStorage.getItem('tetris_mp_player_name')
      const name = gameNickname || savedName || t('multi.guest')
      setPlayerName(name)
      if (!savedName) localStorage.setItem('tetris_mp_player_name', name)
      isHostRef.current = false
      setChatMessages([])
      setWinCount({ me: 0, opponent: 0 })
      setGamePhase('waiting')

      const success = await joinPeerRoomRef.current(joinPeerId)
      if (!success) {
        setGamePhase('lobby')
        showToastRef.current(t('multi.connectionFailed'), 'error')
      }
    }
    autoJoin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinPeerId, initialRoom, t])

  // ── Chat scroll ──
  useEffect(() => {
    if (showChat && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, showChat])

  useEffect(() => {
    if (showChat) setUnreadCount(0)
  }, [showChat])

  // ── Connection tracking ──
  useEffect(() => {
    if (isConnected) wasConnectedRef.current = true
  }, [isConnected])

  // ── Piece bag ──
  const dequeueRef = useRef<() => TetrominoType>(() => 'I')
  dequeueRef.current = () => {
    if (bagRef.current.length === 0) bagRef.current = createBag()
    const piece = bagRef.current.shift()!
    while (bagRef.current.length < NEXT_COUNT + 1) {
      bagRef.current = [...bagRef.current, ...createBag()]
    }
    return piece
  }

  const spawnPiece = useCallback((type: TetrominoType): Piece => {
    const { x, y } = getSpawnPosition(type)
    return { type, x, y, rotation: 0 }
  }, [])

  // ── Send board update to opponent ──
  const sendBoardUpdate = useCallback((g: Grid, s: number, l: number, ln: number, piece: Piece | null, isGameOver: boolean) => {
    sendMessage('board_update', {
      grid: g,
      score: s,
      level: l,
      lines: ln,
      currentPiece: piece,
      gameOver: isGameOver,
    } as BoardUpdatePayload)
  }, [sendMessage])

  // ── Lock piece ──
  const lockPiece = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece || myGameOverRef.current) return

    let newGrid = placePieceOnGrid(gridRef.current, piece.type, piece.x, piece.y, piece.rotation)

    // Apply pending garbage BEFORE clearing lines
    if (pendingGarbageRef.current > 0) {
      newGrid = addGarbageLines(newGrid, pendingGarbageRef.current)
      pendingGarbageRef.current = 0
      setPendingGarbage(0)
    }

    const { newGrid: clearedGrid, linesCleared } = clearLines(newGrid)

    // Animation
    if (linesCleared > 0) {
      const clearedIndices: number[] = []
      for (let r = 0; r < ROWS; r++) {
        if (newGrid[r].every(cell => cell !== null)) {
          clearedIndices.push(r)
        }
      }
      setClearingRows(clearedIndices)
      setTimeout(() => setClearingRows([]), 300)
    }

    const newLines = linesRef.current + linesCleared
    const newLevel = Math.floor(newLines / 10) + 1
    const pointsGained = (SCORE_TABLE[linesCleared] ?? 0) * levelRef.current
    const newScore = scoreRef.current + pointsGained

    // Combo tracking
    let currentCombo = comboRef.current
    if (linesCleared > 0) {
      currentCombo += 1
      comboRef.current = currentCombo
      setComboCount(currentCombo)
    } else {
      comboRef.current = 0
      setComboCount(0)
    }

    gridRef.current = clearedGrid
    linesRef.current = newLines
    levelRef.current = newLevel
    scoreRef.current = newScore

    setGrid(clearedGrid)
    setLines(newLines)
    setLevel(newLevel)
    setScore(newScore)

    // Calculate and send garbage
    if (linesCleared > 0) {
      let garbageToSend = GARBAGE_TABLE[Math.min(linesCleared, 4)]
      // Combo bonus: +1 for each consecutive clear beyond the first
      if (currentCombo > 1) {
        garbageToSend += currentCombo - 1
      }
      if (garbageToSend > 0) {
        sendMessage('garbage', { lines: garbageToSend, combo: currentCombo } as GarbagePayload)
        const logMsg = linesCleared === 4
          ? `TETRIS! +${garbageToSend} ${t('multi.garbageLines')}`
          : currentCombo > 1
            ? `${linesCleared}L Combo x${currentCombo}! +${garbageToSend}`
            : `${linesCleared}L +${garbageToSend}`
        setAttackLog(prev => [...prev.slice(-4), logMsg])
      }
    }

    // Spawn next
    const nextType = bagRef.current[0]
    bagRef.current.shift()
    if (bagRef.current.length < NEXT_COUNT + 1) {
      bagRef.current = [...bagRef.current, ...createBag()]
    }
    const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]
    nextPiecesRef.current = next
    setNextPieces([...next])

    const newPiece = spawnPiece(nextType)

    // Check game over
    if (!isValidPosition(clearedGrid, newPiece.type, newPiece.x, newPiece.y, newPiece.rotation)) {
      myGameOverRef.current = true
      setMyGameOver(true)
      currentPieceRef.current = null
      setCurrentPiece(null)
      gameActiveRef.current = false
      sendMessage('gameover', { finalScore: newScore } as GameOverPayload)
      sendBoardUpdate(clearedGrid, newScore, newLevel, newLines, null, true)

      if (!opponentGameOverRef.current) {
        // I lost, opponent wins
        setWinCount(prev => ({ ...prev, opponent: prev.opponent + 1 }))
        setGamePhase('finished')
      }
      return
    }

    currentPieceRef.current = newPiece
    setCurrentPiece(newPiece)
    canHoldRef.current = true
    setCanHold(true)
    lastDropRef.current = performance.now()

    // Send board update
    sendBoardUpdate(clearedGrid, newScore, newLevel, newLines, newPiece, false)
  }, [spawnPiece, sendMessage, sendBoardUpdate, t])

  // ── Move helpers ──
  const movePiece = useCallback((dx: number, dy: number): boolean => {
    const piece = currentPieceRef.current
    if (!piece || myGameOverRef.current) return false
    const nx = piece.x + dx
    const ny = piece.y + dy
    if (isValidPosition(gridRef.current, piece.type, nx, ny, piece.rotation)) {
      const newPiece = { ...piece, x: nx, y: ny }
      currentPieceRef.current = newPiece
      setCurrentPiece(newPiece)
      return true
    }
    return false
  }, [])

  const rotatePiece = useCallback((dir: 1 | -1) => {
    const piece = currentPieceRef.current
    if (!piece || myGameOverRef.current) return
    const rotated = tryRotate(gridRef.current, piece, dir)
    if (rotated) {
      currentPieceRef.current = rotated
      setCurrentPiece(rotated)
    }
  }, [])

  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece || myGameOverRef.current) return
    const ghostY = getGhostY(gridRef.current, piece.type, piece.x, piece.y, piece.rotation)
    const dropDistance = ghostY - piece.y
    scoreRef.current += dropDistance * 2
    setScore(scoreRef.current)
    currentPieceRef.current = { ...piece, y: ghostY }
    setCurrentPiece({ ...piece, y: ghostY })
    lockPiece()
  }, [lockPiece])

  const holdCurrentPiece = useCallback(() => {
    if (!canHoldRef.current || myGameOverRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return

    const prevHold = holdPieceRef.current
    holdPieceRef.current = piece.type
    setHoldPiece(piece.type)
    canHoldRef.current = false
    setCanHold(false)

    let nextType: TetrominoType
    if (prevHold !== null) {
      nextType = prevHold
    } else {
      nextType = bagRef.current[0]
      bagRef.current.shift()
      if (bagRef.current.length < NEXT_COUNT + 1) {
        bagRef.current = [...bagRef.current, ...createBag()]
      }
      const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]
      nextPiecesRef.current = next
      setNextPieces([...next])
    }

    const newPiece = spawnPiece(nextType)
    currentPieceRef.current = newPiece
    setCurrentPiece(newPiece)
    lastDropRef.current = performance.now()
  }, [spawnPiece])

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (!gameActiveRef.current || myGameOverRef.current) return

    const interval = softDropRef.current
      ? Math.min(50, getDropInterval(levelRef.current))
      : getDropInterval(levelRef.current)

    if (timestamp - lastDropRef.current > interval) {
      lastDropRef.current = timestamp
      const moved = movePiece(0, 1)
      if (!moved) {
        lockPiece()
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop)
  }, [movePiece, lockPiece])

  // ── Start game (both players start independently) ──
  const startGame = useCallback(() => {
    const emptyGrid = createEmptyGrid()
    gridRef.current = emptyGrid
    scoreRef.current = 0
    levelRef.current = 1
    linesRef.current = 0
    comboRef.current = 0
    holdPieceRef.current = null
    canHoldRef.current = true
    myGameOverRef.current = false
    opponentGameOverRef.current = false
    pendingGarbageRef.current = 0
    bagRef.current = [...createBag(), ...createBag()]

    const firstType = bagRef.current[0]
    bagRef.current.shift()
    const next = bagRef.current.slice(0, NEXT_COUNT) as TetrominoType[]

    nextPiecesRef.current = next
    setNextPieces([...next])

    const firstPiece = spawnPiece(firstType)
    currentPieceRef.current = firstPiece

    setGrid(emptyGrid)
    setScore(0)
    setLevel(1)
    setLines(0)
    setComboCount(0)
    setHoldPiece(null)
    setCanHold(true)
    setCurrentPiece(firstPiece)
    setMyGameOver(false)
    setOpponentGameOver(false)
    setPendingGarbage(0)
    setOpponentPendingGarbage(0)
    setClearingRows([])
    setAttackLog([])

    // Reset opponent display
    setOpponentGrid(createEmptyGrid())
    setOpponentScore(0)
    setOpponentLevel(1)
    setOpponentLines(0)
    setOpponentPiece(null)

    gameActiveRef.current = true
    lastDropRef.current = performance.now()
    softDropRef.current = false

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [spawnPiece, gameLoop])

  // ── Connection established -> start game ──
  useEffect(() => {
    if (isConnected && gamePhase === 'waiting') {
      if (isHostRef.current) {
        sendMessage('ready', { playerName })
        if (currentRoom && !gameCountedRef.current) {
          gameCountedRef.current = true
          incrementGamesPlayed(currentRoom.id)
        }
      } else {
        sendMessage('ready', { playerName })
      }
      setGamePhase('playing')
      // Both start simultaneously
      startGame()
    }
  }, [isConnected, gamePhase, playerName, sendMessage, currentRoom, startGame])

  // ── Message handling ──
  useEffect(() => {
    if (!lastMessage) return
    const { type, payload } = lastMessage as PeerMessage

    switch (type) {
      case 'ready': {
        const data = payload as { playerName: string }
        setOpponentName(data.playerName)
        break
      }
      case 'board_update': {
        const data = payload as BoardUpdatePayload
        setOpponentGrid(data.grid)
        setOpponentScore(data.score)
        setOpponentLevel(data.level)
        setOpponentLines(data.lines)
        setOpponentPiece(data.currentPiece)
        if (data.gameOver) {
          opponentGameOverRef.current = true
          setOpponentGameOver(true)
        }
        break
      }
      case 'garbage': {
        const data = payload as GarbagePayload
        pendingGarbageRef.current += data.lines
        setPendingGarbage(prev => prev + data.lines)
        const logMsg = data.combo > 1
          ? `${t('multi.incomingGarbage')}: ${data.lines} (Combo x${data.combo})`
          : `${t('multi.incomingGarbage')}: ${data.lines}`
        setAttackLog(prev => [...prev.slice(-4), logMsg])
        break
      }
      case 'gameover': {
        opponentGameOverRef.current = true
        setOpponentGameOver(true)
        if (!myGameOverRef.current) {
          // Opponent lost, I win
          setWinCount(prev => ({ ...prev, me: prev.me + 1 }))
          setGamePhase('finished')
          gameActiveRef.current = false
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
        break
      }
      case 'restart': {
        startGame()
        setGamePhase('playing')
        break
      }
      case 'surrender': {
        opponentGameOverRef.current = true
        setOpponentGameOver(true)
        setWinCount(prev => ({ ...prev, me: prev.me + 1 }))
        setGamePhase('finished')
        gameActiveRef.current = false
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        break
      }
      case 'leave': {
        handleBackToLobby()
        break
      }
      case 'chat': {
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage])

  // ── Heartbeat ──
  useEffect(() => {
    if (!currentRoom || gamePhase === 'lobby') return
    sendRoomHeartbeat(currentRoom.id)
    const interval = setInterval(() => sendRoomHeartbeat(currentRoom.id), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentRoom, gamePhase])

  // ── Keyboard ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActiveRef.current || myGameOverRef.current) return
      // Don't capture if typing in chat
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault(); movePiece(-1, 0); break
        case 'ArrowRight':
          e.preventDefault(); movePiece(1, 0); break
        case 'ArrowDown':
          e.preventDefault()
          softDropRef.current = true
          if (movePiece(0, 1)) {
            scoreRef.current += 1
            setScore(scoreRef.current)
          }
          break
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault(); rotatePiece(1); break
        case 'z':
        case 'Z':
          rotatePiece(-1); break
        case ' ':
          e.preventDefault(); hardDrop(); break
        case 'c':
        case 'C':
          holdCurrentPiece(); break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') softDropRef.current = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [movePiece, rotatePiece, hardDrop, holdCurrentPiece])

  // ── Touch controls ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!gameActiveRef.current || myGameOverRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!gameActiveRef.current || myGameOverRef.current) return
    e.preventDefault()
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx < 10 && absDy < 10) {
      rotatePiece(1)
    } else if (absDx > absDy && absDx > 30) {
      movePiece(dx > 0 ? 1 : -1, 0)
    } else if (dy > 30) {
      const steps = Math.floor(absDy / 20)
      for (let i = 0; i < Math.max(1, steps); i++) {
        if (!movePiece(0, 1)) { lockPiece(); break }
        scoreRef.current += 1
        setScore(scoreRef.current)
      }
    } else if (dy < -30 && dt < 300) {
      hardDrop()
    }
    touchStartRef.current = null
  }, [movePiece, rotatePiece, hardDrop, lockPiece])

  // ── Cleanup ──
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Room handlers ──
  const handleCreateRoom = async (hostName: string, isPrivate: boolean) => {
    setPlayerName(hostName)
    localStorage.setItem('tetris_mp_player_name', hostName)
    isHostRef.current = true

    const newPeerId = await createPeerRoom()
    if (!newPeerId) return null

    const room = await createSupabaseRoom(hostName, newPeerId, isPrivate)
    if (!room) { disconnectPeer(); return null }

    setCurrentRoom(room)
    setOpponentName('')
    setChatMessages([])
    setWinCount({ me: 0, opponent: 0 })
    setGamePhase('waiting')
    return room
  }

  const handleJoinRoom = async (room: GameRoom) => {
    if (room.host_id === peerId) {
      setCurrentRoom(room)
      setPlayerName(room.host_name)
      setOpponentName('')
      setGamePhase('waiting')
      return
    }

    const name = playerName || prompt(t('multi.enterName')) || t('multi.guest')
    setPlayerName(name)
    localStorage.setItem('tetris_mp_player_name', name)
    isHostRef.current = false
    setOpponentName(room.host_name)

    const joined = await joinSupabaseRoom(room.id)
    if (!joined) {
      showToast(t('multi.roomFull'), 'error')
      return
    }

    setCurrentRoom(room)
    setChatMessages([])
    setWinCount({ me: 0, opponent: 0 })
    setGamePhase('waiting')

    const success = await joinPeerRoom(room.host_id)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('multi.connectionFailed'), 'error')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleBackToLobby = useCallback(async () => {
    sendMessage('leave', {})
    if (currentRoom) await leaveSupabaseRoom(currentRoom.id)
    disconnectPeer()
    gameActiveRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    setCurrentRoom(null)
    setOpponentName('')
    setMyGameOver(false)
    setOpponentGameOver(false)
    setChatMessages([])
    setUnreadCount(0)
    setShowChat(false)
    setWinCount({ me: 0, opponent: 0 })
    setGamePhase('lobby')
    isHostRef.current = false
    gameCountedRef.current = false
    wasConnectedRef.current = false
  }, [currentRoom, leaveSupabaseRoom, disconnectPeer, sendMessage])

  const handleRestart = () => {
    sendMessage('restart', {})
    startGame()
    setGamePhase('playing')
    if (currentRoom && isHostRef.current) {
      incrementGamesPlayed(currentRoom.id)
    }
  }

  const handleSurrender = () => {
    if (!confirm(t('multi.confirmSurrender'))) return
    myGameOverRef.current = true
    setMyGameOver(true)
    gameActiveRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    sendMessage('surrender', {})
    setWinCount(prev => ({ ...prev, opponent: prev.opponent + 1 }))
    setGamePhase('finished')
  }

  // ── Disconnect handling ──
  useEffect(() => {
    if (onDisconnect) {
      onDisconnect(() => {
        if (wasConnectedRef.current && (gamePhase === 'playing' || gamePhase === 'finished')) {
          showToast(t('multi.opponentDisconnected'), 'error')
          handleBackToLobby()
        }
      })
    }
  }, [onDisconnect, gamePhase, t, showToast, handleBackToLobby])

  // ── Peer ID copy ──
  const [copied, setCopied] = useState(false)
  const handleCopyPeerId = async () => {
    if (peerId) {
      await navigator.clipboard.writeText(peerId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDirectJoin = async () => {
    const hostPeerId = prompt(t('multi.enterPeerId'))
    if (!hostPeerId) return
    const name = playerName || prompt(t('multi.enterName')) || t('multi.guest')
    setPlayerName(name)
    localStorage.setItem('tetris_mp_player_name', name)
    isHostRef.current = false
    setChatMessages([])
    setGamePhase('waiting')
    const success = await joinPeerRoom(hostPeerId)
    if (!success) {
      setGamePhase('lobby')
      showToast(t('multi.connectionFailed'), 'error')
    }
  }

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

  // ── Render helpers ──
  const buildDisplayGrid = (g: Grid, piece: Piece | null, showGhost: boolean): (string | null)[][] => {
    const display: (string | null)[][] = g.map(row => [...row])
    if (piece) {
      const shape = getShape(piece.type, piece.rotation)
      if (showGhost) {
        const ghostY = getGhostY(g, piece.type, piece.x, piece.y, piece.rotation)
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            if (!shape[row][col]) continue
            const ny = ghostY + row
            const nx = piece.x + col
            if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && !display[ny][nx]) {
              display[ny][nx] = `ghost-${piece.type}`
            }
          }
        }
      }
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (!shape[row][col]) continue
          const ny = piece.y + row
          const nx = piece.x + col
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            display[ny][nx] = piece.type
          }
        }
      }
    }
    return display
  }

  const MiniPiece = ({ type }: { type: TetrominoType }) => {
    const shape = getShape(type, 0)
    const rows = shape.length
    const cols = shape[0].length
    const color = COLORS[type]
    return (
      <div className="flex items-center justify-center p-1">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1px' }}>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 12, height: 12,
                  backgroundColor: shape[r][c] ? color : 'transparent',
                  borderRadius: shape[r][c] ? 2 : 0,
                  border: shape[r][c] ? `1px solid ${color}cc` : 'none',
                }}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  // Board component
  const TetrisBoard = ({
    displayGrid, cellSize, interactive, garbageCount, isGameOver, clearingRowsArr, label
  }: {
    displayGrid: (string | null)[][]
    cellSize: number
    interactive: boolean
    garbageCount: number
    isGameOver: boolean
    clearingRowsArr?: number[]
    label: string
  }) => (
    <div className="relative">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 text-center">{label}</p>
      <div className="relative flex">
        {/* Garbage indicator */}
        <div className="w-2 mr-1 relative" style={{ height: ROWS * (cellSize + 1) + 8 }}>
          {garbageCount > 0 && (
            <div
              className="absolute bottom-0 left-0 w-full bg-red-500 rounded-sm transition-all duration-300"
              style={{ height: Math.min(garbageCount / ROWS * 100, 100) + '%' }}
            />
          )}
        </div>
        <div
          className={`relative bg-gray-900 rounded-lg overflow-hidden shadow-xl border-2 ${isGameOver ? 'border-red-500' : 'border-gray-700'}`}
          onTouchStart={interactive ? handleTouchStart : undefined}
          onTouchEnd={interactive ? handleTouchEnd : undefined}
          style={{ touchAction: interactive ? 'none' : undefined }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 1,
              padding: 2,
              backgroundColor: '#111827',
            }}
          >
            {displayGrid.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const isGhost = cell?.startsWith('ghost-')
                const type = isGhost ? cell!.replace('ghost-', '') : cell
                const isClearing = clearingRowsArr?.includes(rowIdx)
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    style={{
                      width: cellSize, height: cellSize,
                      backgroundColor: isGhost
                        ? `${COLORS[type!]}33`
                        : type
                          ? (COLORS[type] || '#6b7280')
                          : '#1f2937',
                      borderRadius: 2,
                      border: isGhost
                        ? `1px solid ${COLORS[type!]}66`
                        : type
                          ? `1px solid ${(COLORS[type] || '#6b7280')}aa`
                          : '1px solid #374151',
                      transition: isClearing ? 'background-color 0.15s ease' : undefined,
                      ...(isClearing && type ? { backgroundColor: '#fff', border: '1px solid #fff' } : {}),
                    }}
                  />
                )
              })
            )}
          </div>

          {/* Game over overlay */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
              <p className="text-red-400 text-lg font-bold">GAME OVER</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── LOBBY PHASE ──
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
          gameTitle={`${t('title')} - ${t('multi.title')}`}
          gameDescription={t('multi.description')}
        />
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('multi.directConnect')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('multi.directConnectDesc')}
          </p>
          <button
            onClick={handleDirectJoin}
            className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
          >
            {t('multi.enterPeerIdButton')}
          </button>
        </div>
      </div>
    )
  }

  // ── WAITING PHASE (Host) ──
  if (gamePhase === 'waiting' && isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-pulse mb-6">
            <Users className="w-16 h-16 mx-auto text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('multi.waitingForOpponent')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('multi.shareLinkDesc')}</p>

          <GameInviteLink peerId={peerId} gameTitle={`${t('title')} - ${t('multi.title')}`} />

          {/* Peer ID (보조) */}
          <details className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none">
              Peer ID ({t('multi.directConnect')})
            </summary>
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {peerId || 'Loading...'}
              </p>
              <button onClick={handleCopyPeerId} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all" disabled={!peerId}>
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
              </button>
            </div>
          </details>

          <button onClick={handleBackToLobby} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all">
            {t('multi.cancelAndBack')}
          </button>
        </div>
      </div>
    )
  }

  // ── WAITING PHASE (Guest - connecting) ──
  if (gamePhase === 'waiting' && !isHostRef.current && !isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="animate-spin mb-6">
            <RefreshCw className="w-16 h-16 mx-auto text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('multi.connecting')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('multi.connectingDesc')}</p>
          <button onClick={handleBackToLobby} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all">
            {t('multi.cancelAndBack')}
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING / FINISHED PHASE ──
  const myDisplayGrid = buildDisplayGrid(grid, currentPiece, true)
  const opDisplayGrid = buildDisplayGrid(opponentGrid, opponentPiece, false)

  const isFinished = gamePhase === 'finished'
  const iWon = isFinished && opponentGameOver && !myGameOver
  const iLost = isFinished && myGameOver && !opponentGameOver
  const bothDead = isFinished && myGameOver && opponentGameOver

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToLobby}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('multi.backToLobby')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`relative p-2 rounded-lg transition-all ${
              showChat ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
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
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all text-sm"
            >
              <Flag className="w-4 h-4" />
              {t('multi.surrender')}
            </button>
          )}
        </div>
      </div>

      {/* Result banner */}
      {isFinished && (
        <div className={`text-center py-4 px-6 rounded-2xl ${
          iWon ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : iLost ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        }`}>
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xl font-bold">
            {iWon ? t('multi.youWin') : iLost ? t('multi.youLose') : bothDead ? t('multi.draw') : ''}
          </p>
          <p className="text-sm opacity-80 mt-1">
            {score.toLocaleString()} vs {opponentScore.toLocaleString()}
          </p>
        </div>
      )}

      {/* Player info bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {(playerName || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{playerName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('multi.you')}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-400">{winCount.me} : {winCount.opponent}</div>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm text-right">{opponentName || '...'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{t('multi.opponent')}</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {(opponentName || '?')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">

        {/* Left: My board + side panels */}
        <div className="flex gap-2 items-start">
          {/* Hold + Stats */}
          <div className="hidden lg:flex flex-col gap-2 w-28">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('hold')}</p>
              <div className="h-14 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
                {holdPiece && <MiniPiece type={holdPiece} />}
              </div>
              {!canHold && holdPiece && <p className="text-xs text-gray-400 text-center mt-1">{t('holdUsed')}</p>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('score')}</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{score.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('level')}</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{level}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('lines')}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{lines}</p>
              </div>
            </div>
            {/* Next pieces */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('next')}</p>
              <div className="space-y-1">
                {nextPieces.map((type, i) => (
                  <div key={i} className={`h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded ${i === 0 ? '' : 'opacity-50'}`}>
                    <MiniPiece type={type} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My board */}
          <TetrisBoard
            displayGrid={myDisplayGrid}
            cellSize={24}
            interactive={true}
            garbageCount={pendingGarbage}
            isGameOver={myGameOver}
            clearingRowsArr={clearingRows}
            label={playerName}
          />
        </div>

        {/* Center: Attack log + stats (desktop) */}
        <div className="hidden lg:flex flex-col gap-3 w-48 self-center">
          {/* Attack log */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {t('multi.attackLog')}
            </p>
            <div className="space-y-1 min-h-[80px]">
              {attackLog.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">---</p>
              ) : (
                attackLog.map((msg, i) => (
                  <p key={i} className={`text-xs ${i === attackLog.length - 1 ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {msg}
                  </p>
                ))
              )}
            </div>
          </div>
          {/* Combo */}
          {comboCount > 1 && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 text-center text-white">
              <p className="text-xs font-bold uppercase">Combo</p>
              <p className="text-2xl font-bold">x{comboCount}</p>
            </div>
          )}
        </div>

        {/* Right: Opponent board */}
        <div className="flex gap-2 items-start">
          <TetrisBoard
            displayGrid={opDisplayGrid}
            cellSize={14}
            interactive={false}
            garbageCount={opponentPendingGarbage}
            isGameOver={opponentGameOver}
            label={opponentName || t('multi.opponent')}
          />
          {/* Opponent stats (desktop) */}
          <div className="hidden lg:flex flex-col gap-2 w-24">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('score')}</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{opponentScore.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('level')}</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{opponentLevel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('lines')}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{opponentLines}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Stats row */}
      <div className="lg:hidden space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('hold')}</p>
            <div className="h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
              {holdPiece && <MiniPiece type={holdPiece} />}
            </div>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('next')}</p>
            <div className="flex gap-1">
              {nextPieces.slice(0, 2).map((type, i) => (
                <div key={i} className="flex-1 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
                  <MiniPiece type={type} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('score'), value: score.toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
            { label: t('level'), value: level, color: 'text-purple-600 dark:text-purple-400' },
            { label: t('lines'), value: lines, color: 'text-green-600 dark:text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        {comboCount > 1 && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-2 text-center text-white">
            <span className="text-xs font-bold uppercase">Combo x{comboCount}</span>
          </div>
        )}
      </div>

      {/* Finished buttons */}
      {isFinished && (
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            {t('multi.playAgain')}
          </button>
          <button
            onClick={handleBackToLobby}
            className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
          >
            {t('multi.backToLobby')}
          </button>
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              {t('multi.chat')}
            </h3>
          </div>
          <div ref={chatContainerRef} className="h-40 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-4">{t('multi.noChatMessages')}</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`${msg.isMe ? 'ml-auto bg-indigo-500 text-white' : 'mr-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-xl px-3 py-1.5 max-w-[80%]`}>
                  <p className={`text-xs ${msg.isMe ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>{msg.sender}</p>
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                placeholder={t('multi.typeMessage')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                maxLength={200}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || !isConnected}
                className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
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
