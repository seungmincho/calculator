'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, HelpCircle, BarChart3 } from 'lucide-react'
import DotsAndBoxesBoardComponent, {
  DotsAndBoxesGameState,
  createInitialDotsState,
  makeDotsMove
} from '@/components/DotsAndBoxesBoard'
import { getDotsAndBoxesAIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'

interface DotsAndBoxesAIProps {
  difficulty: Difficulty
  onBack: () => void
}

export default function DotsAndBoxesAI({ difficulty, onBack }: DotsAndBoxesAIProps) {
  const t = useTranslations('dotsAndBoxes')
  const tHub = useTranslations('gameHub')

  const [gameState, setGameState] = useState<DotsAndBoxesGameState>(createInitialDotsState())
  const [playerRole] = useState<'player1' | 'player2'>('player1') // Player is always player1
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('dotsandboxes', difficulty)

  const aiRole = playerRole === 'player1' ? 'player2' : 'player1'
  const isPlayerTurn = gameState.currentTurn === playerRole

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getDotsAndBoxesAIMove(gameState, aiRole, difficulty)
      if (move) {
        setGameState(prev => {
          const newState = makeDotsMove(prev, move.type, move.row, move.col, aiRole)
          return newState || prev
        })
      }
      setIsThinking(false)
    }, 400 + Math.random() * 400)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiRole, difficulty])

  // Update win count and record stats
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      if (gameState.winner === 'draw') {
        recordResult('draw')
      } else if (gameState.winner === playerRole) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
      }
    }
  }, [gameState.winner, playerRole, recordResult])

  // Player move
  const handleMove = useCallback((type: 'horizontal' | 'vertical', row: number, col: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    const newState = makeDotsMove(gameState, type, row, col, playerRole)
    if (newState) {
      setGameState(newState)
    }
  }, [gameState, isPlayerTurn, playerRole, isThinking])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialDotsState())
    resultRecordedRef.current = false
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw') || 'Draw!'
    if (gameState.winner === playerRole) return t('youWin') || 'You Win!'
    return t('youLose') || 'You Lose!'
  }

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return tHub('easy')
      case 'normal': return tHub('normal')
      case 'hard': return tHub('hard')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          {tHub('backToHub')}
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{tHub('vsComputer')}</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            {getDifficultyLabel(difficulty)}
          </span>
        </div>
      </div>

      {/* Score Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerRole && !gameState.winner
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-12 h-12 bg-blue-600 rounded-lg border-2 border-blue-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.scores.player1}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {tHub('you')} ({winCount.player})
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                P1 🟦
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiRole && !gameState.winner
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-12 h-12 bg-red-600 rounded-lg border-2 border-red-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.scores.player2}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                AI ({winCount.ai})
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                P2 🟥
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Turn/Status Indicator */}
      {!gameState.winner && (
        <div className={`text-center py-2 px-4 rounded-xl ${
          isPlayerTurn
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isThinking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🤔</span>
              {tHub('aiThinking')}
            </span>
          ) : gameState.lastMove?.boxesCompleted ? (
            <span className="text-yellow-600 dark:text-yellow-400">
              {gameState.lastMove.player === playerRole ? tHub('you') : 'AI'} {t('completedBox') || 'completed a box! Extra turn!'}
            </span>
          ) : (
            isPlayerTurn ? t('yourTurn') : t('opponentTurn')
          )}
        </div>
      )}

      {/* Winner Message */}
      {gameState.winner && (
        <div className={`text-center py-4 px-6 rounded-2xl ${
          gameState.winner === playerRole
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : gameState.winner === 'draw'
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}>
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="text-xl font-bold">{getWinnerMessage()}</p>
          <p className="text-sm mt-1">
            {tHub('you')}: {gameState.scores.player1} - AI: {gameState.scores.player2}
          </p>
        </div>
      )}

      {/* Game Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <DotsAndBoxesBoardComponent
          gameState={gameState}
          myRole={playerRole}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{t('boxesRemaining') || 'Boxes remaining'}: {16 - gameState.scores.player1 - gameState.scores.player2}</span>
          <span>{t('totalMoves') || 'Total moves'}: {gameState.moveHistory.length}</span>
        </div>
      </div>

      {/* Game End Buttons */}
      {gameState.winner && (
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
            {t('playAgain') || 'Play Again'}
          </button>
          <button
            onClick={onBack}
            className="py-3 px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
          >
            {tHub('backToHub')}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {tHub('myStats') || 'My Stats'}
          </span>
          <span>{showStats ? '−' : '+'}</span>
        </button>
        {showStats && stats && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalWins}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('wins') || 'Wins'}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.easy.losses + stats.normal.losses + stats.hard.losses}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('losses') || 'Losses'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.totalGames}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('totalGames') || 'Total'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>🟢 {tHub('easy')}</span>
                <span>{stats.easy.wins}W / {stats.easy.losses}L / {stats.easy.draws}D</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>🟡 {tHub('normal')}</span>
                <span>{stats.normal.wins}W / {stats.normal.losses}L / {stats.normal.draws}D</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>🔴 {tHub('hard')}</span>
                <span>{stats.hard.wins}W / {stats.hard.losses}L / {stats.hard.draws}D</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t('howToPlay') || 'How to Play'}
          </span>
          <span>{showRules ? '−' : '+'}</span>
        </button>
        {showRules && (
          <div className="mt-4 text-gray-600 dark:text-gray-400 space-y-2">
            <p>1. {t('rules.rule1') || 'Take turns drawing lines between dots.'}</p>
            <p>2. {t('rules.rule2') || 'Complete the fourth side of a box to claim it.'}</p>
            <p>3. {t('rules.rule3') || 'When you complete a box, you get another turn.'}</p>
            <p>4. {t('rules.rule4') || 'The player with the most boxes wins!'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
