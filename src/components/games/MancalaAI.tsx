'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, HelpCircle, BarChart3 } from 'lucide-react'
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
}

export default function MancalaAI({ difficulty, onBack }: MancalaAIProps) {
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
    }
  }, [gameState.winner, gameState.moveHistory, playerRole, recordResult, recordGameResult, difficulty, playWin, playLose, playDraw])

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
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          {tHub('backToHub')}
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title={soundEnabled ? tSounds('disabled') : tSounds('enabled')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
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
            <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-blue-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.board[playerStore]}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {tHub('you')} ({winCount.player})
              </p>
              <p className={`text-xs ${gameState.currentTurn === playerRole && !gameState.winner ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {t('bottom') || 'Bottom'}
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
            <div className="w-12 h-12 bg-red-600 rounded-full border-2 border-red-800 shadow-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">{gameState.board[aiStore]}</span>
            </div>
            <div>
              <p className={`font-medium ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                AI ({winCount.ai})
              </p>
              <p className={`text-xs ${gameState.currentTurn === aiRole && !gameState.winner ? 'text-red-200' : 'text-gray-500 dark:text-gray-400'}`}>
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
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isThinking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🤔</span>
              {tHub('aiThinking')}
            </span>
          ) : gameState.extraTurn ? (
            <span className="text-yellow-600 dark:text-yellow-400">
              {t('extraTurn') || 'Extra turn!'}
            </span>
          ) : (
            isPlayerTurn ? t('yourTurn') : t('opponentTurn')
          )}
        </div>
      )}

      {/* Capture notification */}
      {gameState.capturedStones && (
        <div className="text-center py-2 px-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
          {gameState.capturedStones.player === playerRole ? tHub('you') : 'AI'} {t('captured') || 'captured'} {gameState.capturedStones.count} {t('stones') || 'stones'}!
        </div>
      )}

      {/* Winner Message */}
      {gameState.winner && (
        <div className={`text-center py-6 px-6 rounded-2xl ${
          gameState.winner === playerRole
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : gameState.winner === 'draw'
            ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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

      {/* Game Board */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <MancalaBoardComponent
          gameState={gameState}
          myRole={playerRole}
          isMyTurn={isPlayerTurn && !isThinking}
          onMove={handleMove}
          disabled={!!gameState.winner || isThinking}
        />
      </div>

      {/* Game End Buttons */}
      {gameState.winner && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
            {t('playAgain') || 'Play Again'}
          </button>
          <GameResultShare
            gameName={t('title') || '만칼라'}
            result={gameState.winner === playerRole ? 'win' : gameState.winner === 'draw' ? 'draw' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            url="https://toolhub.ai.kr/mancala"
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
