'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { OmokGameState } from '@/utils/webrtc'
import {
  BOARD_SIZE,
  createInitialGameState,
  checkWinner,
  checkDoubleThree,
  checkForbiddenMove
} from '@/utils/gameRules/omokRules'

// Re-export for backward compatibility
export { createInitialGameState, checkWinner, checkDoubleThree, checkForbiddenMove }
const CELL_SIZE = 32
const PADDING = 24
const STONE_RADIUS = 14
const BOARD_PIXEL_SIZE = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2

interface OmokBoardProps {
  gameState: OmokGameState
  myColor: 'black' | 'white' | null
  isMyTurn: boolean
  onMove: (x: number, y: number) => void
  disabled?: boolean
}

export default function OmokBoard({
  gameState,
  myColor,
  isMyTurn,
  onMove,
  disabled = false
}: OmokBoardProps) {
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
      const { board, lastMove, winner } = gameState

      // 배경
      ctx.fillStyle = '#DEB887'
      ctx.fillRect(0, 0, BOARD_PIXEL_SIZE, BOARD_PIXEL_SIZE)

      // 나무 질감 효과
      ctx.fillStyle = 'rgba(139, 90, 43, 0.1)'
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * BOARD_PIXEL_SIZE
        const y = Math.random() * BOARD_PIXEL_SIZE
        ctx.fillRect(x, y, Math.random() * 3, Math.random() * 20)
      }

      // 격자선
      ctx.strokeStyle = '#5D4037'
      ctx.lineWidth = 1

      for (let i = 0; i < BOARD_SIZE; i++) {
        const pos = PADDING + i * CELL_SIZE

        // 세로선
        ctx.beginPath()
        ctx.moveTo(pos, PADDING)
        ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
        ctx.stroke()

        // 가로선
        ctx.beginPath()
        ctx.moveTo(PADDING, pos)
        ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, pos)
        ctx.stroke()
      }

      // 화점 (star points)
      const starPoints = [
        [3, 3], [9, 3], [15, 3],
        [3, 9], [9, 9], [15, 9],
        [3, 15], [9, 15], [15, 15]
      ]

      ctx.fillStyle = '#5D4037'
      starPoints.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(PADDING + x * CELL_SIZE, PADDING + y * CELL_SIZE, 4, 0, Math.PI * 2)
        ctx.fill()
      })

      // 좌표 라벨
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#5D4037'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let i = 0; i < BOARD_SIZE; i++) {
        // 상단 알파벳 (A-S, I 제외)
        const letters = 'ABCDEFGHJKLMNOPQRST'
        ctx.fillText(letters[i], PADDING + i * CELL_SIZE, 10)
        // 좌측 숫자
        ctx.fillText(String(BOARD_SIZE - i), 10, PADDING + i * CELL_SIZE)
      }

      // 돌 그리기
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const stone = board[y][x]
          if (!stone) continue

          const px = PADDING + x * CELL_SIZE
          const py = PADDING + y * CELL_SIZE

          // 그림자
          ctx.beginPath()
          ctx.arc(px + 2, py + 2, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.fill()

          // 돌
          const gradient = ctx.createRadialGradient(
            px - 4, py - 4, 2,
            px, py, STONE_RADIUS
          )

          if (stone === 'black') {
            gradient.addColorStop(0, '#555')
            gradient.addColorStop(1, '#111')
          } else {
            gradient.addColorStop(0, '#fff')
            gradient.addColorStop(1, '#ccc')
          }

          ctx.beginPath()
          ctx.arc(px, py, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()

          // 마지막 착수 표시
          if (lastMove && lastMove.x === x && lastMove.y === y) {
            ctx.beginPath()
            ctx.arc(px, py, 5, 0, Math.PI * 2)
            ctx.fillStyle = stone === 'black' ? '#ff4444' : '#ff4444'
            ctx.fill()
          }
        }
      }

      // 호버 표시 (내 턴일 때만)
      if (hoverPos && isMyTurn && myColor && !winner && !disabled) {
        const { x, y } = hoverPos
        if (board[y][x] === null) {
          const px = PADDING + x * CELL_SIZE
          const py = PADDING + y * CELL_SIZE

          ctx.beginPath()
          ctx.arc(px, py, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = myColor === 'black' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)'
          ctx.fill()
          ctx.strokeStyle = myColor === 'black' ? '#333' : '#999'
          ctx.lineWidth = 2
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

    const x = Math.round((mouseX - PADDING) / CELL_SIZE)
    const y = Math.round((mouseY - PADDING) / CELL_SIZE)

    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      return { x, y }
    }
    return null
  }

  // 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const pos = getPosition(e)
    if (pos && gameState.board[pos.y][pos.x] === null) {
      onMove(pos.x, pos.y)
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
