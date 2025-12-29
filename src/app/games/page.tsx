'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

const GameHub = dynamic(() => import('@/components/GameHub'), { ssr: false })

// 온라인 게임 컴포넌트 동적 로드
const Omok = dynamic(() => import('@/components/Omok'), { ssr: false })
const Othello = dynamic(() => import('@/components/Othello'), { ssr: false })
const Connect4 = dynamic(() => import('@/components/Connect4'), { ssr: false })
const Checkers = dynamic(() => import('@/components/Checkers'), { ssr: false })
const Mancala = dynamic(() => import('@/components/Mancala'), { ssr: false })
const Battleship = dynamic(() => import('@/components/Battleship'), { ssr: false })
const DotsAndBoxes = dynamic(() => import('@/components/DotsAndBoxes'), { ssr: false })

// AI 게임 컴포넌트 동적 로드
const OmokAI = dynamic(() => import('@/components/games/OmokAI'), { ssr: false })
const OthelloAI = dynamic(() => import('@/components/games/OthelloAI'), { ssr: false })
const Connect4AI = dynamic(() => import('@/components/games/Connect4AI'), { ssr: false })
const CheckersAI = dynamic(() => import('@/components/games/CheckersAI'), { ssr: false })
const MancalaAI = dynamic(() => import('@/components/games/MancalaAI'), { ssr: false })
const BattleshipAI = dynamic(() => import('@/components/games/BattleshipAI'), { ssr: false })
const DotsAndBoxesAI = dynamic(() => import('@/components/games/DotsAndBoxesAI'), { ssr: false })

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { GameRoom } from '@/utils/webrtc'

type GameType = 'omok' | 'othello' | 'connect4' | 'checkers' | 'mancala' | 'battleship' | 'dotsandboxes'
type PlayMode = 'computer' | 'online'
type Difficulty = 'easy' | 'normal' | 'hard'

interface GameState {
  game: GameType
  mode: PlayMode
  difficulty?: Difficulty
  roomToJoin?: GameRoom
  isHost?: boolean
  hostPeerId?: string
  createdRoom?: GameRoom
}

function GamesContent() {
  const t = useTranslations('gameHub')
  const [gameState, setGameState] = useState<GameState | null>(null)

  const handleStartGame = (game: GameType, mode: PlayMode, difficulty?: Difficulty) => {
    setGameState({ game, mode, difficulty })
  }

  const handleJoinRoom = (game: GameType, room: GameRoom) => {
    setGameState({ game, mode: 'online', roomToJoin: room, isHost: false })
  }

  const handleCreateRoom = (game: GameType, room: GameRoom, peerId: string) => {
    setGameState({
      game,
      mode: 'online',
      isHost: true,
      hostPeerId: peerId,
      createdRoom: room
    })
  }

  const handleBackToHub = () => {
    setGameState(null)
  }

  // 게임 허브 (메인 화면)
  if (!gameState) {
    return (
      <GameHub
        onStartGame={handleStartGame}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
      />
    )
  }

  // 온라인 모드 - 기존 게임 컴포넌트 사용
  if (gameState.mode === 'online') {
    const GameComponents = {
      omok: Omok,
      othello: Othello,
      connect4: Connect4,
      checkers: Checkers,
      mancala: Mancala,
      battleship: Battleship,
      dotsandboxes: DotsAndBoxes
    }
    const GameComponent = GameComponents[gameState.game]

    // 방 입장 또는 방 생성 정보 전달
    const initialRoom = gameState.roomToJoin || gameState.createdRoom

    return (
      <div>
        <button
          onClick={handleBackToHub}
          className="mb-4 flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('backToHub')}
        </button>
        <GameComponent
          initialRoom={initialRoom}
          isHost={gameState.isHost}
          hostPeerId={gameState.hostPeerId}
          onBack={handleBackToHub}
        />
      </div>
    )
  }

  // 컴퓨터 대전 모드 - AI 게임
  const difficulty = gameState.difficulty || 'normal'

  const AIGameComponents = {
    omok: OmokAI,
    othello: OthelloAI,
    connect4: Connect4AI,
    checkers: CheckersAI,
    mancala: MancalaAI,
    battleship: BattleshipAI,
    dotsandboxes: DotsAndBoxesAI
  }

  const AIGameComponent = AIGameComponents[gameState.game]

  return <AIGameComponent difficulty={difficulty} onBack={handleBackToHub} />
}

export default function GamesPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <GamesContent />
      </Suspense>
    </div>
  )
}
