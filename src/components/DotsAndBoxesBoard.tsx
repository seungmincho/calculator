'use client'

import { useEffect, useRef } from 'react'

// 도트앤박스: 점을 연결해서 사각형 만들기
// 5x5 점 그리드 = 4x4 박스

export type LineState = null | 'player1' | 'player2'
export type BoxOwner = null | 'player1' | 'player2'
export type DotsPlayer = 'player1' | 'player2'

export interface DotsAndBoxesMove {
  type: 'horizontal' | 'vertical'
  row: number
  col: number
  player: DotsPlayer
  moveNumber: number
  boxesCompleted: number
}

export interface DotsAndBoxesGameState {
  // 가로선: 5행 x 4열 (각 행의 점 사이)
  horizontalLines: LineState[][]
  // 세로선: 4행 x 5열 (각 열의 점 사이)
  verticalLines: LineState[][]
  // 박스 소유자: 4x4
  boxes: BoxOwner[][]
  currentTurn: DotsPlayer
  moveHistory: DotsAndBoxesMove[]
  winner: DotsPlayer | 'draw' | null
  lastMove: DotsAndBoxesMove | null
  scores: { player1: number; player2: number }
}

const GRID_SIZE = 5 // 5x5 점 = 4x4 박스

// 초기 게임 상태
export function createInitialDotsState(): DotsAndBoxesGameState {
  return {
    horizontalLines: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(null)),
    verticalLines: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(null)),
    boxes: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(null)),
    currentTurn: 'player1',
    moveHistory: [],
    winner: null,
    lastMove: null,
    scores: { player1: 0, player2: 0 }
  }
}

// 박스가 완성되었는지 확인
function checkBox(
  horizontalLines: LineState[][],
  verticalLines: LineState[][],
  row: number,
  col: number
): boolean {
  // 박스의 4변이 모두 그려져 있는지 확인
  const top = horizontalLines[row][col]
  const bottom = horizontalLines[row + 1][col]
  const left = verticalLines[row][col]
  const right = verticalLines[row][col + 1]

  return top !== null && bottom !== null && left !== null && right !== null
}

// 선 그리기
export function makeDotsMove(
  state: DotsAndBoxesGameState,
  type: 'horizontal' | 'vertical',
  row: number,
  col: number,
  player: DotsPlayer
): DotsAndBoxesGameState | null {
  if (state.winner) return null
  if (state.currentTurn !== player) return null

  // 이미 그려진 선인지 확인
  if (type === 'horizontal') {
    if (state.horizontalLines[row][col] !== null) return null
  } else {
    if (state.verticalLines[row][col] !== null) return null
  }

  // 새로운 상태 복사
  const newHorizontal = state.horizontalLines.map(r => [...r])
  const newVertical = state.verticalLines.map(r => [...r])
  const newBoxes = state.boxes.map(r => [...r])

  // 선 그리기
  if (type === 'horizontal') {
    newHorizontal[row][col] = player
  } else {
    newVertical[row][col] = player
  }

  // 완성된 박스 확인
  let boxesCompleted = 0

  if (type === 'horizontal') {
    // 가로선 위 박스 확인 (row > 0)
    if (row > 0 && checkBox(newHorizontal, newVertical, row - 1, col)) {
      if (newBoxes[row - 1][col] === null) {
        newBoxes[row - 1][col] = player
        boxesCompleted++
      }
    }
    // 가로선 아래 박스 확인 (row < GRID_SIZE - 1)
    if (row < GRID_SIZE - 1 && checkBox(newHorizontal, newVertical, row, col)) {
      if (newBoxes[row][col] === null) {
        newBoxes[row][col] = player
        boxesCompleted++
      }
    }
  } else {
    // 세로선 왼쪽 박스 확인 (col > 0)
    if (col > 0 && checkBox(newHorizontal, newVertical, row, col - 1)) {
      if (newBoxes[row][col - 1] === null) {
        newBoxes[row][col - 1] = player
        boxesCompleted++
      }
    }
    // 세로선 오른쪽 박스 확인 (col < GRID_SIZE - 1)
    if (col < GRID_SIZE - 1 && checkBox(newHorizontal, newVertical, row, col)) {
      if (newBoxes[row][col] === null) {
        newBoxes[row][col] = player
        boxesCompleted++
      }
    }
  }

  // 점수 계산
  const newScores = {
    player1: newBoxes.flat().filter(b => b === 'player1').length,
    player2: newBoxes.flat().filter(b => b === 'player2').length
  }

  const move: DotsAndBoxesMove = {
    type,
    row,
    col,
    player,
    moveNumber: state.moveHistory.length + 1,
    boxesCompleted
  }

  // 게임 종료 확인
  const totalBoxes = (GRID_SIZE - 1) * (GRID_SIZE - 1)
  let winner: DotsPlayer | 'draw' | null = null

  if (newScores.player1 + newScores.player2 === totalBoxes) {
    if (newScores.player1 > newScores.player2) {
      winner = 'player1'
    } else if (newScores.player2 > newScores.player1) {
      winner = 'player2'
    } else {
      winner = 'draw'
    }
  }

  // 다음 턴 (박스를 완성하면 추가 턴)
  const nextTurn = boxesCompleted > 0 ? player : (player === 'player1' ? 'player2' : 'player1')

  return {
    horizontalLines: newHorizontal,
    verticalLines: newVertical,
    boxes: newBoxes,
    currentTurn: winner ? state.currentTurn : nextTurn,
    moveHistory: [...state.moveHistory, move],
    winner,
    lastMove: move,
    scores: newScores
  }
}

interface DotsAndBoxesBoardProps {
  gameState: DotsAndBoxesGameState
  myRole: DotsPlayer | null
  isMyTurn: boolean
  onMove: (type: 'horizontal' | 'vertical', row: number, col: number) => void
  disabled?: boolean
}

export default function DotsAndBoxesBoard({
  gameState,
  myRole,
  isMyTurn,
  onMove,
  disabled = false
}: DotsAndBoxesBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40
    const cellSize = (width - padding * 2) / (GRID_SIZE - 1)
    const dotRadius = 8
    const lineWidth = 6

    // 배경
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    // 박스 그리기
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        const owner = gameState.boxes[row][col]
        if (owner) {
          const x = padding + col * cellSize
          const y = padding + row * cellSize

          ctx.fillStyle = owner === 'player1' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'
          ctx.fillRect(x, y, cellSize, cellSize)

          // 이니셜 표시
          ctx.fillStyle = owner === 'player1' ? '#3b82f6' : '#ef4444'
          ctx.font = 'bold 24px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(owner === 'player1' ? 'P1' : 'P2', x + cellSize / 2, y + cellSize / 2)
        }
      }
    }

    // 가로선 그리기
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        const x1 = padding + col * cellSize
        const y = padding + row * cellSize
        const x2 = x1 + cellSize

        const lineState = gameState.horizontalLines[row][col]
        const isLastMove = gameState.lastMove?.type === 'horizontal' &&
          gameState.lastMove?.row === row && gameState.lastMove?.col === col

        if (lineState) {
          ctx.strokeStyle = lineState === 'player1' ? '#3b82f6' : '#ef4444'
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(x1, y)
          ctx.lineTo(x2, y)
          ctx.stroke()

          if (isLastMove) {
            ctx.strokeStyle = '#fbbf24'
            ctx.lineWidth = lineWidth + 4
            ctx.globalAlpha = 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        } else if (!disabled && isMyTurn) {
          // 클릭 가능한 영역 표시
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)'
          ctx.lineWidth = lineWidth
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(x1, y)
          ctx.lineTo(x2, y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // 세로선 그리기
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = padding + col * cellSize
        const y1 = padding + row * cellSize
        const y2 = y1 + cellSize

        const lineState = gameState.verticalLines[row][col]
        const isLastMove = gameState.lastMove?.type === 'vertical' &&
          gameState.lastMove?.row === row && gameState.lastMove?.col === col

        if (lineState) {
          ctx.strokeStyle = lineState === 'player1' ? '#3b82f6' : '#ef4444'
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(x, y1)
          ctx.lineTo(x, y2)
          ctx.stroke()

          if (isLastMove) {
            ctx.strokeStyle = '#fbbf24'
            ctx.lineWidth = lineWidth + 4
            ctx.globalAlpha = 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        } else if (!disabled && isMyTurn) {
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)'
          ctx.lineWidth = lineWidth
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(x, y1)
          ctx.lineTo(x, y2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // 점 그리기
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = padding + col * cellSize
        const y = padding + row * cellSize

        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

  }, [gameState, isMyTurn, disabled])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myRole) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const padding = 40
    const cellSize = (canvas.width - padding * 2) / (GRID_SIZE - 1)
    const hitDistance = 20

    // 가로선 클릭 확인
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        if (gameState.horizontalLines[row][col] !== null) continue

        const lineX1 = padding + col * cellSize
        const lineX2 = lineX1 + cellSize
        const lineY = padding + row * cellSize

        // 선의 중심점과의 거리
        const centerX = (lineX1 + lineX2) / 2
        if (Math.abs(x - centerX) < cellSize / 2 && Math.abs(y - lineY) < hitDistance) {
          onMove('horizontal', row, col)
          return
        }
      }
    }

    // 세로선 클릭 확인
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (gameState.verticalLines[row][col] !== null) continue

        const lineX = padding + col * cellSize
        const lineY1 = padding + row * cellSize
        const lineY2 = lineY1 + cellSize

        const centerY = (lineY1 + lineY2) / 2
        if (Math.abs(x - lineX) < hitDistance && Math.abs(y - centerY) < cellSize / 2) {
          onMove('vertical', row, col)
          return
        }
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      onClick={handleClick}
      className={`w-full max-w-[400px] mx-auto rounded-xl shadow-lg ${!disabled && isMyTurn ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio: '1/1' }}
    />
  )
}
