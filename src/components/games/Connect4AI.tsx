'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, HelpCircle, BarChart3, Undo2 } from 'lucide-react'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import Connect4BoardComponent, {
  Connect4Cell,
  Connect4GameState,
  createInitialConnect4State,
  makeConnect4Move
} from '@/components/Connect4Board'
import { getConnect4AIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface Connect4AIProps {
  difficulty: Difficulty
  onBack: () => void
}

export default function Connect4AI({ difficulty, onBack }: Connect4AIProps) {
  const t = useTranslations('connect4')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<Connect4GameState>(createInitialConnect4State())
  const [playerColor] = useState<'red' | 'yellow'>('red') // Player is always red (first)
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('connect4', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, playDraw, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiColor = playerColor === 'red' ? 'yellow' : 'red'
  const isPlayerTurn = gameState.currentTurn === playerColor

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const col = getConnect4AIMove(gameState, aiColor, difficulty)
      if (col !== -1) {
        setGameState(prev => {
          const newState = makeConnect4Move(prev, col, aiColor)
          return newState || prev
        })
        playMove()
      }
      setIsThinking(false)
    }, 500 + Math.random() * 500) // Random delay for natural feel

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiColor, difficulty])

  // Update win count and record stats
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      if (gameState.winner === 'draw') {
        recordResult('draw')
        recordGameResult({
          gameType: 'connect4',
          result: 'draw',
          difficulty,
          moves: gameState.moveHistory.length
        })
        playDraw()
      } else if (gameState.winner === playerColor) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
        recordGameResult({
          gameType: 'connect4',
          result: 'win',
          difficulty,
          moves: gameState.moveHistory.length
        })
        playWin()
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
        recordGameResult({
          gameType: 'connect4',
          result: 'loss',
          difficulty,
          moves: gameState.moveHistory.length
        })
        playLose()
      }
    }
  }, [gameState.winner, gameState.moveHistory.length, playerColor, difficulty, recordResult, recordGameResult, playWin, playLose, playDraw])

  // Player move
  const handleMove = useCallback((col: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    const newState = makeConnect4Move(gameState, col, playerColor)
    if (newState) {
      setGameState(newState)
      playMove()
    }
  }, [gameState, isPlayerTurn, playerColor, isThinking, playMove])

  // Undo last 2 moves (only on easy difficulty)
  const handleUndo = useCallback(() => {
    if (difficulty !== 'easy' || gameState.moveHistory.length < 2 || gameState.winner) return
    setGameState(prev => {
      const newHistory = prev.moveHistory.slice(0, -2)
      // Rebuild board from history
      const newBoard: Connect4Cell[][] = Array(6).fill(null).map(() => Array(7).fill(null))
      for (const move of newHistory) {
        newBoard[move.row][move.col] = move.player
      }
      const lastMove = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null
      return {
        ...prev,
        board: newBoard,
        currentTurn: playerColor, // back to player's turn
        moveHistory: newHistory,
        winner: null,
        lastMove,
        winningCells: []
      }
    })
  }, [difficulty, gameState.moveHistory.length, gameState.winner, playerColor])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialConnect4State())
    resultRecordedRef.current = false
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw') || 'Draw!'
    if (gameState.winner === playerColor) return t('youWin') || 'You Win!'
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
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Score Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerColor && !gameState.winner
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-red-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{winCount.player}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {tHub('you')}
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {t('red') || 'Red'}
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiColor && !gameState.winner
              ? 'bg-yellow-400 text-gray-900'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center">
              <span className="text-gray-900 font-bold">{winCount.ai}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                AI
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                {t('yellow') || 'Yellow'}
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
          ) : (
            isPlayerTurn ? t('yourTurn') : t('opponentTurn')
          )}
        </div>
      )}

      {/* Winner Message */}
      {gameState.winner && (
        <div className={`text-center py-6 px-6 rounded-2xl ${
          gameState.winner === playerColor
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : gameState.winner === 'draw'
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <p className="text-2xl font-bold mb-1">{getWinnerMessage()}</p>
          <p className="text-sm opacity-80">{gameState.moveHistory.length} {t('moves') || 'moves'} · {getDifficultyLabel(difficulty)}</p>
        </div>
      )}
      <GameConfetti active={!!gameState.winner && gameState.winner === playerColor} />

      {/* Game Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <Connect4BoardComponent
          gameState={gameState}
          myColor={playerColor}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
      </div>

      {/* Move Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('moves') || 'Moves'}: {gameState.moveHistory.length}
          </div>
          {difficulty === 'easy' && !gameState.winner && isPlayerTurn && gameState.moveHistory.length >= 2 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/40 rounded-lg transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              {tSounds('undo')}
            </button>
          )}
        </div>
      </div>

      {/* Game End Buttons */}
      {gameState.winner && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
            {t('playAgain')}
          </button>
          <GameResultShare
            gameName={t('title') || '사목'}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            moves={gameState.moveHistory.length}
            url="https://toolhub.ai.kr/connect4"
          />
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

      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
      />

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
            <p>1. {t('rules.rule1') || 'Players take turns dropping colored discs into a 7-column, 6-row grid.'}</p>
            <p>2. {t('rules.rule2') || 'Discs fall to the lowest available space in the column.'}</p>
            <p>3. {t('rules.rule3') || 'First player to connect 4 discs in a row (horizontally, vertically, or diagonally) wins!'}</p>
            <p>4. {t('rules.rule4') || 'If the board fills up with no winner, the game is a draw.'}</p>
          </div>
        )}
      </div>

      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
