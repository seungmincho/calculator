'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const BOARD_SIZE = 8
const CELL_SIZE = 60
const PADDING = 20
const PIECE_RADIUS = 22
const BOARD_PIXEL_SIZE = CELL_SIZE * BOARD_SIZE + PADDING * 2

export type CheckersPiece = { color: 'red' | 'black'; isKing: boolean } | null
export type CheckersBoard = CheckersPiece[][]

export interface CheckersMove {
  from: { row: number; col: number }
  to: { row: number; col: number }
  captured?: { row: number; col: number }[]
  player: 'red' | 'black'
  becameKing?: boolean
}

export interface CheckersGameState {
  board: CheckersBoard
  currentTurn: 'red' | 'black'
  moveHistory: CheckersMove[]
  winner: 'red' | 'black' | 'draw' | null
  lastMove: CheckersMove | null
  selectedPiece: { row: number; col: number } | null
  validMoves: { row: number; col: number; captures?: { row: number; col: number }[] }[]
  redCount: number
  blackCount: number
  mustCapture: boolean
}

interface CheckersBoardProps {
  gameState: CheckersGameState
  myColor: 'red' | 'black' | null
  isMyTurn: boolean
  onSelectPiece: (row: number, col: number) => void
  onMove: (toRow: number, toCol: number) => void
  disabled?: boolean
}

export default function CheckersBoardComponent({
  gameState,
  myColor,
  isMyTurn,
  onSelectPiece,
  onMove,
  disabled = false
}: CheckersBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)

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
      const { board, selectedPiece, validMoves, lastMove, winner } = gameState

      // 배경
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(0, 0, BOARD_PIXEL_SIZE, BOARD_PIXEL_SIZE)

      // 체크무늬
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const px = PADDING + col * CELL_SIZE
          const py = PADDING + row * CELL_SIZE
          const isDark = (row + col) % 2 === 1

          ctx.fillStyle = isDark ? '#5D4037' : '#D7CCC8'
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)

          // 마지막 이동 하이라이트
          if (lastMove) {
            if ((lastMove.from.row === row && lastMove.from.col === col) ||
                (lastMove.to.row === row && lastMove.to.col === col)) {
              ctx.fillStyle = 'rgba(255, 235, 59, 0.4)'
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
            }
          }

          // 선택된 말 하이라이트
          if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.5)'
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
          }

          // 유효한 이동 표시
          if (validMoves.some(m => m.row === row && m.col === col)) {
            const centerX = px + CELL_SIZE / 2
            const centerY = py + CELL_SIZE / 2
            ctx.beginPath()
            ctx.arc(centerX, centerY, 10, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(76, 175, 80, 0.7)'
            ctx.fill()
          }
        }
      }

      // 좌표
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = '#FFF8E1'
      ctx.textAlign = 'center'
      for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.fillText(String(8 - i), 8, PADDING + i * CELL_SIZE + CELL_SIZE / 2 + 4)
        ctx.fillText(String.fromCharCode(65 + i), PADDING + i * CELL_SIZE + CELL_SIZE / 2, BOARD_PIXEL_SIZE - 5)
      }

      // 말 그리기
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col]
          if (!piece) continue

          const centerX = PADDING + col * CELL_SIZE + CELL_SIZE / 2
          const centerY = PADDING + row * CELL_SIZE + CELL_SIZE / 2

          // 그림자
          ctx.beginPath()
          ctx.arc(centerX + 2, centerY + 2, PIECE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.fill()

          // 말
          const gradient = ctx.createRadialGradient(
            centerX - 6, centerY - 6, 2,
            centerX, centerY, PIECE_RADIUS
          )

          if (piece.color === 'red') {
            gradient.addColorStop(0, '#EF5350')
            gradient.addColorStop(1, '#B71C1C')
          } else {
            gradient.addColorStop(0, '#424242')
            gradient.addColorStop(1, '#1A1A1A')
          }

          ctx.beginPath()
          ctx.arc(centerX, centerY, PIECE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()

          // 테두리
          ctx.strokeStyle = piece.color === 'red' ? '#7F0000' : '#000'
          ctx.lineWidth = 2
          ctx.stroke()

          // 킹 표시
          if (piece.isKing) {
            ctx.fillStyle = '#FFD700'
            ctx.font = 'bold 20px serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('♔', centerX, centerY + 2)
          }
        }
      }

      // 호버 표시
      if (hoverPos && isMyTurn && myColor && !winner && !disabled) {
        const piece = board[hoverPos.row][hoverPos.col]
        const isValidMove = validMoves.some(m => m.row === hoverPos.row && m.col === hoverPos.col)

        if (piece?.color === myColor || isValidMove) {
          const px = PADDING + hoverPos.col * CELL_SIZE
          const py = PADDING + hoverPos.row * CELL_SIZE
          ctx.strokeStyle = '#4CAF50'
          ctx.lineWidth = 3
          ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4)
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

  // 위치 계산
  const getPosition = (e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_PIXEL_SIZE / rect.width
    const scaleY = BOARD_PIXEL_SIZE / rect.height

    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const col = Math.floor((mouseX - PADDING) / CELL_SIZE)
    const row = Math.floor((mouseY - PADDING) / CELL_SIZE)

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col }
    }
    return null
  }

  // 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myColor || gameState.winner) return

    const pos = getPosition(e)
    if (!pos) return

    const { row, col } = pos
    const piece = gameState.board[row][col]

    // 유효한 이동 위치를 클릭한 경우
    if (gameState.validMoves.some(m => m.row === row && m.col === col)) {
      onMove(row, col)
      return
    }

    // 내 말을 클릭한 경우
    if (piece && piece.color === myColor) {
      onSelectPiece(row, col)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoverPos(getPosition(e))
  }

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

// 초기 보드 생성
export const createInitialCheckersState = (): CheckersGameState => {
  const board: CheckersBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))

  // 검정 말 배치 (상단 3줄)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', isKing: false }
      }
    }
  }

  // 빨강 말 배치 (하단 3줄)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', isKing: false }
      }
    }
  }

  return {
    board,
    currentTurn: 'red',
    moveHistory: [],
    winner: null,
    lastMove: null,
    selectedPiece: null,
    validMoves: [],
    redCount: 12,
    blackCount: 12,
    mustCapture: false
  }
}

// 특정 말의 유효한 이동 계산
export const getValidMovesForPiece = (
  board: CheckersBoard,
  row: number,
  col: number
): { row: number; col: number; captures?: { row: number; col: number }[] }[] => {
  const piece = board[row][col]
  if (!piece) return []

  const moves: { row: number; col: number; captures?: { row: number; col: number }[] }[] = []
  const directions = piece.isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.color === 'red'
    ? [[-1, -1], [-1, 1]]  // 빨강은 위로
    : [[1, -1], [1, 1]]    // 검정은 아래로

  // 캡처 이동 체크
  for (const [dr, dc] of directions) {
    const jumpRow = row + dr * 2
    const jumpCol = col + dc * 2
    const midRow = row + dr
    const midCol = col + dc

    if (jumpRow >= 0 && jumpRow < BOARD_SIZE && jumpCol >= 0 && jumpCol < BOARD_SIZE) {
      const midPiece = board[midRow][midCol]
      if (midPiece && midPiece.color !== piece.color && !board[jumpRow][jumpCol]) {
        moves.push({ row: jumpRow, col: jumpCol, captures: [{ row: midRow, col: midCol }] })
      }
    }
  }

  // 캡처가 가능하면 일반 이동은 불가
  if (moves.length > 0) return moves

  // 일반 이동 체크
  for (const [dr, dc] of directions) {
    const newRow = row + dr
    const newCol = col + dc

    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (!board[newRow][newCol]) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }

  return moves
}

// 플레이어의 모든 유효한 이동 계산
export const getAllValidMoves = (
  board: CheckersBoard,
  player: 'red' | 'black'
): { from: { row: number; col: number }; moves: { row: number; col: number; captures?: { row: number; col: number }[] }[] }[] => {
  const allMoves: { from: { row: number; col: number }; moves: { row: number; col: number; captures?: { row: number; col: number }[] }[] }[] = []
  let hasCapture = false

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece && piece.color === player) {
        const moves = getValidMovesForPiece(board, row, col)
        if (moves.length > 0) {
          const hasCaptureMoves = moves.some(m => m.captures && m.captures.length > 0)
          if (hasCaptureMoves) hasCapture = true
          allMoves.push({ from: { row, col }, moves })
        }
      }
    }
  }

  // 캡처가 가능하면 캡처만 허용
  if (hasCapture) {
    return allMoves.map(item => ({
      ...item,
      moves: item.moves.filter(m => m.captures && m.captures.length > 0)
    })).filter(item => item.moves.length > 0)
  }

  return allMoves
}

// 말 개수 세기
export const countPieces = (board: CheckersBoard): { red: number; black: number } => {
  let red = 0, black = 0
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece) {
        if (piece.color === 'red') red++
        else black++
      }
    }
  }
  return { red, black }
}

// 이동 수행
export const makeCheckersMove = (
  state: CheckersGameState,
  toRow: number,
  toCol: number
): CheckersGameState | null => {
  const { board, selectedPiece, currentTurn } = state
  if (!selectedPiece) return null

  const validMove = state.validMoves.find(m => m.row === toRow && m.col === toCol)
  if (!validMove) return null

  const piece = board[selectedPiece.row][selectedPiece.col]
  if (!piece) return null

  // 보드 복사
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null))

  // 이동
  newBoard[toRow][toCol] = { ...piece }
  newBoard[selectedPiece.row][selectedPiece.col] = null

  // 캡처
  if (validMove.captures) {
    for (const cap of validMove.captures) {
      newBoard[cap.row][cap.col] = null
    }
  }

  // 킹 승격
  let becameKing = false
  if (!piece.isKing) {
    if ((piece.color === 'red' && toRow === 0) || (piece.color === 'black' && toRow === 7)) {
      newBoard[toRow][toCol]!.isKing = true
      becameKing = true
    }
  }

  const move: CheckersMove = {
    from: selectedPiece,
    to: { row: toRow, col: toCol },
    captured: validMove.captures,
    player: currentTurn,
    becameKing
  }

  const { red, black } = countPieces(newBoard)
  const nextPlayer = currentTurn === 'red' ? 'black' : 'red'

  // 연속 캡처 체크 (킹이 된 경우는 연속 캡처 불가)
  if (validMove.captures && !becameKing) {
    const moreMoves = getValidMovesForPiece(newBoard, toRow, toCol)
    const hasMoreCaptures = moreMoves.some(m => m.captures && m.captures.length > 0)

    if (hasMoreCaptures) {
      return {
        board: newBoard,
        currentTurn,
        moveHistory: [...state.moveHistory, move],
        winner: null,
        lastMove: move,
        selectedPiece: { row: toRow, col: toCol },
        validMoves: moreMoves.filter(m => m.captures && m.captures.length > 0),
        redCount: red,
        blackCount: black,
        mustCapture: true
      }
    }
  }

  // 승자 체크
  let winner: 'red' | 'black' | null = null
  if (red === 0) winner = 'black'
  else if (black === 0) winner = 'red'
  else {
    const nextMoves = getAllValidMoves(newBoard, nextPlayer)
    if (nextMoves.length === 0) winner = currentTurn
  }

  return {
    board: newBoard,
    currentTurn: nextPlayer,
    moveHistory: [...state.moveHistory, move],
    winner,
    lastMove: move,
    selectedPiece: null,
    validMoves: [],
    redCount: red,
    blackCount: black,
    mustCapture: false
  }
}
