'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/othello'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, BarChart3, Undo2 } from 'lucide-react'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import OthelloBoardComponent, {
  OthelloGameState,
  createInitialOthelloState,
  makeMove,
  getValidMoves
} from '@/components/OthelloBoard'
import { getOthelloAIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface OthelloAIProps {
  difficulty: Difficulty
  onBack: () => void
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

export default function OthelloAI({ difficulty, onBack, onResult, onLevelUp, backLabel }: OthelloAIProps) {
  const t = useTranslations('othello')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<OthelloGameState>(createInitialOthelloState())
  const [playerColor] = useState<'black' | 'white'>('black') // Player is always black (first)
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('othello', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playCapture, playWin, playLose, playDraw, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiColor = playerColor === 'black' ? 'white' : 'black'
  const isPlayerTurn = gameState.currentTurn === playerColor

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getOthelloAIMove(gameState, aiColor, difficulty)
      if (move) {
        setGameState(prev => {
          const newState = makeMove(prev, move.x, move.y, aiColor)
          return newState || prev
        })
        playMove()
      }
      setIsThinking(false)
    }, 500 + Math.random() * 500)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiColor, difficulty])

  // Record game result
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      if (gameState.winner === 'draw') {
        recordResult('draw')
      } else if (gameState.winner === playerColor) {
        recordResult('win')
      } else {
        recordResult('loss')
      }
      recordGameResult({
        gameType: 'othello',
        result: gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss',
        difficulty,
        moves: gameState.moveHistory.length
      })
      if (gameState.winner === playerColor) { playWin() }
      else if (gameState.winner === 'draw') { playDraw() }
      else { playLose() }
      onResult?.(gameState.winner === 'draw' ? 'draw' : gameState.winner === playerColor ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.moveHistory.length, playerColor, difficulty, recordResult, recordGameResult, playWin, playDraw, playLose, onResult])

  // Player move
  const handleMove = useCallback((x: number, y: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    const newState = makeMove(gameState, x, y, playerColor)
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
      // Rebuild from initial state by replaying moves
      let state = createInitialOthelloState()
      for (const move of newHistory) {
        const nextState = makeMove(state, move.x, move.y, move.player)
        if (nextState) state = nextState
      }
      return state
    })
  }, [difficulty, gameState.moveHistory.length, gameState.winner])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialOthelloState())
    resultRecordedRef.current = false
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
          {/* Player (Black) */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerColor && !gameState.winner
              ? 'bg-gray-900 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-700 shadow-md flex items-center justify-center">
              <span className="text-white font-bold">{gameState.blackCount}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                {tHub('you')}
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerColor && !gameState.winner ? 'text-gray-300' : 'text-muted'}`}>
                {t('black')}
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
              <span className="text-gray-900 font-bold">{gameState.whiteCount}</span>
            </div>
            <div>
              <p className="font-medium text-fg">AI</p>
              <p className="text-xs text-muted">
                {t('white')}
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
          <p className="text-sm opacity-80">{getDifficultyLabel(difficulty)}</p>
          <p className="text-sm mt-1">
            {t('black')}: {gameState.blackCount} - {t('white')}: {gameState.whiteCount}
          </p>
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
            gameName={`${tHub('gameList.othello.name')} ${tHub('vsAI')}`}
            result={gameState.winner === playerColor ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            score={`${gameState.blackCount} - ${gameState.whiteCount}`}
            url={`https://toolhub.ai.kr/othello/?d=${difficulty}`}
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
        <OthelloBoardComponent
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
          </div>
        )}
      </div>

      {/* Achievements */}
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
