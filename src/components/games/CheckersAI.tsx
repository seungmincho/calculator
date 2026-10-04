'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/checkers'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, BarChart3 } from 'lucide-react'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import CheckersBoardComponent, {
  CheckersGameState,
  createInitialCheckersState,
  getValidMovesForPiece,
  getAllValidMoves,
  makeCheckersMove
} from '@/components/CheckersBoard'
import { getCheckersAIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface CheckersAIProps {
  difficulty: Difficulty
  onBack: () => void
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

export default function CheckersAI({ difficulty, onBack, onResult, onLevelUp, backLabel }: CheckersAIProps) {
  const t = useTranslations('checkers')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<CheckersGameState>(() => {
    const initial = createInitialCheckersState()
    return initial
  })
  const [playerColor] = useState<'red' | 'black'>('red') // Player is red (moves first)
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('checkers', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, playDraw, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiColor = playerColor === 'red' ? 'black' : 'red'
  const isPlayerTurn = gameState.currentTurn === playerColor

  // Update valid moves when piece is selected
  useEffect(() => {
    if (gameState.selectedPiece && isPlayerTurn && !gameState.winner) {
      const moves = getValidMovesForPiece(
        gameState.board,
        gameState.selectedPiece.row,
        gameState.selectedPiece.col
      )

      // Check if we must capture
      const allMoves = getAllValidMoves(gameState.board, playerColor)
      const hasCapture = allMoves.some(m => m.moves.some(move => move.captures && move.captures.length > 0))

      if (hasCapture) {
        // Filter to only capture moves if captures are available
        const captureMoves = moves.filter(m => m.captures && m.captures.length > 0)
        if (captureMoves.length > 0) {
          setGameState(prev => ({ ...prev, validMoves: captureMoves, mustCapture: true }))
        } else {
          // This piece can't capture, deselect
          setGameState(prev => ({ ...prev, selectedPiece: null, validMoves: [], mustCapture: true }))
        }
      } else {
        setGameState(prev => ({ ...prev, validMoves: moves, mustCapture: false }))
      }
    }
  }, [gameState.selectedPiece, gameState.board, isPlayerTurn, playerColor, gameState.winner])

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getCheckersAIMove(gameState, aiColor, difficulty)
      if (move) {
        // Select the piece first
        const movesForPiece = getValidMovesForPiece(gameState.board, move.from.row, move.from.col)

        setGameState(prev => {
          const withSelection = {
            ...prev,
            selectedPiece: move.from,
            validMoves: movesForPiece
          }

          // Then make the move
          const newState = makeCheckersMove(withSelection, move.to.row, move.to.col)
          return newState || prev
        })
        playMove()
      }
      setIsThinking(false)
    }, 500 + Math.random() * 500)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiColor, difficulty])

  // Update win count and record stats
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      if (gameState.winner === 'draw') {
        recordResult('draw')
        recordGameResult({ gameType: 'checkers', result: 'draw', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playDraw()
      } else if (gameState.winner === playerColor) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
        recordGameResult({ gameType: 'checkers', result: 'win', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playWin()
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
        recordGameResult({ gameType: 'checkers', result: 'loss', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playLose()
      }
      onResult?.(gameState.winner === 'draw' ? 'draw' : gameState.winner === playerColor ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.moveHistory, playerColor, recordResult, recordGameResult, difficulty, playWin, playLose, playDraw, onResult])

  // Select piece
  const handleSelectPiece = useCallback((row: number, col: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    const piece = gameState.board[row][col]
    if (!piece || piece.color !== playerColor) return

    setGameState(prev => ({
      ...prev,
      selectedPiece: { row, col }
    }))
  }, [gameState, isPlayerTurn, playerColor, isThinking])

  // Make move
  const handleMove = useCallback((toRow: number, toCol: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return
    if (!gameState.selectedPiece) return

    const newState = makeCheckersMove(gameState, toRow, toCol)
    if (newState) {
      setGameState(newState)
      playMove()
    }
  }, [gameState, isPlayerTurn, isThinking, playMove])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialCheckersState())
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
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="min-w-11 min-h-11 p-2 text-muted hover:bg-soft rounded-lg"
            title={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
            aria-label={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <span>{tHub('vsComputer')}</span>
          <span className="px-2 py-1 bg-soft rounded">
            {getDifficultyLabel(difficulty)}
          </span>
        </div>
      </div>

      {/* Score Board */}
      <div className="bg-surface rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          {/* Player (Red) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerColor && !gameState.winner
              ? 'bg-red-500 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-red-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{gameState.redCount}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                {tHub('you')} ({winCount.player})
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-red-200' : 'text-muted'}`}>
                {t('red') || 'Red'}
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI (Black) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiColor && !gameState.winner
              ? 'bg-gray-900 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{gameState.blackCount}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                AI ({winCount.ai})
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiColor && !gameState.winner ? 'text-gray-300' : 'text-muted'}`}>
                {t('black') || 'Black'}
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
          ) : gameState.mustCapture ? (
            <span className="font-semibold">
              {t('mustCapture') || 'You must capture!'}
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
          <p className="text-sm opacity-80">{getDifficultyLabel(difficulty)}</p>
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
            {t('playAgain') || 'Play Again'}
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
            gameName={t('title') || '체커'}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            url={`https://toolhub.ai.kr/checkers/?d=${difficulty}`}
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
        <CheckersBoardComponent
          gameState={gameState}
          myColor={playerColor}
          isMyTurn={isPlayerTurn && !isThinking}
          onSelectPiece={handleSelectPiece}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
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
            <p>1. {t('rules.rule1') || 'Red moves first. Pieces move diagonally forward.'}</p>
            <p>2. {t('rules.rule2') || 'Capture opponent pieces by jumping over them.'}</p>
            <p>3. {t('rules.rule3') || 'If you can capture, you must capture.'}</p>
            <p>4. {t('rules.rule4') || 'Reach the opposite end to become a King (can move backwards).'}</p>
            <p>5. {t('rules.rule5') || 'Win by capturing all opponent pieces or blocking all their moves.'}</p>
          </div>
        )}
      </div>

      <GameAchievements
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
      />

      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
