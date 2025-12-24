'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const BOARD_SIZE = 8
const CELL_SIZE = 56
const PADDING = 24
const STONE_RADIUS = 22
const BOARD_PIXEL_SIZE = CELL_SIZE * BOARD_SIZE + PADDING * 2

export type OthelloCell = 'black' | 'white' | null
export type OthelloBoard = OthelloCell[][]

export interface OthelloMove {
  x: number
  y: number
  player: 'black' | 'white'
  flipped: { x: number; y: number }[]
}

export interface OthelloGameState {
  board: OthelloBoard
  currentTurn: 'black' | 'white'
  moveHistory: OthelloMove[]
  winner: 'black' | 'white' | 'draw' | null
  lastMove: OthelloMove | null
  blackCount: number
  whiteCount: number
  validMoves: { x: number; y: number }[]
}

interface OthelloBoardProps {
  gameState: OthelloGameState
  myColor: 'black' | 'white' | null
  isMyTurn: boolean
  onMove: (x: number, y: number) => void
  disabled?: boolean
}

// 8방향
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1], [1, 0], [1, 1]
]

export default function OthelloBoard({
  gameState,
  myColor,
  isMyTurn,
  onMove,
  disabled = false
}: OthelloBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  // 반응형 스케일 계산
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const newScale = Math.min(1, (containerWidth - 16) / BOARD_PIXEL_SIZE)
        setScale(newScale)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // 보드 그리기
  const drawBoard = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { board, lastMove, winner, validMoves } = gameState

      // 배경 (녹색 보드)
      ctx.fillStyle = '#1B5E20'
      ctx.fillRect(0, 0, BOARD_PIXEL_SIZE, BOARD_PIXEL_SIZE)

      // 격자선
      ctx.strokeStyle = '#0D3D12'
      ctx.lineWidth = 2

      for (let i = 0; i <= BOARD_SIZE; i++) {
        const pos = PADDING + i * CELL_SIZE

        // 세로선
        ctx.beginPath()
        ctx.moveTo(pos, PADDING)
        ctx.lineTo(pos, PADDING + BOARD_SIZE * CELL_SIZE)
        ctx.stroke()

        // 가로선
        ctx.beginPath()
        ctx.moveTo(PADDING, pos)
        ctx.lineTo(PADDING + BOARD_SIZE * CELL_SIZE, pos)
        ctx.stroke()
      }

      // 좌표 라벨
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = '#A5D6A7'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const letters = 'ABCDEFGH'
      for (let i = 0; i < BOARD_SIZE; i++) {
        // 상단 알파벳
        ctx.fillText(letters[i], PADDING + i * CELL_SIZE + CELL_SIZE / 2, 12)
        // 좌측 숫자
        ctx.fillText(String(i + 1), 10, PADDING + i * CELL_SIZE + CELL_SIZE / 2)
      }

      // 유효한 수 표시 (내 턴이고 게임이 진행 중일 때)
      if (isMyTurn && myColor && !winner && !disabled) {
        validMoves.forEach(({ x, y }) => {
          const px = PADDING + x * CELL_SIZE + CELL_SIZE / 2
          const py = PADDING + y * CELL_SIZE + CELL_SIZE / 2

          ctx.beginPath()
          ctx.arc(px, py, 8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.fill()
        })
      }

      // 돌 그리기
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const stone = board[y][x]
          if (!stone) continue

          const px = PADDING + x * CELL_SIZE + CELL_SIZE / 2
          const py = PADDING + y * CELL_SIZE + CELL_SIZE / 2

          // 그림자
          ctx.beginPath()
          ctx.arc(px + 2, py + 2, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
          ctx.fill()

          // 돌
          const gradient = ctx.createRadialGradient(
            px - 6, py - 6, 2,
            px, py, STONE_RADIUS
          )

          if (stone === 'black') {
            gradient.addColorStop(0, '#444')
            gradient.addColorStop(1, '#111')
          } else {
            gradient.addColorStop(0, '#fff')
            gradient.addColorStop(1, '#ddd')
          }

          ctx.beginPath()
          ctx.arc(px, py, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()

          // 마지막 착수 위치 표시
          if (lastMove && lastMove.x === x && lastMove.y === y) {
            ctx.beginPath()
            ctx.arc(px, py, 6, 0, Math.PI * 2)
            ctx.fillStyle = '#FF5722'
            ctx.fill()
          }

          // 뒤집힌 돌 표시 (마지막 수에서 뒤집힌 돌들)
          if (lastMove?.flipped.some(f => f.x === x && f.y === y)) {
            ctx.beginPath()
            ctx.arc(px, py, 4, 0, Math.PI * 2)
            ctx.fillStyle = '#FFC107'
            ctx.fill()
          }
        }
      }

      // 호버 표시 (유효한 위치일 때만)
      if (hoverPos && isMyTurn && myColor && !winner && !disabled) {
        const isValid = validMoves.some(m => m.x === hoverPos.x && m.y === hoverPos.y)
        if (isValid) {
          const px = PADDING + hoverPos.x * CELL_SIZE + CELL_SIZE / 2
          const py = PADDING + hoverPos.y * CELL_SIZE + CELL_SIZE / 2

          ctx.beginPath()
          ctx.arc(px, py, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = myColor === 'black' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)'
          ctx.fill()
          ctx.strokeStyle = '#FFC107'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      }
    },
    [gameState, hoverPos, isMyTurn, myColor, disabled]
  )

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBoard(ctx)
  }, [drawBoard])

  // 마우스 위치를 보드 좌표로 변환
  const getPosition = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_PIXEL_SIZE / rect.width
    const scaleY = BOARD_PIXEL_SIZE / rect.height

    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const x = Math.floor((mouseX - PADDING) / CELL_SIZE)
    const y = Math.floor((mouseY - PADDING) / CELL_SIZE)

    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      return { x, y }
    }
    return null
  }

  // 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const pos = getPosition(e)
    if (pos) {
      const isValid = gameState.validMoves.some(m => m.x === pos.x && m.y === pos.y)
      if (isValid) {
        onMove(pos.x, pos.y)
      }
    }
  }

  // 마우스 이동 처리
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPosition(e)
    setHoverPos(pos)
  }

  // 마우스 나감 처리
  const handleMouseLeave = () => {
    setHoverPos(null)
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        width={BOARD_PIXEL_SIZE}
        height={BOARD_PIXEL_SIZE}
        style={{
          width: BOARD_PIXEL_SIZE * scale,
          height: BOARD_PIXEL_SIZE * scale,
          cursor: isMyTurn && myColor && !gameState.winner && !disabled ? 'pointer' : 'default'
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="rounded-lg shadow-xl"
      />
    </div>
  )
}

// 초기 게임 상태 생성
export const createInitialOthelloState = (): OthelloGameState => {
  const board: OthelloBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))

  // 초기 4개 돌 배치
  board[3][3] = 'white'
  board[3][4] = 'black'
  board[4][3] = 'black'
  board[4][4] = 'white'

  const state: OthelloGameState = {
    board,
    currentTurn: 'black',
    moveHistory: [],
    winner: null,
    lastMove: null,
    blackCount: 2,
    whiteCount: 2,
    validMoves: []
  }

  // 초기 유효한 수 계산
  state.validMoves = getValidMoves(board, 'black')

  return state
}

// 특정 위치에 돌을 놓을 때 뒤집을 수 있는 돌 목록 반환
export const getFlippableStones = (
  board: OthelloBoard,
  x: number,
  y: number,
  player: 'black' | 'white'
): { x: number; y: number }[] => {
  if (board[y][x] !== null) return []

  const opponent = player === 'black' ? 'white' : 'black'
  const flippable: { x: number; y: number }[] = []

  for (const [dy, dx] of DIRECTIONS) {
    const line: { x: number; y: number }[] = []
    let nx = x + dx
    let ny = y + dy

    // 상대 돌이 연속으로 있는지 확인
    while (
      nx >= 0 && nx < BOARD_SIZE &&
      ny >= 0 && ny < BOARD_SIZE &&
      board[ny][nx] === opponent
    ) {
      line.push({ x: nx, y: ny })
      nx += dx
      ny += dy
    }

    // 끝에 내 돌이 있으면 사이의 돌들을 뒤집을 수 있음
    if (
      line.length > 0 &&
      nx >= 0 && nx < BOARD_SIZE &&
      ny >= 0 && ny < BOARD_SIZE &&
      board[ny][nx] === player
    ) {
      flippable.push(...line)
    }
  }

  return flippable
}

// 유효한 수 목록 반환
export const getValidMoves = (
  board: OthelloBoard,
  player: 'black' | 'white'
): { x: number; y: number }[] => {
  const moves: { x: number; y: number }[] = []

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === null) {
        const flippable = getFlippableStones(board, x, y, player)
        if (flippable.length > 0) {
          moves.push({ x, y })
        }
      }
    }
  }

  return moves
}

// 돌 개수 세기
export const countStones = (board: OthelloBoard): { black: number; white: number } => {
  let black = 0
  let white = 0

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'black') black++
      else if (board[y][x] === 'white') white++
    }
  }

  return { black, white }
}

// 수를 두고 새로운 상태 반환
export const makeMove = (
  state: OthelloGameState,
  x: number,
  y: number,
  player: 'black' | 'white'
): OthelloGameState | null => {
  const flipped = getFlippableStones(state.board, x, y, player)
  if (flipped.length === 0) return null

  // 보드 복사 및 돌 놓기
  const newBoard = state.board.map(row => [...row])
  newBoard[y][x] = player

  // 돌 뒤집기
  for (const pos of flipped) {
    newBoard[pos.y][pos.x] = player
  }

  const move: OthelloMove = { x, y, player, flipped }
  const { black, white } = countStones(newBoard)
  const nextPlayer = player === 'black' ? 'white' : 'black'

  // 다음 플레이어의 유효한 수 계산
  let validMoves = getValidMoves(newBoard, nextPlayer)
  let actualNextPlayer: 'black' | 'white' = nextPlayer

  // 다음 플레이어가 둘 수 없으면 턴 넘기기
  if (validMoves.length === 0) {
    validMoves = getValidMoves(newBoard, player)
    actualNextPlayer = player

    // 둘 다 둘 수 없으면 게임 종료
    if (validMoves.length === 0) {
      const winner = black > white ? 'black' : white > black ? 'white' : 'draw'
      return {
        board: newBoard,
        currentTurn: actualNextPlayer,
        moveHistory: [...state.moveHistory, move],
        winner,
        lastMove: move,
        blackCount: black,
        whiteCount: white,
        validMoves: []
      }
    }
  }

  return {
    board: newBoard,
    currentTurn: actualNextPlayer,
    moveHistory: [...state.moveHistory, move],
    winner: null,
    lastMove: move,
    blackCount: black,
    whiteCount: white,
    validMoves
  }
}

// 게임 종료 체크
export const checkGameOver = (board: OthelloBoard): boolean => {
  const blackMoves = getValidMoves(board, 'black')
  const whiteMoves = getValidMoves(board, 'white')
  return blackMoves.length === 0 && whiteMoves.length === 0
}
