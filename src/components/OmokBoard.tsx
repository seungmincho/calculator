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
  const [keyboardPos, setKeyboardPos] = useState<{ x: number; y: number } | null>(null)
  const [useKeyboard, setUseKeyboard] = useState(false)

  // Pre-generate wood texture positions to avoid flickering on redraw
  const woodTextureRef = useRef<{ x: number; y: number; w: number; h: number }[]>(
    Array.from({ length: 50 }, () => ({
      x: Math.random() * BOARD_PIXEL_SIZE,
      y: Math.random() * BOARD_PIXEL_SIZE,
      w: Math.random() * 3,
      h: Math.random() * 20
    }))
  )

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

      // 나무 질감 효과 (pre-generated positions to prevent flickering)
      ctx.fillStyle = 'rgba(139, 90, 43, 0.1)'
      for (const t of woodTextureRef.current!) {
        ctx.fillRect(t.x, t.y, t.w, t.h)
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
            ctx.fillStyle = stone === 'black' ? '#ff4444' : '#1565C0'
            ctx.fill()
          }

        }
      }

      // 호버 표시 (내 턴일 때만)
      const showPos = useKeyboard ? keyboardPos : hoverPos
      if (showPos && isMyTurn && myColor && !winner && !disabled) {
        const { x, y } = showPos
        if (board[y][x] === null) {
          const px = PADDING + x * CELL_SIZE
          const py = PADDING + y * CELL_SIZE

          ctx.beginPath()
          ctx.arc(px, py, STONE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = myColor === 'black' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)'
          ctx.fill()
          ctx.strokeStyle = useKeyboard ? '#FFC107' : (myColor === 'black' ? '#333' : '#999')
          ctx.lineWidth = useKeyboard ? 3 : 2
          ctx.stroke()
        }
      }
    },
    [gameState, hoverPos, keyboardPos, useKeyboard, isMyTurn, myColor, disabled]
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

  // 키보드 처리
  const keyboardPosRef = useRef(keyboardPos)
  keyboardPosRef.current = keyboardPos

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const key = e.key
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(key)) {
      e.preventDefault()
      setUseKeyboard(true)

      const pos = keyboardPosRef.current || { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) }

      if (key === 'Enter' || key === ' ') {
        if (gameState.board[pos.y][pos.x] === null) {
          onMove(pos.x, pos.y)
        }
      } else {
        let newPos = pos
        switch (key) {
          case 'ArrowUp': newPos = { x: pos.x, y: Math.max(0, pos.y - 1) }; break
          case 'ArrowDown': newPos = { x: pos.x, y: Math.min(BOARD_SIZE - 1, pos.y + 1) }; break
          case 'ArrowLeft': newPos = { x: Math.max(0, pos.x - 1), y: pos.y }; break
          case 'ArrowRight': newPos = { x: Math.min(BOARD_SIZE - 1, pos.x + 1), y: pos.y }; break
        }
        setKeyboardPos(newPos)
      }
    }
  }, [disabled, isMyTurn, myColor, gameState.winner, gameState.board, onMove])

  // Switch back to mouse mode on mouse move
  const handleMouseMoveWrapped = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setUseKeyboard(false)
    handleMouseMove(e)
  }

  // 터치 위치를 보드 좌표로 변환
  const getTouchPosition = (e: React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_PIXEL_SIZE / rect.width
    const scaleY = BOARD_PIXEL_SIZE / rect.height

    const touchX = (touch.clientX - rect.left) * scaleX
    const touchY = (touch.clientY - rect.top) * scaleY

    const x = Math.round((touchX - PADDING) / CELL_SIZE)
    const y = Math.round((touchY - PADDING) / CELL_SIZE)

    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      return { x, y }
    }
    return null
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        width={BOARD_PIXEL_SIZE}
        height={BOARD_PIXEL_SIZE}
        tabIndex={0}
        aria-label="Omok game board"
        role="grid"
        style={{
          width: BOARD_PIXEL_SIZE * scale,
          height: BOARD_PIXEL_SIZE * scale,
          cursor: isMyTurn && myColor && !gameState.winner && !disabled ? 'pointer' : 'default',
          outline: 'none',
          touchAction: 'none'
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMoveWrapped}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onTouchStart={(e) => {
          e.preventDefault()
          setUseKeyboard(false)
          const pos = getTouchPosition(e)
          if (pos) setHoverPos(pos)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          const pos = getTouchPosition(e)
          if (pos) setHoverPos(pos)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          const pos = getTouchPosition(e)
          if (pos) {
            if (!disabled && isMyTurn && myColor && !gameState.winner) {
              if (gameState.board[pos.y][pos.x] === null) {
                onMove(pos.x, pos.y)
              }
            }
          }
          setHoverPos(null)
        }}
        className="rounded-lg shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      />
    </div>
  )
}
