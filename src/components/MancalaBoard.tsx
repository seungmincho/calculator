'use client'

import { useEffect, useRef } from 'react'

// 만칼라 보드: 플레이어1(아래) 6개 피트 + 스토어, 플레이어2(위) 6개 피트 + 스토어
// 인덱스: [0-5] = 플레이어1 피트, [6] = 플레이어1 스토어
//        [7-12] = 플레이어2 피트, [13] = 플레이어2 스토어

export type MancalaBoard = number[] // 14칸: 0-5(P1 pits), 6(P1 store), 7-12(P2 pits), 13(P2 store)
export type MancalaPlayer = 'player1' | 'player2'

export interface MancalaMove {
  pitIndex: number
  player: MancalaPlayer
  moveNumber: number
}

export interface MancalaGameState {
  board: MancalaBoard
  currentTurn: MancalaPlayer
  moveHistory: MancalaMove[]
  winner: MancalaPlayer | 'draw' | null
  lastMove: MancalaMove | null
  extraTurn: boolean // 마지막 돌이 자기 스토어에 들어가면 추가 턴
  capturedStones: { player: MancalaPlayer; count: number } | null // 캡처된 돌 정보
}

// 초기 게임 상태 생성
export function createInitialMancalaState(): MancalaGameState {
  // 각 피트에 4개씩, 스토어는 0개
  const board = [
    4, 4, 4, 4, 4, 4, // 플레이어1 피트 (0-5)
    0,                 // 플레이어1 스토어 (6)
    4, 4, 4, 4, 4, 4, // 플레이어2 피트 (7-12)
    0                  // 플레이어2 스토어 (13)
  ]

  return {
    board,
    currentTurn: 'player1',
    moveHistory: [],
    winner: null,
    lastMove: null,
    extraTurn: false,
    capturedStones: null
  }
}

// 플레이어의 피트 인덱스 범위
export function getPlayerPits(player: MancalaPlayer): number[] {
  return player === 'player1' ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]
}

// 플레이어의 스토어 인덱스
export function getPlayerStore(player: MancalaPlayer): number {
  return player === 'player1' ? 6 : 13
}

// 상대 플레이어의 스토어 인덱스
export function getOpponentStore(player: MancalaPlayer): number {
  return player === 'player1' ? 13 : 6
}

// 반대편 피트 인덱스 (캡처용)
export function getOppositePit(pitIndex: number): number {
  // 피트 0 <-> 12, 1 <-> 11, 2 <-> 10, 3 <-> 9, 4 <-> 8, 5 <-> 7
  return 12 - pitIndex
}

// 유효한 수인지 확인
export function isValidMove(state: MancalaGameState, pitIndex: number, player: MancalaPlayer): boolean {
  const playerPits = getPlayerPits(player)

  // 자기 피트가 아니면 불가
  if (!playerPits.includes(pitIndex)) return false

  // 돌이 없으면 불가
  if (state.board[pitIndex] === 0) return false

  // 자기 턴이 아니면 불가
  if (state.currentTurn !== player) return false

  return true
}

// 착수 실행
export function makeMancalaMove(
  state: MancalaGameState,
  pitIndex: number,
  player: MancalaPlayer
): MancalaGameState | null {
  if (!isValidMove(state, pitIndex, player)) return null

  const newBoard = [...state.board]
  let stones = newBoard[pitIndex]
  newBoard[pitIndex] = 0

  let currentIndex = pitIndex
  const opponentStore = getOpponentStore(player)

  // 돌 배분
  while (stones > 0) {
    currentIndex = (currentIndex + 1) % 14

    // 상대방 스토어는 건너뜀
    if (currentIndex === opponentStore) continue

    newBoard[currentIndex]++
    stones--
  }

  const move: MancalaMove = {
    pitIndex,
    player,
    moveNumber: state.moveHistory.length + 1
  }

  // 추가 턴 체크: 마지막 돌이 자기 스토어에 들어감
  const playerStore = getPlayerStore(player)
  const extraTurn = currentIndex === playerStore

  // 캡처 체크: 마지막 돌이 자기 빈 피트에 들어가고 반대편에 돌이 있으면
  let capturedStones: { player: MancalaPlayer; count: number } | null = null
  const playerPits = getPlayerPits(player)

  if (
    playerPits.includes(currentIndex) &&
    newBoard[currentIndex] === 1 &&
    !extraTurn
  ) {
    const oppositePit = getOppositePit(currentIndex)
    if (newBoard[oppositePit] > 0) {
      const captured = newBoard[oppositePit] + 1 // 반대편 돌 + 자기 돌
      capturedStones = { player, count: captured }
      newBoard[playerStore] += captured
      newBoard[currentIndex] = 0
      newBoard[oppositePit] = 0
    }
  }

  // 다음 턴 결정
  const nextTurn = extraTurn ? player : (player === 'player1' ? 'player2' : 'player1')

  // 게임 종료 체크
  const p1PitsEmpty = getPlayerPits('player1').every(i => newBoard[i] === 0)
  const p2PitsEmpty = getPlayerPits('player2').every(i => newBoard[i] === 0)

  let winner: MancalaPlayer | 'draw' | null = null

  if (p1PitsEmpty || p2PitsEmpty) {
    // 남은 돌을 각자 스토어로
    if (p1PitsEmpty) {
      getPlayerPits('player2').forEach(i => {
        newBoard[13] += newBoard[i]
        newBoard[i] = 0
      })
    } else {
      getPlayerPits('player1').forEach(i => {
        newBoard[6] += newBoard[i]
        newBoard[i] = 0
      })
    }

    // 승자 결정
    if (newBoard[6] > newBoard[13]) {
      winner = 'player1'
    } else if (newBoard[13] > newBoard[6]) {
      winner = 'player2'
    } else {
      winner = 'draw'
    }
  }

  return {
    board: newBoard,
    currentTurn: winner ? state.currentTurn : nextTurn,
    moveHistory: [...state.moveHistory, move],
    winner,
    lastMove: move,
    extraTurn: extraTurn && !winner,
    capturedStones
  }
}

interface MancalaBoardProps {
  gameState: MancalaGameState
  myRole: MancalaPlayer | null
  isMyTurn: boolean
  onMove: (pitIndex: number) => void
  disabled?: boolean
}

export default function MancalaBoard({
  gameState,
  myRole,
  isMyTurn,
  onMove,
  disabled = false
}: MancalaBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 보드 그리기
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 배경
    ctx.fillStyle = '#8B4513' // 나무색
    ctx.fillRect(0, 0, width, height)

    // 보드 테두리
    ctx.strokeStyle = '#5D3A1A'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, width - 4, height - 4)

    const storeWidth = 80
    const pitWidth = (width - storeWidth * 2) / 6
    const pitHeight = height / 2 - 20
    const pitRadius = Math.min(pitWidth, pitHeight) / 2 - 10

    // 스토어 그리기 (양쪽 끝)
    const drawStore = (x: number, stones: number, isPlayer1: boolean, label: string) => {
      const storeHeight = height - 40

      // 스토어 배경
      ctx.fillStyle = '#654321'
      ctx.beginPath()
      ctx.roundRect(x, 20, storeWidth - 10, storeHeight, 20)
      ctx.fill()

      // 스토어 테두리
      ctx.strokeStyle = '#3D2817'
      ctx.lineWidth = 2
      ctx.stroke()

      // 돌 개수
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(stones.toString(), x + (storeWidth - 10) / 2, height / 2)

      // 라벨
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '12px Arial'
      ctx.fillText(label, x + (storeWidth - 10) / 2, isPlayer1 ? height - 10 : 10)
    }

    // 플레이어2 스토어 (왼쪽)
    drawStore(5, gameState.board[13], false, 'P2')

    // 플레이어1 스토어 (오른쪽)
    drawStore(width - storeWidth + 5, gameState.board[6], true, 'P1')

    // 피트 그리기
    const drawPit = (index: number, x: number, y: number, stones: number, isClickable: boolean, isLastMove: boolean) => {
      // 피트 배경
      ctx.fillStyle = isLastMove ? '#7B5C3A' : '#654321'
      ctx.beginPath()
      ctx.arc(x, y, pitRadius, 0, Math.PI * 2)
      ctx.fill()

      // 클릭 가능하면 하이라이트
      if (isClickable && !disabled) {
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#3D2817'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // 돌 그리기 (간단하게 개수로 표시)
      if (stones > 0) {
        // 돌 시각화 (작은 원들)
        const positions = getStonesPositions(stones, pitRadius - 10)
        positions.forEach(pos => {
          ctx.fillStyle = '#D4A574'
          ctx.beginPath()
          ctx.arc(x + pos.x, y + pos.y, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#8B6914'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      }

      // 돌 개수 텍스트
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(stones.toString(), x, y + pitRadius + 15)
    }

    // 돌 위치 계산 (최대 12개까지 시각화)
    function getStonesPositions(count: number, radius: number): { x: number; y: number }[] {
      const positions: { x: number; y: number }[] = []
      const maxDisplay = Math.min(count, 12)

      if (maxDisplay <= 4) {
        // 2x2 그리드
        const offset = radius / 3
        const grid = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
        for (let i = 0; i < maxDisplay; i++) {
          positions.push({ x: grid[i][0] * offset, y: grid[i][1] * offset })
        }
      } else if (maxDisplay <= 9) {
        // 3x3 그리드
        const offset = radius / 2.5
        for (let i = 0; i < maxDisplay; i++) {
          const row = Math.floor(i / 3)
          const col = i % 3
          positions.push({ x: (col - 1) * offset, y: (row - 1) * offset })
        }
      } else {
        // 원형 배치
        for (let i = 0; i < maxDisplay; i++) {
          const angle = (i / maxDisplay) * Math.PI * 2 - Math.PI / 2
          const r = radius * 0.6
          positions.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r })
        }
      }

      return positions
    }

    // 플레이어2 피트 (위쪽, 오른쪽에서 왼쪽으로)
    for (let i = 0; i < 6; i++) {
      const pitIndex = 12 - i // 12, 11, 10, 9, 8, 7
      const x = storeWidth + pitWidth * i + pitWidth / 2
      const y = pitHeight / 2 + 20
      const isClickable = myRole === 'player2' && isMyTurn && gameState.board[pitIndex] > 0
      const isLastMove = gameState.lastMove?.pitIndex === pitIndex
      drawPit(pitIndex, x, y, gameState.board[pitIndex], isClickable, isLastMove)
    }

    // 플레이어1 피트 (아래쪽, 왼쪽에서 오른쪽으로)
    for (let i = 0; i < 6; i++) {
      const pitIndex = i // 0, 1, 2, 3, 4, 5
      const x = storeWidth + pitWidth * i + pitWidth / 2
      const y = height - pitHeight / 2 - 20
      const isClickable = myRole === 'player1' && isMyTurn && gameState.board[pitIndex] > 0
      const isLastMove = gameState.lastMove?.pitIndex === pitIndex
      drawPit(pitIndex, x, y, gameState.board[pitIndex], isClickable, isLastMove)
    }

  }, [gameState, myRole, isMyTurn, disabled])

  // 클릭 처리
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isMyTurn || !myRole) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const storeWidth = 80
    const pitWidth = (canvas.width - storeWidth * 2) / 6
    const pitHeight = canvas.height / 2 - 20

    // 어느 피트를 클릭했는지 확인
    const playerPits = getPlayerPits(myRole)

    for (let i = 0; i < 6; i++) {
      const pitIndex = myRole === 'player1' ? i : (12 - i)
      const pitX = storeWidth + pitWidth * i + pitWidth / 2
      const pitY = myRole === 'player1'
        ? canvas.height - pitHeight / 2 - 20
        : pitHeight / 2 + 20

      const pitRadius = Math.min(pitWidth, pitHeight) / 2 - 10
      const distance = Math.sqrt((x - pitX) ** 2 + (y - pitY) ** 2)

      if (distance <= pitRadius && playerPits.includes(pitIndex) && gameState.board[pitIndex] > 0) {
        onMove(pitIndex)
        return
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={300}
      onClick={handleClick}
      className="w-full max-w-[600px] mx-auto cursor-pointer rounded-xl shadow-lg"
      style={{ aspectRatio: '2/1' }}
    />
  )
}
