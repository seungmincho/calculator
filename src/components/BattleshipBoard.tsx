'use client'

import { useEffect, useRef } from 'react'

// 배틀십 10x10 보드
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'
export type BattleshipBoard = CellState[][]

// 함선 정보
export interface Ship {
  id: string
  name: string
  size: number
  positions: { row: number; col: number }[]
  hits: number
  sunk: boolean
}

// 함선 종류
export const SHIP_TYPES = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
]

export type BattleshipPlayer = 'player1' | 'player2'

export interface BattleshipMove {
  row: number
  col: number
  player: BattleshipPlayer
  result: 'hit' | 'miss' | 'sunk'
  moveNumber: number
}

export type GameSetupPhase = 'placing' | 'ready' | 'playing'

export interface BattleshipGameState {
  // 각 플레이어의 보드 (자기 함선 + 상대 공격 결과)
  player1Board: BattleshipBoard
  player2Board: BattleshipBoard
  // 각 플레이어의 공격 기록 보드 (상대방 보드에 대한 공격)
  player1Attacks: BattleshipBoard
  player2Attacks: BattleshipBoard
  // 함선 정보
  player1Ships: Ship[]
  player2Ships: Ship[]
  // 게임 상태
  currentTurn: BattleshipPlayer
  setupPhase: { player1: GameSetupPhase; player2: GameSetupPhase }
  moveHistory: BattleshipMove[]
  winner: BattleshipPlayer | null
  lastMove: BattleshipMove | null
}

// 빈 보드 생성
export function createEmptyBoard(): BattleshipBoard {
  return Array(10).fill(null).map(() => Array(10).fill('empty'))
}

// 초기 게임 상태 생성
export function createInitialBattleshipState(): BattleshipGameState {
  return {
    player1Board: createEmptyBoard(),
    player2Board: createEmptyBoard(),
    player1Attacks: createEmptyBoard(),
    player2Attacks: createEmptyBoard(),
    player1Ships: [],
    player2Ships: [],
    currentTurn: 'player1',
    setupPhase: { player1: 'placing', player2: 'placing' },
    moveHistory: [],
    winner: null,
    lastMove: null
  }
}

// 함선 배치가 유효한지 확인
export function canPlaceShip(
  board: BattleshipBoard,
  ships: Ship[],
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): boolean {
  // 보드 범위 체크
  if (horizontal) {
    if (col + size > 10) return false
  } else {
    if (row + size > 10) return false
  }

  // 겹침 체크
  for (let i = 0; i < size; i++) {
    const checkRow = horizontal ? row : row + i
    const checkCol = horizontal ? col + i : col

    if (board[checkRow][checkCol] !== 'empty') return false

    // 주변 칸 체크 (함선 사이 간격)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = checkRow + dr
        const nc = checkCol + dc
        if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
          if (board[nr][nc] === 'ship') return false
        }
      }
    }
  }

  return true
}

// 함선 배치
export function placeShip(
  board: BattleshipBoard,
  ships: Ship[],
  shipType: typeof SHIP_TYPES[number],
  row: number,
  col: number,
  horizontal: boolean
): { board: BattleshipBoard; ships: Ship[] } | null {
  if (!canPlaceShip(board, ships, row, col, shipType.size, horizontal)) {
    return null
  }

  const newBoard = board.map(r => [...r])
  const positions: { row: number; col: number }[] = []

  for (let i = 0; i < shipType.size; i++) {
    const placeRow = horizontal ? row : row + i
    const placeCol = horizontal ? col + i : col
    newBoard[placeRow][placeCol] = 'ship'
    positions.push({ row: placeRow, col: placeCol })
  }

  const newShip: Ship = {
    id: shipType.id,
    name: shipType.name,
    size: shipType.size,
    positions,
    hits: 0,
    sunk: false
  }

  return {
    board: newBoard,
    ships: [...ships, newShip]
  }
}

// 랜덤 배치
export function randomPlaceAllShips(): { board: BattleshipBoard; ships: Ship[] } {
  let board = createEmptyBoard()
  let ships: Ship[] = []

  for (const shipType of SHIP_TYPES) {
    let placed = false
    let attempts = 0

    while (!placed && attempts < 100) {
      const horizontal = Math.random() > 0.5
      const row = Math.floor(Math.random() * 10)
      const col = Math.floor(Math.random() * 10)

      const result = placeShip(board, ships, shipType, row, col, horizontal)
      if (result) {
        board = result.board
        ships = result.ships
        placed = true
      }
      attempts++
    }
  }

  return { board, ships }
}

// 공격 실행
export function makeAttack(
  state: BattleshipGameState,
  row: number,
  col: number,
  attacker: BattleshipPlayer
): BattleshipGameState | null {
  if (state.currentTurn !== attacker) return null
  if (state.winner) return null

  // 상대 보드 가져오기
  const defenderBoard = attacker === 'player1' ? state.player2Board : state.player1Board
  const defenderShips = attacker === 'player1' ? state.player2Ships : state.player1Ships
  const attackBoard = attacker === 'player1' ? state.player1Attacks : state.player2Attacks

  // 이미 공격한 곳인지 확인
  if (attackBoard[row][col] !== 'empty') return null

  const newState = { ...state }
  const newDefenderBoard = defenderBoard.map(r => [...r])
  const newAttackBoard = attackBoard.map(r => [...r])
  const newDefenderShips = defenderShips.map(s => ({ ...s, positions: [...s.positions] }))

  let result: 'hit' | 'miss' | 'sunk' = 'miss'
  let sunkShipName = ''

  if (defenderBoard[row][col] === 'ship') {
    // 명중
    newDefenderBoard[row][col] = 'hit'
    newAttackBoard[row][col] = 'hit'
    result = 'hit'

    // 어느 함선에 맞았는지 확인
    for (const ship of newDefenderShips) {
      const hitPos = ship.positions.find(p => p.row === row && p.col === col)
      if (hitPos) {
        ship.hits++
        if (ship.hits >= ship.size) {
          ship.sunk = true
          result = 'sunk'
          sunkShipName = ship.name
          // 침몰한 함선 표시
          ship.positions.forEach(p => {
            newDefenderBoard[p.row][p.col] = 'sunk'
            newAttackBoard[p.row][p.col] = 'sunk'
          })
        }
        break
      }
    }
  } else {
    // 빗나감
    newDefenderBoard[row][col] = 'miss'
    newAttackBoard[row][col] = 'miss'
    result = 'miss'
  }

  const move: BattleshipMove = {
    row,
    col,
    player: attacker,
    result,
    moveNumber: state.moveHistory.length + 1
  }

  // 승리 체크
  const allSunk = newDefenderShips.every(ship => ship.sunk)

  // 상태 업데이트
  if (attacker === 'player1') {
    newState.player2Board = newDefenderBoard
    newState.player1Attacks = newAttackBoard
    newState.player2Ships = newDefenderShips
  } else {
    newState.player1Board = newDefenderBoard
    newState.player2Attacks = newAttackBoard
    newState.player1Ships = newDefenderShips
  }

  newState.moveHistory = [...state.moveHistory, move]
  newState.lastMove = move
  newState.currentTurn = attacker === 'player1' ? 'player2' : 'player1'

  if (allSunk) {
    newState.winner = attacker
  }

  return newState
}

interface BattleshipBoardProps {
  board: BattleshipBoard
  ships?: Ship[]
  isOwnBoard: boolean // 자기 보드면 함선 표시, 상대 보드면 공격 결과만 표시
  isClickable: boolean
  onCellClick?: (row: number, col: number) => void
  lastMove?: BattleshipMove | null
  showShips?: boolean // 함선 위치 표시 여부
}

export default function BattleshipBoardComponent({
  board,
  ships = [],
  isOwnBoard,
  isClickable,
  onCellClick,
  lastMove,
  showShips = true
}: BattleshipBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cellSize = width / 11 // 10x10 + 좌표

    // 배경
    ctx.fillStyle = '#1a365d'
    ctx.fillRect(0, 0, width, height)

    // 그리드 그리기
    ctx.strokeStyle = '#2d4a6f'
    ctx.lineWidth = 1

    // 좌표 라벨
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 열 라벨 (A-J)
    for (let col = 0; col < 10; col++) {
      ctx.fillText(String.fromCharCode(65 + col), cellSize * (col + 1.5), cellSize / 2)
    }

    // 행 라벨 (1-10)
    for (let row = 0; row < 10; row++) {
      ctx.fillText(String(row + 1), cellSize / 2, cellSize * (row + 1.5))
    }

    // 셀 그리기
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const x = cellSize * (col + 1)
        const y = cellSize * (row + 1)
        const state = board[row][col]

        // 셀 배경
        if (state === 'hit') {
          ctx.fillStyle = '#dc2626' // 빨강
        } else if (state === 'miss') {
          ctx.fillStyle = '#475569' // 회색
        } else if (state === 'sunk') {
          ctx.fillStyle = '#7f1d1d' // 어두운 빨강
        } else if (state === 'ship' && isOwnBoard && showShips) {
          ctx.fillStyle = '#3b82f6' // 파랑 (자기 함선)
        } else {
          ctx.fillStyle = '#1e3a5f' // 바다색
        }
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

        // 마지막 공격 위치 표시
        if (lastMove && lastMove.row === row && lastMove.col === col) {
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 3
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4)
        }

        // 명중/빗나감 마커
        if (state === 'hit' || state === 'sunk') {
          // X 표시
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(x + cellSize * 0.25, y + cellSize * 0.25)
          ctx.lineTo(x + cellSize * 0.75, y + cellSize * 0.75)
          ctx.moveTo(x + cellSize * 0.75, y + cellSize * 0.25)
          ctx.lineTo(x + cellSize * 0.25, y + cellSize * 0.75)
          ctx.stroke()
        } else if (state === 'miss') {
          // 점 표시
          ctx.fillStyle = '#94a3b8'
          ctx.beginPath()
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 6, 0, Math.PI * 2)
          ctx.fill()
        }

        // 그리드 선
        ctx.strokeStyle = '#2d4a6f'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }

    // 클릭 가능 영역 표시
    if (isClickable) {
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2
      ctx.strokeRect(cellSize, cellSize, cellSize * 10, cellSize * 10)
    }

  }, [board, isOwnBoard, isClickable, lastMove, showShips])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isClickable || !onCellClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const cellSize = canvas.width / 11

    const col = Math.floor(x / cellSize) - 1
    const row = Math.floor(y / cellSize) - 1

    if (row >= 0 && row < 10 && col >= 0 && col < 10) {
      if (board[row][col] === 'empty') {
        onCellClick(row, col)
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={330}
      height={330}
      onClick={handleClick}
      className={`w-full max-w-[330px] mx-auto rounded-lg shadow-lg ${isClickable ? 'cursor-crosshair' : ''}`}
      style={{ aspectRatio: '1/1' }}
    />
  )
}

// 함선 배치용 보드 컴포넌트
interface ShipPlacementBoardProps {
  board: BattleshipBoard
  ships: Ship[]
  currentShip: typeof SHIP_TYPES[number] | null
  horizontal: boolean
  onPlaceShip: (row: number, col: number) => void
}

export function ShipPlacementBoard({
  board,
  ships,
  currentShip,
  horizontal,
  onPlaceShip
}: ShipPlacementBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cellSize = width / 11

    // 배경
    ctx.fillStyle = '#1a365d'
    ctx.fillRect(0, 0, width, height)

    // 좌표 라벨
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let col = 0; col < 10; col++) {
      ctx.fillText(String.fromCharCode(65 + col), cellSize * (col + 1.5), cellSize / 2)
    }
    for (let row = 0; row < 10; row++) {
      ctx.fillText(String(row + 1), cellSize / 2, cellSize * (row + 1.5))
    }

    // 셀 그리기
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const x = cellSize * (col + 1)
        const y = cellSize * (row + 1)
        const state = board[row][col]

        if (state === 'ship') {
          ctx.fillStyle = '#3b82f6'
        } else {
          ctx.fillStyle = '#1e3a5f'
        }
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)

        ctx.strokeStyle = '#2d4a6f'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, cellSize, cellSize)
      }
    }

    // 호버 미리보기
    if (currentShip && hoverPos) {
      const canPlace = canPlaceShip(board, ships, hoverPos.row, hoverPos.col, currentShip.size, horizontal)

      for (let i = 0; i < currentShip.size; i++) {
        const previewRow = horizontal ? hoverPos.row : hoverPos.row + i
        const previewCol = horizontal ? hoverPos.col + i : hoverPos.col

        if (previewRow < 10 && previewCol < 10) {
          const x = cellSize * (previewCol + 1)
          const y = cellSize * (previewRow + 1)

          ctx.fillStyle = canPlace ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }
      }
    }

  }, [board, ships, currentShip, horizontal, hoverPos])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentShip) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const cellSize = canvas.width / 11
    const col = Math.floor(x / cellSize) - 1
    const row = Math.floor(y / cellSize) - 1

    if (row >= 0 && row < 10 && col >= 0 && col < 10) {
      setHoverPos({ row, col })
    } else {
      setHoverPos(null)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentShip || !hoverPos) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const cellSize = canvas.width / 11
    const col = Math.floor(x / cellSize) - 1
    const row = Math.floor(y / cellSize) - 1

    if (row >= 0 && row < 10 && col >= 0 && col < 10) {
      onPlaceShip(row, col)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={330}
      height={330}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPos(null)}
      onClick={handleClick}
      className="w-full max-w-[330px] mx-auto cursor-pointer rounded-lg shadow-lg"
      style={{ aspectRatio: '1/1' }}
    />
  )
}

import { useState } from 'react'
