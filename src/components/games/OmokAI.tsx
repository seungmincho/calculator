'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/omok'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, BarChart3, AlertCircle, X, Undo2 } from 'lucide-react'
import OmokBoardComponent from '@/components/OmokBoard'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import { OmokGameState, OmokMove } from '@/utils/webrtc'
import { getOmokAIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { createInitialGameState, checkWinner, checkForbiddenMove } from '@/utils/gameRules/omokRules'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface OmokAIProps {
  difficulty: Difficulty
  onBack: () => void
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

export default function OmokAI({ difficulty, onBack, onResult, onLevelUp, backLabel }: OmokAIProps) {
  const t = useTranslations('omok')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<OmokGameState>(createInitialGameState())
  const [playerColor] = useState<'black' | 'white'>('black') // Player is always black (first)
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const [forbiddenToast, setForbiddenToast] = useState<string | null>(null)
  const resultRecordedRef = useRef(false) // 결과 중복 기록 방지

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('omok', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, playDraw, playInvalid, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiColor = playerColor === 'black' ? 'white' : 'black'
  const isPlayerTurn = gameState.currentTurn === playerColor

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getOmokAIMove(gameState, aiColor, difficulty)
      if (move) {
        setGameState(prev => {
          const newBoard = prev.board.map(row => [...row])
          newBoard[move.y][move.x] = aiColor

          const newMove: OmokMove = {
            x: move.x,
            y: move.y,
            player: aiColor,
            moveNumber: prev.moveHistory.length + 1
          }

          const winner = checkWinner(newBoard, newMove)

          return {
            ...prev,
            board: newBoard,
            currentTurn: playerColor,
            moveHistory: [...prev.moveHistory, newMove],
            winner,
            lastMove: newMove
          }
        })
        playMove()
      }
      setIsThinking(false)
    }, 500 + Math.random() * 500)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiColor, playerColor, difficulty])

  // Update win count and record stats
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
        gameType: 'omok',
        result: gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss',
        difficulty,
        moves: gameState.moveHistory.length
      })
      onResult?.(gameState.winner === 'draw' ? 'draw' : gameState.winner === playerColor ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.moveHistory.length, playerColor, recordResult, recordGameResult, difficulty, playWin, playLose, playDraw, onResult])

  // Get forbidden move message
  const getForbiddenMessage = (reason: string): string => {
    switch (reason) {
      case 'double-three':
        return t('doubleThreeForbidden')
      case 'double-four':
        return t('doubleFourForbidden')
      case 'overline':
        return t('overlineForbidden')
      default:
        return t('forbiddenMove')
    }
  }

  // Player move
  const handleMove = useCallback((x: number, y: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return
    if (gameState.board[y][x] !== null) return

    // Check for forbidden moves (Renju rules - black only)
    if (playerColor === 'black') {
      const forbidden = checkForbiddenMove(gameState.board, x, y, playerColor)
      if (forbidden.forbidden && forbidden.reason) {
        setForbiddenToast(getForbiddenMessage(forbidden.reason))
        setTimeout(() => setForbiddenToast(null), 2000)
        playInvalid()
        return
      }
    }

    const newBoard = gameState.board.map(row => [...row])
    newBoard[y][x] = playerColor

    const newMove: OmokMove = {
      x,
      y,
      player: playerColor,
      moveNumber: gameState.moveHistory.length + 1
    }

    const winner = checkWinner(newBoard, newMove)

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentTurn: aiColor,
      moveHistory: [...prev.moveHistory, newMove],
      winner,
      lastMove: newMove
    }))
    playMove()
  }, [gameState, isPlayerTurn, playerColor, aiColor, isThinking, t, playMove, playInvalid])

  // Undo last 2 moves (only on easy difficulty)
  const handleUndo = useCallback(() => {
    if (difficulty !== 'easy' || gameState.moveHistory.length < 2 || gameState.winner) return
    setGameState(prev => {
      const newHistory = prev.moveHistory.slice(0, -2)
      const newBoard = Array(19).fill(null).map(() => Array(19).fill(null))
      // Replay all remaining moves
      for (const move of newHistory) {
        newBoard[move.y][move.x] = move.player
      }
      const lastMove = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null
      return {
        ...prev,
        board: newBoard,
        currentTurn: playerColor,
        moveHistory: newHistory,
        winner: null,
        lastMove
      }
    })
  }, [difficulty, gameState.moveHistory.length, gameState.winner])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialGameState())
    resultRecordedRef.current = false // Reset for new game
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === 'draw') return t('draw')
    if (gameState.winner === playerColor) return t('youWin')
    return t('youLose')
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
          {/* Player (Black) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerColor && !gameState.winner
              ? 'bg-gray-900 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{winCount.player}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                {tHub('you')}
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-gray-300' : 'text-muted'}`}>
                {t('black')} ⚫
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI (White) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiColor && !gameState.winner
              ? 'bg-white border-2 border-gray-300'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-white rounded-full border-2 border-gray-300 shadow-md flex items-center justify-center">
              <span className="text-gray-900 font-bold">{winCount.ai}</span>
            </div>
            <div>
              <p className="font-medium text-fg">AI</p>
              <p className="text-xs text-muted">
                {t('white')} ⚪
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
          <p className="text-sm opacity-80">{gameState.moveHistory.length} {t('moves')} · {getDifficultyLabel(difficulty)}</p>
        </div>
      )}

      {/* Confetti */}
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
            gameName={`${tHub('gameList.omok.name')} ${tHub('vsAI')}`}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            moves={gameState.moveHistory.length}
            url={`https://toolhub.ai.kr/omok/?d=${difficulty}`}
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
      <div className="bg-surface rounded-2xl shadow-lg p-4 overflow-x-auto">
        <OmokBoardComponent
          gameState={gameState}
          myColor={playerColor}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
      </div>

      {/* Move Count */}
      <div className="bg-surface rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-sub">
            {t('moves')}: {gameState.moveHistory.length}
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
            {tHub('myStats')}
          </span>
          <span aria-hidden>{showStats ? '−' : '+'}</span>
        </button>
        {showStats && stats && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-primary tabular-nums">{stats.totalWins}</p>
                <p className="text-xs text-muted">{tHub('wins')}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-fg tabular-nums">
                  {stats.easy.losses + stats.normal.losses + stats.hard.losses}
                </p>
                <p className="text-xs text-muted">{tHub('losses')}</p>
              </div>
              <div className="p-3 bg-subtle rounded-xl">
                <p className="text-2xl font-bold text-sub">{stats.totalGames}</p>
                <p className="text-xs text-muted">{tHub('totalGames')}</p>
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

      {/* Achievements */}
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
            {t('howToPlay')}
          </span>
          <span aria-hidden>{showRules ? '−' : '+'}</span>
        </button>
        {showRules && (
          <div className="mt-4 text-sub space-y-2">
            <p>1. {t('rules.rule1')}</p>
            <p>2. {t('rules.rule2')}</p>
            <p>3. {t('rules.rule3')}</p>
            <p>4. {t('rules.rule4')}</p>
            <p>5. {t('rules.rule5')}</p>
          </div>
        )}
      </div>

      {/* Forbidden Move Toast */}
      {forbiddenToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-amber-500 text-white animate-in slide-in-from-top-2 fade-in duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{forbiddenToast}</span>
            <button
              onClick={() => setForbiddenToast(null)}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <AchievementToast
        achievement={newlyUnlocked.length > 0 ? newlyUnlocked[0] : null}
        onDismiss={dismissNewAchievements}
      />
    </div>
  )
}
