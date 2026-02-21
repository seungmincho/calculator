'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const ROWS = 6
const COLS = 7
const CELL_SIZE = 70
const PADDING = 20
const DISC_RADIUS = 28
const BOARD_WIDTH = COLS * CELL_SIZE + PADDING * 2
const BOARD_HEIGHT = ROWS * CELL_SIZE + PADDING * 2

export type Connect4Cell = 'red' | 'yellow' | null
export type Connect4Board = Connect4Cell[][]

export interface Connect4Move {
  col: number
  row: number
  player: 'red' | 'yellow'
}

export interface Connect4GameState {
  board: Connect4Board
  currentTurn: 'red' | 'yellow'
  moveHistory: Connect4Move[]
  winner: 'red' | 'yellow' | 'draw' | null
  lastMove: Connect4Move | null
  winningCells: { row: number; col: number }[]
}

interface Connect4BoardProps {
  gameState: Connect4GameState
  myColor: 'red' | 'yellow' | null
  isMyTurn: boolean
  onMove: (col: number) => void
  disabled?: boolean
}

export default function Connect4BoardComponent({
  gameState,
  myColor,
  isMyTurn,
  onMove,
  disabled = false
}: Connect4BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoverCol, setHoverCol] = useState<number | null>(null)

  // Drop animation state
  const animRef = useRef<{
    col: number
    targetRow: number
    currentY: number
    color: 'red' | 'yellow'
    rafId: number
  } | null>(null)
  const prevMoveCountRef = useRef(gameState.moveHistory.length)
  const [animY, setAnimY] = useState<number | null>(null)
  const animColRef = useRef<number | null>(null)
  const animColorRef = useRef<'red' | 'yellow' | null>(null)
  const animTargetRowRef = useRef<number | null>(null)

  // 반응형 스케일 계산
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const newScale = Math.min(1, (containerWidth - 16) / BOARD_WIDTH)
        setScale(newScale)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // Trigger drop animation when a new move is made
  useEffect(() => {
    const currentCount = gameState.moveHistory.length
    if (currentCount > prevMoveCountRef.current && gameState.lastMove) {
      const { col, row, player } = gameState.lastMove
      animColRef.current = col
      animColorRef.current = player
      animTargetRowRef.current = row

      const startY = PADDING - CELL_SIZE
      const targetY = PADDING + row * CELL_SIZE + CELL_SIZE / 2
      let currentYPos = startY
      const gravity = 1.8

      const animate = () => {
        currentYPos += (targetY - currentYPos) * 0.15 + gravity
        if (currentYPos >= targetY) {
          setAnimY(null)
          animColRef.current = null
          animColorRef.current = null
          animTargetRowRef.current = null
          animRef.current = null
        } else {
          setAnimY(currentYPos)
          const nextRafId = requestAnimationFrame(animate)
          animRef.current = { col, targetRow: row, currentY: currentYPos, color: player, rafId: nextRafId }
        }
      }

      setAnimY(startY)
      const rafId = requestAnimationFrame(animate)
      animRef.current = { col, targetRow: row, currentY: startY, color: player, rafId }
    }
    prevMoveCountRef.current = currentCount

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current.rafId)
      }
    }
  }, [gameState.moveHistory.length, gameState.lastMove])

  // 보드 그리기
  const drawBoard = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { board, winner, winningCells } = gameState

      // 배경 (파란색 보드)
      ctx.fillStyle = '#1565C0'
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

      // 보드 테두리
      ctx.strokeStyle = '#0D47A1'
      ctx.lineWidth = 4
      ctx.strokeRect(2, 2, BOARD_WIDTH - 4, BOARD_HEIGHT - 4)

      // 호버 프리뷰 (내 턴일 때만)
      if (hoverCol !== null && isMyTurn && myColor && !winner && !disabled) {
        const row = getDropRow(board, hoverCol)
        if (row !== -1) {
          const px = PADDING + hoverCol * CELL_SIZE + CELL_SIZE / 2
          const py = PADDING + row * CELL_SIZE + CELL_SIZE / 2

          ctx.beginPath()
          ctx.arc(px, py, DISC_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = myColor === 'red' ? 'rgba(244, 67, 54, 0.4)' : 'rgba(255, 235, 59, 0.4)'
          ctx.fill()
        }
      }

      // Helper to draw a disc at a given position
      const drawDisc = (px: number, py: number, color: 'red' | 'yellow') => {
        ctx.beginPath()
        ctx.arc(px, py, DISC_RADIUS, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(px - 8, py - 8, 2, px, py, DISC_RADIUS)
        if (color === 'red') {
          gradient.addColorStop(0, '#EF5350')
          gradient.addColorStop(1, '#C62828')
        } else {
          gradient.addColorStop(0, '#FFEE58')
          gradient.addColorStop(1, '#F9A825')
        }
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.strokeStyle = color === 'red' ? '#B71C1C' : '#F57F17'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // 셀 및 디스크 그리기
      const isAnimating = animY !== null && animColRef.current !== null
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const px = PADDING + col * CELL_SIZE + CELL_SIZE / 2
          const py = PADDING + row * CELL_SIZE + CELL_SIZE / 2
          const cell = board[row][col]

          // Skip the animating disc at its final position
          const isAnimCell = isAnimating && col === animColRef.current && row === animTargetRowRef.current
          if (isAnimCell) {
            ctx.beginPath()
            ctx.arc(px, py, DISC_RADIUS, 0, Math.PI * 2)
            ctx.fillStyle = '#E3F2FD'
            ctx.fill()
            continue
          }

          // 구멍/디스크 그리기
          ctx.beginPath()
          ctx.arc(px, py, DISC_RADIUS, 0, Math.PI * 2)

          if (cell === null) {
            // 빈 구멍
            ctx.fillStyle = '#E3F2FD'
            ctx.fill()
          } else {
            drawDisc(px, py, cell)
          }

          // 승리 라인 하이라이트
          if (winningCells.some(c => c.row === row && c.col === col)) {
            ctx.beginPath()
            ctx.arc(px, py, DISC_RADIUS + 4, 0, Math.PI * 2)
            ctx.strokeStyle = '#00E676'
            ctx.lineWidth = 4
            ctx.stroke()
          }
        }
      }

      // Draw the animating disc
      if (isAnimating && animColorRef.current) {
        const animPx = PADDING + animColRef.current! * CELL_SIZE + CELL_SIZE / 2
        drawDisc(animPx, animY!, animColorRef.current)
      }

      // 열 번호
      ctx.font = 'bold 14px sans-serif'
      ctx.fillStyle = '#BBDEFB'
      ctx.textAlign = 'center'
      for (let col = 0; col < COLS; col++) {
        ctx.fillText(
          String(col + 1),
          PADDING + col * CELL_SIZE + CELL_SIZE / 2,
          BOARD_HEIGHT - 5
        )
      }
    },
    [gameState, hoverCol, isMyTurn, myColor, disabled, animY]
  )

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBoard(ctx)
  }, [drawBoard])

  // 마우스 위치를 열로 변환
  const getCol = (e: React.MouseEvent<HTMLCanvasElement>): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_WIDTH / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX

    const col = Math.floor((mouseX - PADDING) / CELL_SIZE)
    if (col >= 0 && col < COLS) {
      return col
    }
    return null
  }

  // 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const col = getCol(e)
    if (col !== null) {
      const row = getDropRow(gameState.board, col)
      if (row !== -1) {
        onMove(col)
      }
    }
  }

  // 마우스 이동 처리
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const col = getCol(e)
    setHoverCol(col)
  }

  // 마우스 나감 처리
  const handleMouseLeave = () => {
    setHoverCol(null)
  }

  // 키보드 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const key = e.key
    if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(key)) {
      e.preventDefault()

      if (key === 'ArrowLeft') {
        setHoverCol(prev => prev === null ? 3 : Math.max(0, prev - 1))
      } else if (key === 'ArrowRight') {
        setHoverCol(prev => prev === null ? 3 : Math.min(COLS - 1, prev + 1))
      } else if (key === 'Enter' || key === ' ') {
        if (hoverCol !== null) {
          const row = getDropRow(gameState.board, hoverCol)
          if (row !== -1) {
            onMove(hoverCol)
          }
        }
      }
    }
  }, [disabled, isMyTurn, myColor, gameState.winner, gameState.board, hoverCol, onMove])

  // 터치 위치를 열로 변환
  const getTouchCol = (e: React.TouchEvent<HTMLCanvasElement>): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_WIDTH / rect.width
    const touchX = (touch.clientX - rect.left) * scaleX

    const col = Math.floor((touchX - PADDING) / CELL_SIZE)
    if (col >= 0 && col < COLS) return col
    return null
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        tabIndex={0}
        aria-label="Connect4 game board"
        role="grid"
        style={{
          width: BOARD_WIDTH * scale,
          height: BOARD_HEIGHT * scale,
          cursor: isMyTurn && myColor && !gameState.winner && !disabled ? 'pointer' : 'default',
          outline: 'none',
          touchAction: 'none'
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onTouchStart={(e) => {
          e.preventDefault()
          const col = getTouchCol(e)
          if (col !== null) setHoverCol(col)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          const col = getTouchCol(e)
          if (col !== null) setHoverCol(col)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          const col = getTouchCol(e)
          if (col !== null) {
            if (!disabled && isMyTurn && myColor && !gameState.winner) {
              const row = getDropRow(gameState.board, col)
              if (row !== -1) {
                onMove(col)
              }
            }
          }
          setHoverCol(null)
        }}
        className="rounded-lg shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      />
    </div>
  )
}

// 디스크가 떨어질 행 계산
export const getDropRow = (board: Connect4Board, col: number): number => {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return row
    }
  }
  return -1 // 열이 가득 참
}

// 초기 게임 상태 생성
export const createInitialConnect4State = (): Connect4GameState => ({
  board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
  currentTurn: 'red',
  moveHistory: [],
  winner: null,
  lastMove: null,
  winningCells: []
})

// 4개 연속 체크
export const checkWinner = (
  board: Connect4Board,
  lastMove: Connect4Move
): { winner: 'red' | 'yellow' | null; winningCells: { row: number; col: number }[] } => {
  const { row, col, player } = lastMove
  const directions = [
    [0, 1],   // 가로
    [1, 0],   // 세로
    [1, 1],   // 대각선 ↘
    [1, -1]   // 대각선 ↗
  ]

  for (const [dr, dc] of directions) {
    const cells: { row: number; col: number }[] = [{ row, col }]

    // 정방향
    for (let i = 1; i < 4; i++) {
      const nr = row + dr * i
      const nc = col + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      if (board[nr][nc] !== player) break
      cells.push({ row: nr, col: nc })
    }

    // 역방향
    for (let i = 1; i < 4; i++) {
      const nr = row - dr * i
      const nc = col - dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      if (board[nr][nc] !== player) break
      cells.push({ row: nr, col: nc })
    }

    if (cells.length >= 4) {
      return { winner: player, winningCells: cells }
    }
  }

  return { winner: null, winningCells: [] }
}

// 무승부 체크 (보드가 가득 찼는지)
export const checkDraw = (board: Connect4Board): boolean => {
  return board[0].every(cell => cell !== null)
}

// 수를 두고 새로운 상태 반환
export const makeConnect4Move = (
  state: Connect4GameState,
  col: number,
  player: 'red' | 'yellow'
): Connect4GameState | null => {
  const row = getDropRow(state.board, col)
  if (row === -1) return null

  // 보드 복사 및 디스크 놓기
  const newBoard = state.board.map(r => [...r])
  newBoard[row][col] = player

  const move: Connect4Move = { col, row, player }
  const { winner, winningCells } = checkWinner(newBoard, move)
  const isDraw = !winner && checkDraw(newBoard)

  return {
    board: newBoard,
    currentTurn: player === 'red' ? 'yellow' : 'red',
    moveHistory: [...state.moveHistory, move],
    winner: winner || (isDraw ? 'draw' : null),
    lastMove: move,
    winningCells
  }
}
