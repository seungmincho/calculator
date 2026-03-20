'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, HelpCircle, BarChart3, Undo2, RotateCw } from 'lucide-react'
import ChessBoardComponent from '@/components/ChessBoard'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import {
  ChessState,
  ChessMove,
  Color,
  createInitialState,
  applyMove,
  checkGameOver,
  getChessAIMove,
  getLegalMoves,
} from '@/utils/gameAI/chessAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

type Difficulty = 'easy' | 'normal' | 'hard'

interface ChessAIProps {
  difficulty: Difficulty
  onBack: () => void
}

export default function ChessAI({ difficulty, onBack }: ChessAIProps) {
  const t = useTranslations('chess')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<ChessState>(createInitialState())
  const [playerColor] = useState<Color>('w')
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const [flipped, setFlipped] = useState(false)
  const resultRecordedRef = useRef(false)

  const { stats, recordResult } = useAIGameStats('chess', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, playDraw, playInvalid, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiColor: Color = playerColor === 'w' ? 'b' : 'w'
  const isPlayerTurn = gameState.currentTurn === playerColor

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getChessAIMove(gameState, aiColor, difficulty)
      if (move) {
        setGameState(prev => {
          const newState = applyMove(prev, move)
          return checkGameOver(newState)
        })
        playMove()
      }
      setIsThinking(false)
    }, 400 + Math.random() * 600)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiColor, difficulty, playMove])

  // Record results
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true

      if (gameState.winner === 'draw') {
        recordResult('draw')
        playDraw()
      } else if (gameState.winner === playerColor) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
        playWin()
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
        playLose()
      }
      recordGameResult({
        gameType: 'chess',
        result: gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss',
        difficulty,
        moves: gameState.moveHistory.length,
      })
    }
  }, [gameState.winner, gameState.moveHistory.length, playerColor, recordResult, recordGameResult, difficulty, playWin, playLose, playDraw])

  // Player move
  const handleMove = useCallback((move: ChessMove) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    setGameState(prev => {
      const newState = applyMove(prev, move)
      return checkGameOver(newState)
    })
    playMove()
  }, [isPlayerTurn, gameState.winner, isThinking, playMove])

  // Undo (Easy mode: undo 2 moves to get back to player's turn)
  const handleUndo = useCallback(() => {
    if (difficulty !== 'easy' || gameState.moveHistory.length < 2 || gameState.winner || isThinking) return

    // Replay all moves except last 2
    let tempState = createInitialState()
    const movesToReplay = gameState.moveHistory.slice(0, -2)
    for (const move of movesToReplay) {
      tempState = applyMove(tempState, move)
    }
    tempState = checkGameOver(tempState)
    setGameState(tempState)
  }, [difficulty, gameState.moveHistory, gameState.winner, isThinking])

  const handleRestart = () => {
    setGameState(createInitialState())
    resultRecordedRef.current = false
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw')
    if (gameState.winner === playerColor) return t('youWin')
    return t('youLose')
  }

  const getGameOverReasonMessage = () => {
    if (!gameState.gameOverReason) return ''
    switch (gameState.gameOverReason) {
      case 'checkmate': return t('checkmate')
      case 'stalemate': return t('stalemate')
      case 'fiftyMoveRule': return t('fiftyMoveRule')
      case 'insufficientMaterial': return t('insufficientMaterial')
      case 'repetition': return t('repetition')
      default: return ''
    }
  }

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return tHub('easy')
      case 'normal': return tHub('normal')
      case 'hard': return tHub('hard')
    }
  }

  const getStatusMessage = () => {
    if (gameState.winner) return ''
    if (isThinking) return ''
    if (gameState.inCheck) {
      return isPlayerTurn ? t('yourTurnCheck') : t('aiTurnCheck')
    }
    return isPlayerTurn ? t('yourTurn') : t('opponentTurn')
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
            onClick={() => setFlipped(!flipped)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title={t('flipBoard')}
          >
            <RotateCw className="w-4 h-4" />
          </button>
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
          {/* Player (White) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isPlayerTurn && !gameState.winner
              ? 'bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 shadow-md flex items-center justify-center">
              <span className="text-gray-900 font-bold">{winCount.player}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {tHub('you')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('white')} {'\u2654'}
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI (Black) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            !isPlayerTurn && !gameState.winner
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{winCount.ai}</span>
            </div>
            <div>
              <p className={`font-medium ${!isPlayerTurn && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                AI
              </p>
              <p className={`text-xs ${!isPlayerTurn && !gameState.winner ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {t('black')} {'\u265A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Turn/Status Indicator */}
      {!gameState.winner && (
        <div className={`text-center py-2 px-4 rounded-xl ${
          gameState.inCheck
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            : isPlayerTurn
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isThinking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🤔</span>
              {tHub('aiThinking')}
            </span>
          ) : (
            getStatusMessage()
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
          <p className="text-sm opacity-80">
            {getGameOverReasonMessage()} · {gameState.moveHistory.length} {t('moves')} · {getDifficultyLabel(difficulty)}
          </p>
        </div>
      )}

      <GameConfetti active={!!gameState.winner && gameState.winner === playerColor} />

      {/* Game Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <ChessBoardComponent
          gameState={gameState}
          playerColor={playerColor}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
          flipped={flipped}
        />
      </div>

      {/* Move count + Undo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('moves')}: {gameState.moveHistory.length}
          </div>
          {difficulty === 'easy' && !gameState.winner && isPlayerTurn && !isThinking && gameState.moveHistory.length >= 2 && (
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
            gameName={t('title')}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            moves={gameState.moveHistory.length}
            url="https://toolhub.ai.kr/chess"
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
            {tHub('myStats')}
          </span>
          <span>{showStats ? '\u2212' : '+'}</span>
        </button>
        {showStats && stats && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalWins}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('wins')}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.easy.losses + stats.normal.losses + stats.hard.losses}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('losses')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.totalGames}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tHub('totalGames')}</p>
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

      {/* Achievements */}
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
            {t('howToPlay')}
          </span>
          <span>{showRules ? '\u2212' : '+'}</span>
        </button>
        {showRules && (
          <div className="mt-4 text-gray-600 dark:text-gray-400 space-y-2">
            <p>1. {t('rules.rule1')}</p>
            <p>2. {t('rules.rule2')}</p>
            <p>3. {t('rules.rule3')}</p>
            <p>4. {t('rules.rule4')}</p>
            <p>5. {t('rules.rule5')}</p>
            <p>6. {t('rules.rule6')}</p>
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
