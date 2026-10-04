'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import '@/lib/i18n/ns/mancala'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, BarChart3 } from 'lucide-react'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import MancalaBoardComponent, {
  MancalaGameState,
  createInitialMancalaState,
  makeMancalaMove,
  getPlayerPits
} from '@/components/MancalaBoard'
import { getMancalaAIMove, Difficulty } from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface MancalaAIProps {
  difficulty: Difficulty
  onBack: () => void
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

export default function MancalaAI({ difficulty, onBack, onResult, onLevelUp, backLabel }: MancalaAIProps) {
  const t = useTranslations('mancala')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<MancalaGameState>(createInitialMancalaState())
  const [playerRole] = useState<'player1' | 'player2'>('player1') // Player is always player1 (bottom)
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('mancala', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, playDraw, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  const aiRole = playerRole === 'player1' ? 'player2' : 'player1'
  const isPlayerTurn = gameState.currentTurn === playerRole

  // AI move
  useEffect(() => {
    if (gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const pitIndex = getMancalaAIMove(gameState, aiRole, difficulty)
      if (pitIndex !== null) {
        setGameState(prev => {
          const newState = makeMancalaMove(prev, pitIndex, aiRole)
          return newState || prev
        })
        playMove()
      }
      setIsThinking(false)
    }, 500 + Math.random() * 500)

    return () => clearTimeout(timer)
  }, [gameState, isPlayerTurn, aiRole, difficulty])

  // Update win count and record stats
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      if (gameState.winner === 'draw') {
        recordResult('draw')
        recordGameResult({ gameType: 'mancala', result: 'draw', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playDraw()
      } else if (gameState.winner === playerRole) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
        recordGameResult({ gameType: 'mancala', result: 'win', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playWin()
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
        recordGameResult({ gameType: 'mancala', result: 'loss', difficulty, moves: gameState.moveHistory?.length ?? 0 })
        playLose()
      }
      onResult?.(gameState.winner === 'draw' ? 'draw' : gameState.winner === playerRole ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.moveHistory, playerRole, recordResult, recordGameResult, difficulty, playWin, playLose, playDraw, onResult])

  // Player move
  const handleMove = useCallback((pitIndex: number) => {
    if (!isPlayerTurn || gameState.winner || isThinking) return

    const playerPits = getPlayerPits(playerRole)
    if (!playerPits.includes(pitIndex)) return
    if (gameState.board[pitIndex] === 0) return

    const newState = makeMancalaMove(gameState, pitIndex, playerRole)
    if (newState) {
      setGameState(newState)
      playMove()
    }
  }, [gameState, isPlayerTurn, playerRole, isThinking, playMove])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialMancalaState())
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

  const playerStore = playerRole === 'player1' ? 6 : 13
  const aiStore = aiRole === 'player1' ? 6 : 13

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
          {/* Player */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === playerRole && !gameState.winner
              ? 'bg-blue-500 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-blue-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.board[playerStore]}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                {tHub('you')} ({winCount.player})
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-blue-200' : 'text-muted'}`}>
                {t('bottom') || 'Bottom'}
              </p>
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">VS</div>

          {/* AI */}
          <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            gameState.currentTurn === aiRole && !gameState.winner
              ? 'bg-red-500 text-white'
              : 'bg-soft'
          }`}>
            <div className="w-12 h-12 bg-red-600 rounded-full border-2 border-red-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.board[aiStore]}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-white' : 'text-fg'}`}>
                AI ({winCount.ai})
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-red-200' : 'text-muted'}`}>
                {t('top') || 'Top'}
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
          ) : gameState.extraTurn ? (
            <span className="font-semibold">
              {t('extraTurn') || 'Extra turn!'}
            </span>
          ) : (
            isPlayerTurn ? t('yourTurn') : t('opponentTurn')
          )}
        </div>
      )}

      {/* Capture notification */}
      {gameState.capturedStones && (
        <div className="text-center py-2 px-4 rounded-xl bg-soft text-sub">
          {gameState.capturedStones.player === playerRole ? tHub('you') : 'AI'} {t('captured') || 'captured'} {gameState.capturedStones.count} {t('stones') || 'stones'}!
        </div>
      )}

      {/* Winner Message */}
      {gameState.winner && (
        <div className={`text-center py-6 px-6 rounded-2xl ${
          gameState.winner === playerRole
            ? 'bg-primary text-white'
            : gameState.winner === 'draw'
            ? 'bg-primary-soft text-primary'
            : 'bg-track text-body'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <p className="text-2xl font-bold mb-1">{getWinnerMessage()}</p>
          <p className="text-sm opacity-80">{getDifficultyLabel(difficulty)}</p>
          <p className="text-sm mt-1">
            {tHub('you')}: {gameState.board[playerStore]} - AI: {gameState.board[aiStore]}
          </p>
        </div>
      )}
      <GameConfetti active={!!gameState.winner && gameState.winner === playerRole} />

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
            gameName={t('title') || '만칼라'}
            result={gameState.winner === playerRole ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            url={`https://toolhub.ai.kr/mancala/?d=${difficulty}`}
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
        <MancalaBoardComponent
          gameState={gameState}
          myRole={playerRole}
          isMyTurn={isPlayerTurn && !isThinking}
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
            <p>1. {t('rules.rule1') || 'Pick a pit on your side and distribute stones counter-clockwise.'}</p>
            <p>2. {t('rules.rule2') || 'If your last stone lands in your store, you get another turn.'}</p>
            <p>3. {t('rules.rule3') || 'If your last stone lands in an empty pit on your side, capture it and the opposite pit\'s stones.'}</p>
            <p>4. {t('rules.rule4') || 'The game ends when one side is empty. Remaining stones go to that player\'s store.'}</p>
            <p>5. {t('rules.rule5') || 'The player with the most stones in their store wins!'}</p>
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
