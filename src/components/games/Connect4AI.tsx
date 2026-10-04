'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/connect4'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, BarChart3, Undo2 } from 'lucide-react'
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
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

export default function Connect4AI({ difficulty, onBack, onResult, onLevelUp, backLabel }: Connect4AIProps) {
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
      onResult?.(gameState.winner === 'draw' ? 'draw' : gameState.winner === playerColor ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.moveHistory.length, playerColor, difficulty, recordResult, recordGameResult, playWin, playLose, playDraw, onResult])

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
          className="flex items-center gap-2 px-4 py-2 min-h-11 text-sub hover:text-fg hover:bg-soft rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          {backLabel ?? tHub('backToHub')}
        </button>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{tHub('vsComputer')}</span>
          <span className="px-2 py-1 bg-soft rounded">
            {getDifficultyLabel(difficulty)}
          </span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="min-w-11 min-h-11 p-2 text-muted hover:bg-soft rounded-lg"
            title={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
            aria-label={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Score Board */}
      <div className="bg-surface rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerColor && !gameState.winner
              ? 'bg-red-500 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-red-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{winCount.player}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                {tHub('you')}
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-red-200' : 'text-muted'}`}>
                {t('red') || 'Red'}
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiColor && !gameState.winner
              ? 'bg-yellow-400 text-gray-900'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-md flex items-center justify-center">
              <span className="text-gray-900 font-bold">{winCount.ai}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-gray-900' : 'text-fg'}`}>
                AI
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-gray-700' : 'text-muted'}`}>
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
            ? 'bg-primary-soft text-primary'
            : 'bg-soft text-sub'
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
            ? 'bg-primary text-white'
            : gameState.winner === 'draw'
            ? 'bg-primary-soft text-primary'
            : 'bg-track text-body'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <p className="text-2xl font-bold mb-1">{getWinnerMessage()}</p>
          <p className="text-sm opacity-80">{gameState.moveHistory.length} {t('moves') || 'moves'} · {getDifficultyLabel(difficulty)}</p>
        </div>
      )}
      <GameConfetti active={!!gameState.winner && gameState.winner === playerColor} />

      {/* Game End Buttons */}
      {gameState.winner && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRestart}
            className="ui-btn w-full min-h-12 py-3 px-6 text-lg"
          >
            <RefreshCw className="w-5 h-5" />
            {t('playAgain')}
          </button>
          {onLevelUp && difficulty !== 'hard' && (
            <button
              onClick={onLevelUp}
              className="ui-btn-soft flex-1 min-h-12 py-3 px-6"
            >
              <TrendingUp className="w-5 h-5" />
              {tHub('levelUp')} · {getDifficultyLabel(difficulty === 'easy' ? 'normal' : 'hard')}
            </button>
          )}
          <GameResultShare
            gameName={t('title') || '사목'}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            moves={gameState.moveHistory.length}
            url={`https://toolhub.ai.kr/connect4/?d=${difficulty}`}
          />
          <button
            onClick={onBack}
            className="flex-1 min-h-12 py-3 px-6 bg-soft hover:bg-subtle text-body font-medium rounded-xl"
          >
            {backLabel ?? tHub('backToHub')}
          </button>
        </div>
      )}

      {/* Game Board */}
      <div className="bg-surface rounded-2xl shadow-lg p-4">
        <Connect4BoardComponent
          gameState={gameState}
          myColor={playerColor}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
      </div>

      {/* Move Info */}
      <div className="bg-surface rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-sub">
            {t('moves') || 'Moves'}: {gameState.moveHistory.length}
          </div>
          {difficulty === 'easy' && !gameState.winner && isPlayerTurn && gameState.moveHistory.length >= 2 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm min-h-11 bg-soft hover:bg-subtle text-body rounded-lg transition-colors"
            >
              <Undo2 className="w-4 h-4" />
              {tSounds('undo')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-surface rounded-2xl shadow-lg p-6">
        <button
          onClick={() => setShowStats(!showStats)}
          aria-expanded={showStats}
          className="w-full flex items-center justify-between text-lg font-semibold text-fg"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {tHub('myStats') || 'My Stats'}
          </span>
          <span aria-hidden>{showStats ? '−' : '+'}</span>
        </button>
        {showStats && stats && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-primary tabular-nums">{stats.totalWins}</p>
                <p className="text-xs text-muted">{tHub('wins') || 'Wins'}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-fg tabular-nums">
                  {stats.easy.losses + stats.normal.losses + stats.hard.losses}
                </p>
                <p className="text-xs text-muted">{tHub('losses') || 'Losses'}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-sub">{stats.totalGames}</p>
                <p className="text-xs text-muted">{tHub('totalGames') || 'Total'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-sub">
                <span>{tHub('easy')}</span>
                <span>{stats.easy.wins}{tHub('wins')} {stats.easy.losses}{tHub('losses')} {stats.easy.draws}{tHub('draws')}</span>
              </div>
              <div className="flex justify-between text-sub">
                <span>{tHub('normal')}</span>
                <span>{stats.normal.wins}{tHub('wins')} {stats.normal.losses}{tHub('losses')} {stats.normal.draws}{tHub('draws')}</span>
              </div>
              <div className="flex justify-between text-sub">
                <span>{tHub('hard')}</span>
                <span>{stats.hard.wins}{tHub('wins')} {stats.hard.losses}{tHub('losses')} {stats.hard.draws}{tHub('draws')}</span>
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
      <div className="bg-surface rounded-2xl shadow-lg p-6">
        <button
          onClick={() => setShowRules(!showRules)}
          aria-expanded={showRules}
          className="w-full flex items-center justify-between text-lg font-semibold text-fg"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t('howToPlay') || 'How to Play'}
          </span>
          <span aria-hidden>{showRules ? '−' : '+'}</span>
        </button>
        {showRules && (
          <div className="mt-4 text-sub space-y-2">
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
