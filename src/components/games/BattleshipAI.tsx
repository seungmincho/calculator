'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/battleship'
import '@/lib/i18n/ns/gameHub'
import '@/lib/i18n/ns/gameSounds'
import { ArrowLeft, Trophy, RefreshCw, TrendingUp, HelpCircle, RotateCw, Shuffle, BarChart3 } from 'lucide-react'
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
  /** BoardGamePage 전용 (게임 센터에서는 생략): 판 종료 알림 · 난이도 올리기 · 뒤로 버튼 문구 */
  onResult?: (result: 'win' | 'loss' | 'draw') => void
  onLevelUp?: () => void
  backLabel?: string
}

type Phase = 'setup' | 'playing' | 'finished'

export default function BattleshipAI({ difficulty, onBack, onResult, onLevelUp, backLabel }: BattleshipAIProps) {
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
      onResult?.(gameState.winner === playerRole ? 'win' : 'loss')
    }
  }, [gameState.winner, gameState.player1Attacks, gameState.player2Attacks, playerRole, recordResult, recordGameResult, difficulty, playWin, playLose, onResult])

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
          </div>
        </div>

        {/* Ship Placement */}
        <div className="bg-surface rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-fg mb-4">
            {t('placeYourShips') || 'Place Your Ships'}
          </h2>

          {currentShipIndex < SHIP_TYPES.length ? (
            <div className="mb-4">
              <p className="text-sub mb-2">
                {t('placingShip') || 'Placing'}: <strong>{SHIP_TYPES[currentShipIndex].name}</strong> ({SHIP_TYPES[currentShipIndex].size} {t('cells') || 'cells'})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setHorizontal(!horizontal)}
                  className="flex items-center gap-2 px-4 py-2 min-h-11 bg-soft text-body rounded-lg hover:bg-subtle"
                >
                  <RotateCw className="w-4 h-4" />
                  {horizontal ? t('horizontal') || 'Horizontal' : t('vertical') || 'Vertical'}
                </button>
                <button
                  onClick={handleRandomPlace}
                  className="flex items-center gap-2 px-4 py-2 min-h-11 bg-soft text-body rounded-lg hover:bg-subtle"
                >
                  <Shuffle className="w-4 h-4" />
                  {t('randomPlace') || 'Random'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-primary font-medium mb-4">
                ✓ {t('allShipsPlaced') || 'All ships placed!'}
              </p>
              <button
                onClick={handleStartGame}
                className="px-6 py-3 bg-primary hover:bg-blue-700 text-white font-medium rounded-xl"
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
                    ? 'bg-primary-soft text-primary'
                    : index === currentShipIndex
                    ? 'bg-primary-soft text-primary'
                    : 'bg-soft text-muted'
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

      {/* Turn/Status Indicator */}
      {!gameState.winner && (
        <div className={`text-center py-2 px-4 rounded-xl ${
          isPlayerTurn
            ? 'bg-primary-soft text-primary'
            : 'bg-soft text-sub'
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
            ? 'bg-primary text-white'
            : 'bg-track text-body'
        }`}>
          <Trophy className="w-10 h-10 mx-auto mb-2" />
          <p className="text-2xl font-bold mb-1">{getWinnerMessage()}</p>
          <p className="text-sm opacity-80">
            {tHub('you')}: {winCount.player} - AI: {winCount.ai} · {getDifficultyLabel(difficulty)}
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
            gameName={t('title') || '배틀쉽'}
            result={gameState.winner === playerRole ? 'win' : 'loss'}
            difficulty={getDifficultyLabel(difficulty) || difficulty}
            url={`https://toolhub.ai.kr/battleship/?d=${difficulty}`}
          />
          <button
            onClick={onBack}
            className="flex-1 min-h-12 py-3 px-6 bg-soft hover:bg-subtle text-body font-medium rounded-xl"
          >
            {backLabel ?? tHub('backToHub')}
          </button>
        </div>
      )}

      {/* Boards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Enemy Board (Attack) */}
        <div className="bg-surface rounded-2xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-fg mb-2">
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
          <div className="mt-2 text-sm text-muted">
            {t('shipsRemaining') || 'Ships remaining'}: {gameState.player2Ships.filter(s => !s.sunk).length}
          </div>
        </div>

        {/* Your Board */}
        <div className="bg-surface rounded-2xl shadow-lg p-4">
          <h3 className="text-lg font-semibold text-fg mb-2">
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
          <div className="mt-2 text-sm text-muted">
            {t('shipsRemaining') || 'Ships remaining'}: {gameState.player1Ships.filter(s => !s.sunk).length}
          </div>
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
