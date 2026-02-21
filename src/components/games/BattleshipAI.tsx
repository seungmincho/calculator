'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trophy, RefreshCw, HelpCircle, RotateCw, Shuffle, BarChart3 } from 'lucide-react'
import GameConfetti from '@/components/GameConfetti'
import GameResultShare from '@/components/GameResultShare'
import BattleshipBoardComponent, {
  ShipPlacementBoard,
  BattleshipGameState,
  createInitialBattleshipState,
  makeAttack,
  randomPlaceAllShips,
  placeShip,
  canPlaceShip,
  createEmptyBoard,
  SHIP_TYPES,
  Ship
} from '@/components/BattleshipBoard'
import {
  getBattleshipAIMove,
  createBattleshipAIState,
  updateBattleshipAIState,
  placeBattleshipAIShips,
  Difficulty
} from '@/utils/gameAI'
import { useAIGameStats } from '@/hooks/useAIGameStats'
import { useGameAchievements } from '@/hooks/useGameAchievements'
import { useGameSounds } from '@/hooks/useGameSounds'
import GameAchievements, { AchievementToast } from '@/components/GameAchievements'

interface BattleshipAIProps {
  difficulty: Difficulty
  onBack: () => void
}

type Phase = 'setup' | 'playing' | 'finished'

export default function BattleshipAI({ difficulty, onBack }: BattleshipAIProps) {
  const t = useTranslations('battleship')
  const tHub = useTranslations('gameHub')
  const tSounds = useTranslations('gameSounds')

  const [gameState, setGameState] = useState<BattleshipGameState>(createInitialBattleshipState())
  const [phase, setPhase] = useState<Phase>('setup')
  const [playerRole] = useState<'player1' | 'player2'>('player1')
  const [isThinking, setIsThinking] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [winCount, setWinCount] = useState({ player: 0, ai: 0 })
  const resultRecordedRef = useRef(false)

  // AI 게임 통계
  const { stats, recordResult } = useAIGameStats('battleship', difficulty)
  const { achievements, newlyUnlocked, unlockedCount, totalCount, recordGameResult, dismissNewAchievements } = useGameAchievements()
  const { playMove, playWin, playLose, enabled: soundEnabled, setEnabled: setSoundEnabled } = useGameSounds()

  // Ship placement state
  const [currentShipIndex, setCurrentShipIndex] = useState(0)
  const [horizontal, setHorizontal] = useState(true)
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard())
  const [playerShips, setPlayerShips] = useState<Ship[]>([])

  // AI state for targeting
  const [aiState, setAIState] = useState(createBattleshipAIState())

  const aiRole = playerRole === 'player1' ? 'player2' : 'player1'
  const isPlayerTurn = gameState.currentTurn === playerRole

  // Initialize AI ships when game starts
  useEffect(() => {
    if (phase === 'playing' && gameState.player2Ships.length === 0) {
      const { board, ships } = placeBattleshipAIShips()
      setGameState(prev => ({
        ...prev,
        player2Board: board,
        player2Ships: ships,
        setupPhase: { player1: 'playing', player2: 'playing' }
      }))
    }
  }, [phase, gameState.player2Ships.length])

  // AI move
  useEffect(() => {
    if (phase !== 'playing' || gameState.winner || isPlayerTurn) return

    setIsThinking(true)
    const timer = setTimeout(() => {
      const move = getBattleshipAIMove(gameState, aiRole, difficulty, aiState)
      if (move) {
        const newState = makeAttack(gameState, move.row, move.col, aiRole)
        if (newState) {
          const result = newState.lastMove?.result || 'miss'
          const newAIState = updateBattleshipAIState(
            aiState,
            move.row,
            move.col,
            result,
            aiRole === 'player1' ? newState.player1Attacks : newState.player2Attacks
          )
          setAIState(newAIState)
          setGameState(newState)
          playMove()
        }
      }
      setIsThinking(false)
    }, 800 + Math.random() * 700)

    return () => clearTimeout(timer)
  }, [gameState, phase, isPlayerTurn, aiRole, difficulty, aiState])

  // Update win count and record stats
  useEffect(() => {
    if (gameState.winner && !resultRecordedRef.current) {
      resultRecordedRef.current = true
      setPhase('finished')
      const totalAttacks = (gameState.player1Attacks?.flat().filter(Boolean).length ?? 0) + (gameState.player2Attacks?.flat().filter(Boolean).length ?? 0)
      if (gameState.winner === playerRole) {
        setWinCount(prev => ({ ...prev, player: prev.player + 1 }))
        recordResult('win')
        recordGameResult({ gameType: 'battleship', result: 'win', difficulty, moves: totalAttacks })
        playWin()
      } else {
        setWinCount(prev => ({ ...prev, ai: prev.ai + 1 }))
        recordResult('loss')
        recordGameResult({ gameType: 'battleship', result: 'loss', difficulty, moves: totalAttacks })
        playLose()
      }
    }
  }, [gameState.winner, gameState.player1Attacks, gameState.player2Attacks, playerRole, recordResult, recordGameResult, difficulty, playWin, playLose])

  // Ship placement
  const handlePlaceShip = useCallback((row: number, col: number) => {
    if (currentShipIndex >= SHIP_TYPES.length) return

    const currentShip = SHIP_TYPES[currentShipIndex]
    const result = placeShip(playerBoard, playerShips, currentShip, row, col, horizontal)

    if (result) {
      setPlayerBoard(result.board)
      setPlayerShips(result.ships)
      setCurrentShipIndex(prev => prev + 1)
    }
  }, [currentShipIndex, playerBoard, playerShips, horizontal])

  // Random placement
  const handleRandomPlace = () => {
    const { board, ships } = randomPlaceAllShips()
    setPlayerBoard(board)
    setPlayerShips(ships)
    setCurrentShipIndex(SHIP_TYPES.length)
  }

  // Start game
  const handleStartGame = () => {
    if (playerShips.length !== SHIP_TYPES.length) return

    setGameState(prev => ({
      ...prev,
      player1Board: playerBoard,
      player1Ships: playerShips,
      setupPhase: { player1: 'ready', player2: 'ready' }
    }))
    setPhase('playing')
  }

  // Player attack
  const handleAttack = useCallback((row: number, col: number) => {
    if (phase !== 'playing' || !isPlayerTurn || gameState.winner || isThinking) return

    const newState = makeAttack(gameState, row, col, playerRole)
    if (newState) {
      setGameState(newState)
      playMove()
    }
  }, [gameState, phase, isPlayerTurn, playerRole, isThinking, playMove])

  // Restart game
  const handleRestart = () => {
    setGameState(createInitialBattleshipState())
    setPhase('setup')
    setCurrentShipIndex(0)
    setHorizontal(true)
    setPlayerBoard(createEmptyBoard())
    setPlayerShips([])
    setAIState(createBattleshipAIState())
    resultRecordedRef.current = false
  }

  const getWinnerMessage = () => {
    if (!gameState.winner) return ''
    if (gameState.winner === playerRole) return t('youWin') || 'Victory!'
    return t('youLose') || 'Defeat!'
  }

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return tHub('easy')
      case 'normal': return tHub('normal')
      case 'hard': return tHub('hard')
    }
  }

  // Setup phase
  if (phase === 'setup') {
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

        {/* Ship Placement */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {t('placeYourShips') || 'Place Your Ships'}
          </h2>

          {currentShipIndex < SHIP_TYPES.length ? (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {t('placingShip') || 'Placing'}: <strong>{SHIP_TYPES[currentShipIndex].name}</strong> ({SHIP_TYPES[currentShipIndex].size} {t('cells') || 'cells'})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setHorizontal(!horizontal)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  <RotateCw className="w-4 h-4" />
                  {horizontal ? t('horizontal') || 'Horizontal' : t('vertical') || 'Vertical'}
                </button>
                <button
                  onClick={handleRandomPlace}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Shuffle className="w-4 h-4" />
                  {t('randomPlace') || 'Random'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-green-600 dark:text-green-400 mb-4">
                ✓ {t('allShipsPlaced') || 'All ships placed!'}
              </p>
              <button
                onClick={handleStartGame}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl"
              >
                {t('startBattle') || 'Start Battle'}
              </button>
            </div>
          )}

          <ShipPlacementBoard
            board={playerBoard}
            ships={playerShips}
            currentShip={currentShipIndex < SHIP_TYPES.length ? SHIP_TYPES[currentShipIndex] : null}
            horizontal={horizontal}
            onPlaceShip={handlePlaceShip}
          />

          {/* Ships to place */}
          <div className="mt-4 flex flex-wrap gap-2">
            {SHIP_TYPES.map((ship, index) => (
              <div
                key={ship.id}
                className={`px-3 py-1 rounded text-sm ${
                  index < currentShipIndex
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : index === currentShipIndex
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {ship.name} ({ship.size})
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Playing/Finished phase
  return (
    <div className="max-w-6xl mx-auto space-y-4">
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

      {/* Turn/Status Indicator */}
      {!gameState.winner && (
        <div className={`text-center py-2 px-4 rounded-xl ${
          isPlayerTurn
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isThinking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🎯</span>
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
          gameState.winner === playerRole
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <p className="text-2xl font-bold mb-1">{getWinnerMessage()}</p>
          <p className="text-sm opacity-80">
            {tHub('you')}: {winCount.player} - AI: {winCount.ai} · {getDifficultyLabel(difficulty)}
          </p>
        </div>
      )}
      <GameConfetti active={!!gameState.winner && gameState.winner === playerRole} />

      {/* Boards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Enemy Board (Attack) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('enemyWaters') || 'Enemy Waters'}
          </h3>
          <BattleshipBoardComponent
            board={gameState.player1Attacks}
            isOwnBoard={false}
            isClickable={isPlayerTurn && !gameState.winner && !isThinking}
            onCellClick={handleAttack}
            lastMove={gameState.lastMove?.player === playerRole ? gameState.lastMove : null}
            showShips={false}
          />
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('shipsRemaining') || 'Ships remaining'}: {gameState.player2Ships.filter(s => !s.sunk).length}
          </div>
        </div>

        {/* Your Board */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('yourFleet') || 'Your Fleet'}
          </h3>
          <BattleshipBoardComponent
            board={gameState.player1Board}
            ships={gameState.player1Ships}
            isOwnBoard={true}
            isClickable={false}
            lastMove={gameState.lastMove?.player === aiRole ? gameState.lastMove : null}
            showShips={true}
          />
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('shipsRemaining') || 'Ships remaining'}: {gameState.player1Ships.filter(s => !s.sunk).length}
          </div>
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
            {t('playAgain') || 'Play Again'}
          </button>
          <GameResultShare
            gameName={t('title') || '배틀쉽'}
            result={gameState.winner === playerRole ? 'win' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            url="https://toolhub.ai.kr/battleship"
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
            <p>1. {t('rules.rule1') || 'Place your ships on the board before battle begins.'}</p>
            <p>2. {t('rules.rule2') || 'Take turns firing at the enemy grid.'}</p>
            <p>3. {t('rules.rule3') || 'Red X marks a hit, gray dot marks a miss.'}</p>
            <p>4. {t('rules.rule4') || 'Sink all enemy ships to win!'}</p>
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
