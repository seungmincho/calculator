'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trophy, RotateCcw, Undo2, Lightbulb, Volume2, VolumeX, Play } from 'lucide-react'

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
type Color = 'red' | 'black'
type GameState = 'playing' | 'won' | 'no-moves'
type PileType = 'tableau' | 'foundation' | 'stock' | 'waste'

interface Card {
  suit: Suit
  rank: number // 1=Ace, 2-10, 11=J, 12=Q, 13=K
  faceUp: boolean
  id: number
}

interface DragInfo {
  cards: Card[]
  sourceType: PileType
  sourceIndex: number
  offsetX: number
  offsetY: number
  startX: number
  startY: number
}

interface MoveRecord {
  type: 'move'
  from: { type: PileType; index: number }
  to: { type: PileType; index: number }
  cards: Card[]
  flippedCard: boolean
  scoreChange: number
  wasFromStock: boolean // stock -> waste
}

interface HintInfo {
  fromType: PileType
  fromIndex: number
  toType: PileType
  toIndex: number
  cardId: number
}

interface AnimatingCard {
  card: Card
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  duration: number
}

interface CelebrationCard {
  card: Card
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  vr: number
}

// ══════════════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════════════

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const SUIT_SYMBOLS: Record<Suit, string> = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' }
const SUIT_COLORS: Record<Suit, Color> = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' }
const RANK_NAMES: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

const CARD_W = 71
const CARD_H = 96
const CARD_RADIUS = 6
const CARD_GAP_FACE_UP = 24
const CARD_GAP_FACE_DOWN = 12
const PILE_GAP = 10
const TOP_MARGIN = 10
const FOUNDATION_Y = TOP_MARGIN
const TABLEAU_Y = FOUNDATION_Y + CARD_H + 16

const MAX_UNDO = 30
const SCORE_TABLEAU_TO_FOUNDATION = 10
const SCORE_STOCK_TO_TABLEAU = 5
const SCORE_FOUNDATION_TO_TABLEAU = -15
const SCORE_REVEAL_CARD = 5

const LS_HIGH_SCORE = 'solitaire_highScore'

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function createDeck(): Card[] {
  const deck: Card[] = []
  let id = 0
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: id++ })
    }
  }
  return deck
}

function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function suitColor(suit: Suit): Color {
  return SUIT_COLORS[suit]
}

function rankLabel(rank: number): string {
  return RANK_NAMES[rank] || String(rank)
}

function canStackOnTableau(moving: Card, target: Card): boolean {
  if (!target.faceUp) return false
  return suitColor(moving.suit) !== suitColor(target.suit) && moving.rank === target.rank - 1
}

function canStackOnFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1
  const top = pile[pile.length - 1]
  return card.suit === top.suit && card.rank === top.rank + 1
}

function loadHighScore(): number {
  if (typeof window === 'undefined') return 0
  try { return parseInt(localStorage.getItem(LS_HIGH_SCORE) || '0', 10) } catch { return 0 }
}

function saveHighScore(score: number): void {
  try { localStorage.setItem(LS_HIGH_SCORE, String(score)) } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// Sound Engine (Web Audio API)
// ══════════════════════════════════════════════════════════════════════════════

function createSoundEngine() {
  let ctx: AudioContext | null = null

  function getCtx(): AudioContext | null {
    try {
      if (!ctx) ctx = new AudioContext()
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      return ctx
    } catch { return null }
  }

  function cardFlip(enabled: boolean) {
    if (!enabled) return
    const c = getCtx(); if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.04)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(0.15, c.currentTime + 0.005)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.04)
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.04)
  }

  function cardPlace(enabled: boolean) {
    if (!enabled) return
    const c = getCtx(); if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.06)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.01)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.06)
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.06)
  }

  function shuffle(enabled: boolean) {
    if (!enabled) return
    const c = getCtx(); if (!c) return
    for (let i = 0; i < 6; i++) {
      const t = c.currentTime + i * 0.04
      const noise = c.createOscillator()
      const g = c.createGain()
      noise.connect(g); g.connect(c.destination)
      noise.type = 'sawtooth'
      noise.frequency.setValueAtTime(200 + Math.random() * 600, t)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.005)
      g.gain.linearRampToValueAtTime(0, t + 0.03)
      noise.start(t); noise.stop(t + 0.03)
    }
  }

  function winFanfare(enabled: boolean) {
    if (!enabled) return
    const c = getCtx(); if (!c) return
    const notes = [523, 587, 659, 784, 880, 1047] // C5 D5 E5 G5 A5 C6
    notes.forEach((freq, i) => {
      const t = c.currentTime + i * 0.12
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain); gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02)
      gain.gain.linearRampToValueAtTime(0, t + 0.11)
      osc.start(t); osc.stop(t + 0.12)
    })
  }

  function invalidMove(enabled: boolean) {
    if (!enabled) return
    const c = getCtx(); if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(c.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(150, c.currentTime)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(0.1, c.currentTime + 0.01)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.08)
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.08)
  }

  function cleanup() {
    if (ctx) { ctx.close().catch(() => {}); ctx = null }
  }

  return { cardFlip, cardPlace, shuffle, winFanfare, invalidMove, cleanup }
}

// ══════════════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════════════

export default function Solitaire() {
  const t = useTranslations('solitaire')

  // ── Game state ──
  const [gameState, setGameState] = useState<GameState>('playing')
  const [moveCount, setMoveCount] = useState(0)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [, forceRender] = useState(0)

  // ── Refs for game data (avoid re-renders during drag/animation) ──
  const tableauRef = useRef<Card[][]>([[], [], [], [], [], [], []])
  const foundationRef = useRef<Card[][]>([[], [], [], []])
  const stockRef = useRef<Card[]>([])
  const wasteRef = useRef<Card[]>([])
  const undoStackRef = useRef<MoveRecord[]>([])
  const dragRef = useRef<DragInfo | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const hintRef = useRef<HintInfo | null>(null)
  const hintBlinkRef = useRef(0)
  const animatingRef = useRef<AnimatingCard[]>([])
  const celebrationRef = useRef<CelebrationCard[]>([])
  const autoCompleteRunning = useRef(false)

  // ── Canvas refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const dprRef = useRef(1)
  const canvasWidthRef = useRef(0)
  const canvasHeightRef = useRef(0)
  const rafRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gameStartedRef = useRef(false)
  const gameStateRef = useRef<GameState>('playing')
  const scoreRef = useRef(0)
  const moveCountRef = useRef(0)
  const soundEnabledRef = useRef(true)
  const soundEngineRef = useRef(createSoundEngine())
  const isDarkRef = useRef(false)

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState }, [gameState])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { moveCountRef.current = moveCount }, [moveCount])
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])

  // ── Sound toggle persistence ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem('solitaire_sound')
      if (stored !== null) setSoundEnabled(stored === 'true')
    } catch { /* ignore */ }
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      try { localStorage.setItem('solitaire_sound', String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  // ── Dark mode detection ──
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const check = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark') || mq.matches
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    mq.addEventListener('change', check)
    return () => { observer.disconnect(); mq.removeEventListener('change', check) }
  }, [])

  // ── High score ──
  useEffect(() => {
    setHighScore(loadHighScore())
  }, [])

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      saveHighScore(score)
    }
  }, [score, highScore])

  // ── Layout calculation ──
  const getLayout = useCallback(() => {
    const s = scaleRef.current * dprRef.current
    const cw = canvasWidthRef.current / s
    const totalTableauWidth = 7 * CARD_W + 6 * PILE_GAP
    const leftPad = Math.max(10, Math.floor((cw - totalTableauWidth) / 2))

    // Stock & waste at top-left, foundations at top-right
    const stockX = leftPad
    const stockY = FOUNDATION_Y
    const wasteX = stockX + CARD_W + PILE_GAP
    const wasteY = FOUNDATION_Y

    const foundationXs: number[] = []
    for (let i = 0; i < 4; i++) {
      foundationXs.push(leftPad + 3 * (CARD_W + PILE_GAP) + i * (CARD_W + PILE_GAP))
    }

    const tableauXs: number[] = []
    for (let i = 0; i < 7; i++) {
      tableauXs.push(leftPad + i * (CARD_W + PILE_GAP))
    }

    return { stockX, stockY, wasteX, wasteY, foundationXs, tableauXs, leftPad }
  }, [])

  // ── Deal new game ──
  const dealNewGame = useCallback(() => {
    const deck = shuffleDeck(createDeck())
    const tableau: Card[][] = [[], [], [], [], [], [], []]
    let idx = 0
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = { ...deck[idx++] }
        card.faceUp = row === col
        tableau[col].push(card)
      }
    }
    const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }))

    tableauRef.current = tableau
    foundationRef.current = [[], [], [], []]
    stockRef.current = stock
    wasteRef.current = []
    undoStackRef.current = []
    dragRef.current = null
    hintRef.current = null
    animatingRef.current = []
    celebrationRef.current = []
    autoCompleteRunning.current = false

    setGameState('playing')
    setMoveCount(0)
    setScore(0)
    setElapsedTime(0)
    gameStartedRef.current = false

    soundEngineRef.current.shuffle(soundEnabledRef.current)
    forceRender(n => n + 1)
  }, [])

  // ── Timer ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (gameState === 'playing' && gameStartedRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState])

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  // ── Init on mount ──
  useEffect(() => {
    dealNewGame()
    return () => { soundEngineRef.current.cleanup() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Move validation & execution ──
  const addScore = useCallback((delta: number) => {
    setScore(prev => Math.max(0, prev + delta))
  }, [])

  const pushUndo = useCallback((record: MoveRecord) => {
    undoStackRef.current.push(record)
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift()
    }
  }, [])

  const flipTopCard = useCallback((pile: Card[]): boolean => {
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true
      soundEngineRef.current.cardFlip(soundEnabledRef.current)
      return true
    }
    return false
  }, [])

  const checkWin = useCallback((): boolean => {
    return foundationRef.current.every(pile => pile.length === 13)
  }, [])

  const canAutoComplete = useCallback((): boolean => {
    // All cards must be face up
    for (const pile of tableauRef.current) {
      for (const card of pile) {
        if (!card.faceUp) return false
      }
    }
    // Stock and waste must be empty
    return stockRef.current.length === 0 && wasteRef.current.length === 0
  }, [])

  // Try to move a card to foundation
  const tryMoveToFoundation = useCallback((card: Card, sourceType: PileType, sourceIndex: number): boolean => {
    for (let fi = 0; fi < 4; fi++) {
      const fPile = foundationRef.current[fi]
      if (canStackOnFoundation(card, fPile)) {
        // Remove from source
        let removedCards: Card[] = []
        let flipped = false
        if (sourceType === 'tableau') {
          const pile = tableauRef.current[sourceIndex]
          removedCards = pile.splice(pile.length - 1, 1)
          flipped = flipTopCard(pile)
          if (flipped) addScore(SCORE_REVEAL_CARD)
        } else if (sourceType === 'waste') {
          removedCards = wasteRef.current.splice(wasteRef.current.length - 1, 1)
        }

        fPile.push(card)

        const scoreDelta = SCORE_TABLEAU_TO_FOUNDATION + (flipped ? SCORE_REVEAL_CARD : 0)
        addScore(SCORE_TABLEAU_TO_FOUNDATION)

        pushUndo({
          type: 'move',
          from: { type: sourceType, index: sourceIndex },
          to: { type: 'foundation', index: fi },
          cards: removedCards,
          flippedCard: flipped,
          scoreChange: scoreDelta,
          wasFromStock: false,
        })

        setMoveCount(prev => prev + 1)
        soundEngineRef.current.cardPlace(soundEnabledRef.current)

        if (checkWin()) {
          setGameState('won')
          soundEngineRef.current.winFanfare(soundEnabledRef.current)
          startCelebration()
        }
        return true
      }
    }
    return false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addScore, pushUndo, flipTopCard, checkWin])

  // ── Stock click ──
  const clickStock = useCallback(() => {
    if (!gameStartedRef.current) {
      gameStartedRef.current = true
      setElapsedTime(0)
      // re-trigger timer
      setGameState(prev => prev)
    }

    if (stockRef.current.length === 0) {
      // Recycle waste back to stock
      if (wasteRef.current.length === 0) return
      stockRef.current = wasteRef.current.reverse().map(c => ({ ...c, faceUp: false }))
      wasteRef.current = []
      soundEngineRef.current.cardFlip(soundEnabledRef.current)
      pushUndo({
        type: 'move',
        from: { type: 'waste', index: 0 },
        to: { type: 'stock', index: 0 },
        cards: [],
        flippedCard: false,
        scoreChange: 0,
        wasFromStock: true,
      })
      forceRender(n => n + 1)
      return
    }

    // Draw 1 card
    const card = stockRef.current.pop()!
    card.faceUp = true
    wasteRef.current.push(card)

    pushUndo({
      type: 'move',
      from: { type: 'stock', index: 0 },
      to: { type: 'waste', index: 0 },
      cards: [card],
      flippedCard: false,
      scoreChange: 0,
      wasFromStock: true,
    })

    soundEngineRef.current.cardFlip(soundEnabledRef.current)
    forceRender(n => n + 1)
  }, [pushUndo])

  // ── Undo ──
  const performUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || gameStateRef.current !== 'playing') return

    const record = undoStackRef.current.pop()!

    if (record.wasFromStock) {
      if (record.from.type === 'waste' && record.to.type === 'stock') {
        // Undo recycle: stock -> waste
        wasteRef.current = stockRef.current.reverse().map(c => ({ ...c, faceUp: true }))
        stockRef.current = []
      } else if (record.from.type === 'stock' && record.to.type === 'waste') {
        // Undo draw: waste -> stock
        const card = wasteRef.current.pop()
        if (card) {
          card.faceUp = false
          stockRef.current.push(card)
        }
      }
    } else {
      // Regular move: put cards back
      const { from, to, cards, flippedCard } = record

      // Remove from destination
      if (to.type === 'foundation') {
        foundationRef.current[to.index].splice(
          foundationRef.current[to.index].length - cards.length,
          cards.length
        )
      } else if (to.type === 'tableau') {
        tableauRef.current[to.index].splice(
          tableauRef.current[to.index].length - cards.length,
          cards.length
        )
      }

      // If we flipped a card, unflip it
      if (flippedCard && from.type === 'tableau') {
        const pile = tableauRef.current[from.index]
        if (pile.length > 0) {
          pile[pile.length - 1].faceUp = false
        }
      }

      // Put cards back to source
      if (from.type === 'tableau') {
        tableauRef.current[from.index].push(...cards)
      } else if (from.type === 'waste') {
        wasteRef.current.push(...cards)
      }
    }

    setScore(prev => Math.max(0, prev - record.scoreChange))
    setMoveCount(prev => Math.max(0, prev - 1))
    soundEngineRef.current.cardFlip(soundEnabledRef.current)
    forceRender(n => n + 1)
  }, [])

  // ── Hint system ──
  const findHint = useCallback((): HintInfo | null => {
    // 1. Check waste -> foundation
    if (wasteRef.current.length > 0) {
      const card = wasteRef.current[wasteRef.current.length - 1]
      for (let fi = 0; fi < 4; fi++) {
        if (canStackOnFoundation(card, foundationRef.current[fi])) {
          return { fromType: 'waste', fromIndex: 0, toType: 'foundation', toIndex: fi, cardId: card.id }
        }
      }
    }

    // 2. Check tableau -> foundation
    for (let ti = 0; ti < 7; ti++) {
      const pile = tableauRef.current[ti]
      if (pile.length === 0) continue
      const top = pile[pile.length - 1]
      if (!top.faceUp) continue
      for (let fi = 0; fi < 4; fi++) {
        if (canStackOnFoundation(top, foundationRef.current[fi])) {
          return { fromType: 'tableau', fromIndex: ti, toType: 'foundation', toIndex: fi, cardId: top.id }
        }
      }
    }

    // 3. Check tableau -> tableau
    for (let ti = 0; ti < 7; ti++) {
      const pile = tableauRef.current[ti]
      // Find first face-up card
      let firstFaceUp = -1
      for (let ci = 0; ci < pile.length; ci++) {
        if (pile[ci].faceUp) { firstFaceUp = ci; break }
      }
      if (firstFaceUp < 0) continue

      const movingCard = pile[firstFaceUp]
      for (let tj = 0; tj < 7; tj++) {
        if (ti === tj) continue
        const target = tableauRef.current[tj]
        if (target.length === 0) {
          if (movingCard.rank === 13 && firstFaceUp > 0) {
            return { fromType: 'tableau', fromIndex: ti, toType: 'tableau', toIndex: tj, cardId: movingCard.id }
          }
        } else {
          const targetTop = target[target.length - 1]
          if (canStackOnTableau(movingCard, targetTop)) {
            return { fromType: 'tableau', fromIndex: ti, toType: 'tableau', toIndex: tj, cardId: movingCard.id }
          }
        }
      }
    }

    // 4. Check waste -> tableau
    if (wasteRef.current.length > 0) {
      const card = wasteRef.current[wasteRef.current.length - 1]
      for (let ti = 0; ti < 7; ti++) {
        const pile = tableauRef.current[ti]
        if (pile.length === 0) {
          if (card.rank === 13) {
            return { fromType: 'waste', fromIndex: 0, toType: 'tableau', toIndex: ti, cardId: card.id }
          }
        } else {
          const top = pile[pile.length - 1]
          if (canStackOnTableau(card, top)) {
            return { fromType: 'waste', fromIndex: 0, toType: 'tableau', toIndex: ti, cardId: card.id }
          }
        }
      }
    }

    // 5. If stock has cards, suggest clicking stock
    if (stockRef.current.length > 0) {
      return { fromType: 'stock', fromIndex: 0, toType: 'waste', toIndex: 0, cardId: -1 }
    }

    return null
  }, [])

  const showHint = useCallback(() => {
    if (gameStateRef.current !== 'playing') return
    const hint = findHint()
    hintRef.current = hint
    hintBlinkRef.current = 0
    if (!hint) {
      soundEngineRef.current.invalidMove(soundEnabledRef.current)
    }
    forceRender(n => n + 1)
  }, [findHint])

  // ── Auto-complete ──
  const doAutoComplete = useCallback(() => {
    if (autoCompleteRunning.current) return
    if (!canAutoComplete()) return
    autoCompleteRunning.current = true

    const interval = setInterval(() => {
      let moved = false
      // Try to move any tableau top card to foundation
      for (let ti = 0; ti < 7; ti++) {
        const pile = tableauRef.current[ti]
        if (pile.length === 0) continue
        const card = pile[pile.length - 1]
        for (let fi = 0; fi < 4; fi++) {
          if (canStackOnFoundation(card, foundationRef.current[fi])) {
            pile.pop()
            foundationRef.current[fi].push(card)
            addScore(SCORE_TABLEAU_TO_FOUNDATION)
            setMoveCount(prev => prev + 1)
            soundEngineRef.current.cardPlace(soundEnabledRef.current)
            moved = true
            break
          }
        }
        if (moved) break
      }

      forceRender(n => n + 1)

      if (!moved || checkWin()) {
        clearInterval(interval)
        autoCompleteRunning.current = false
        if (checkWin()) {
          setGameState('won')
          soundEngineRef.current.winFanfare(soundEnabledRef.current)
          startCelebration()
        }
      }
    }, 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addScore, checkWin])

  // ── Celebration ──
  const startCelebration = useCallback(() => {
    const layout = getLayout()
    const cards: CelebrationCard[] = []
    for (let fi = 0; fi < 4; fi++) {
      const pile = foundationRef.current[fi]
      const x = layout.foundationXs[fi]
      for (const card of pile) {
        cards.push({
          card,
          x,
          y: FOUNDATION_Y,
          vx: (Math.random() - 0.5) * 8,
          vy: -(Math.random() * 4 + 2),
          rotation: 0,
          vr: (Math.random() - 0.5) * 0.2,
        })
      }
    }
    celebrationRef.current = cards
  }, [getLayout])

  // ── Hit testing ──
  const getCanvasCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / scaleRef.current,
      y: (clientY - rect.top) / scaleRef.current,
    }
  }, [])

  const hitTest = useCallback((x: number, y: number): { type: PileType; index: number; cardIndex: number } | null => {
    const layout = getLayout()

    // Stock
    if (x >= layout.stockX && x <= layout.stockX + CARD_W && y >= layout.stockY && y <= layout.stockY + CARD_H) {
      return { type: 'stock', index: 0, cardIndex: 0 }
    }

    // Waste (only top card)
    if (wasteRef.current.length > 0) {
      if (x >= layout.wasteX && x <= layout.wasteX + CARD_W && y >= layout.wasteY && y <= layout.wasteY + CARD_H) {
        return { type: 'waste', index: 0, cardIndex: wasteRef.current.length - 1 }
      }
    }

    // Foundation piles
    for (let fi = 0; fi < 4; fi++) {
      const fx = layout.foundationXs[fi]
      if (x >= fx && x <= fx + CARD_W && y >= FOUNDATION_Y && y <= FOUNDATION_Y + CARD_H) {
        return { type: 'foundation', index: fi, cardIndex: Math.max(0, foundationRef.current[fi].length - 1) }
      }
    }

    // Tableau (check from bottom card up for proper overlap detection)
    for (let ti = 0; ti < 7; ti++) {
      const tx = layout.tableauXs[ti]
      const pile = tableauRef.current[ti]
      if (pile.length === 0) {
        // Empty pile slot
        if (x >= tx && x <= tx + CARD_W && y >= TABLEAU_Y && y <= TABLEAU_Y + CARD_H) {
          return { type: 'tableau', index: ti, cardIndex: -1 }
        }
        continue
      }

      // Check from bottom-most card up
      for (let ci = pile.length - 1; ci >= 0; ci--) {
        const cy = TABLEAU_Y + ci * (pile[ci].faceUp ? CARD_GAP_FACE_UP : CARD_GAP_FACE_DOWN)
        const ch = ci === pile.length - 1 ? CARD_H : (pile[ci + 1].faceUp ? CARD_GAP_FACE_UP : CARD_GAP_FACE_DOWN)
        if (x >= tx && x <= tx + CARD_W && y >= cy && y <= cy + ch) {
          return { type: 'tableau', index: ti, cardIndex: ci }
        }
      }
    }

    return null
  }, [getLayout])

  // ── Drag handling ──
  const startDrag = useCallback((x: number, y: number) => {
    if (gameStateRef.current !== 'playing') return

    if (!gameStartedRef.current) {
      gameStartedRef.current = true
      setElapsedTime(0)
      setGameState('playing') // retrigger timer
    }

    hintRef.current = null
    const hit = hitTest(x, y)
    if (!hit) return

    if (hit.type === 'stock') {
      clickStock()
      return
    }

    if (hit.type === 'waste' && wasteRef.current.length > 0) {
      const card = wasteRef.current[wasteRef.current.length - 1]
      const layout = getLayout()
      dragRef.current = {
        cards: [card],
        sourceType: 'waste',
        sourceIndex: 0,
        offsetX: x - layout.wasteX,
        offsetY: y - layout.wasteY,
        startX: layout.wasteX,
        startY: layout.wasteY,
      }
      return
    }

    if (hit.type === 'foundation' && foundationRef.current[hit.index].length > 0) {
      const pile = foundationRef.current[hit.index]
      const card = pile[pile.length - 1]
      const layout = getLayout()
      dragRef.current = {
        cards: [card],
        sourceType: 'foundation',
        sourceIndex: hit.index,
        offsetX: x - layout.foundationXs[hit.index],
        offsetY: y - FOUNDATION_Y,
        startX: layout.foundationXs[hit.index],
        startY: FOUNDATION_Y,
      }
      return
    }

    if (hit.type === 'tableau') {
      const pile = tableauRef.current[hit.index]
      if (hit.cardIndex < 0 || pile.length === 0) return
      const card = pile[hit.cardIndex]
      if (!card.faceUp) return

      const cardsToMove = pile.slice(hit.cardIndex)
      const layout = getLayout()
      const cardY = TABLEAU_Y + hit.cardIndex * (card.faceUp ? CARD_GAP_FACE_UP : CARD_GAP_FACE_DOWN)
      dragRef.current = {
        cards: cardsToMove,
        sourceType: 'tableau',
        sourceIndex: hit.index,
        offsetX: x - layout.tableauXs[hit.index],
        offsetY: y - cardY,
        startX: layout.tableauXs[hit.index],
        startY: cardY,
      }
      return
    }
  }, [hitTest, clickStock, getLayout])

  const moveDrag = useCallback((x: number, y: number) => {
    mouseRef.current = { x, y }
  }, [])

  const endDrag = useCallback((x: number, y: number) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null

    const layout = getLayout()
    let placed = false

    // Try to drop on foundation
    for (let fi = 0; fi < 4; fi++) {
      const fx = layout.foundationXs[fi]
      if (x >= fx - 10 && x <= fx + CARD_W + 10 && y >= FOUNDATION_Y - 10 && y <= FOUNDATION_Y + CARD_H + 10) {
        if (drag.cards.length === 1 && canStackOnFoundation(drag.cards[0], foundationRef.current[fi])) {
          // Remove from source
          let flipped = false
          if (drag.sourceType === 'tableau') {
            const pile = tableauRef.current[drag.sourceIndex]
            pile.splice(pile.length - drag.cards.length, drag.cards.length)
            flipped = flipTopCard(pile)
            if (flipped) addScore(SCORE_REVEAL_CARD)
          } else if (drag.sourceType === 'waste') {
            wasteRef.current.pop()
          } else if (drag.sourceType === 'foundation') {
            foundationRef.current[drag.sourceIndex].pop()
          }

          foundationRef.current[fi].push(drag.cards[0])

          let scoreDelta = SCORE_TABLEAU_TO_FOUNDATION + (flipped ? SCORE_REVEAL_CARD : 0)
          if (drag.sourceType === 'foundation') scoreDelta = 0
          addScore(drag.sourceType === 'foundation' ? 0 : SCORE_TABLEAU_TO_FOUNDATION)

          pushUndo({
            type: 'move',
            from: { type: drag.sourceType, index: drag.sourceIndex },
            to: { type: 'foundation', index: fi },
            cards: drag.cards,
            flippedCard: flipped,
            scoreChange: scoreDelta,
            wasFromStock: false,
          })

          setMoveCount(prev => prev + 1)
          soundEngineRef.current.cardPlace(soundEnabledRef.current)
          placed = true

          if (checkWin()) {
            setGameState('won')
            soundEngineRef.current.winFanfare(soundEnabledRef.current)
            startCelebration()
          }
          break
        }
      }
    }

    // Try to drop on tableau
    if (!placed) {
      for (let ti = 0; ti < 7; ti++) {
        const tx = layout.tableauXs[ti]
        const pile = tableauRef.current[ti]
        const pileBottom = TABLEAU_Y + (pile.length > 0 ? pile.length * CARD_GAP_FACE_UP : 0) + CARD_H

        if (x >= tx - 10 && x <= tx + CARD_W + 10 && y >= TABLEAU_Y - 10 && y <= pileBottom + 20) {
          const movingFirst = drag.cards[0]
          let valid = false

          if (pile.length === 0) {
            valid = movingFirst.rank === 13
          } else {
            const topCard = pile[pile.length - 1]
            valid = canStackOnTableau(movingFirst, topCard)
          }

          if (valid) {
            // Remove from source
            let flipped = false
            let scoreDelta = 0

            if (drag.sourceType === 'tableau') {
              const srcPile = tableauRef.current[drag.sourceIndex]
              srcPile.splice(srcPile.length - drag.cards.length, drag.cards.length)
              flipped = flipTopCard(srcPile)
              if (flipped) {
                addScore(SCORE_REVEAL_CARD)
                scoreDelta += SCORE_REVEAL_CARD
              }
            } else if (drag.sourceType === 'waste') {
              wasteRef.current.pop()
              addScore(SCORE_STOCK_TO_TABLEAU)
              scoreDelta += SCORE_STOCK_TO_TABLEAU
            } else if (drag.sourceType === 'foundation') {
              foundationRef.current[drag.sourceIndex].pop()
              addScore(SCORE_FOUNDATION_TO_TABLEAU)
              scoreDelta += SCORE_FOUNDATION_TO_TABLEAU
            }

            pile.push(...drag.cards)

            pushUndo({
              type: 'move',
              from: { type: drag.sourceType, index: drag.sourceIndex },
              to: { type: 'tableau', index: ti },
              cards: drag.cards,
              flippedCard: flipped,
              scoreChange: scoreDelta,
              wasFromStock: false,
            })

            setMoveCount(prev => prev + 1)
            soundEngineRef.current.cardPlace(soundEnabledRef.current)
            placed = true
            break
          }
        }
      }
    }

    if (!placed) {
      // Check for double-click to foundation (quick tap in same spot)
      const dist = Math.abs(x - drag.startX - drag.offsetX) + Math.abs(y - drag.startY - drag.offsetY)
      if (dist < 5 && drag.cards.length === 1) {
        // Try auto-move to foundation
        const card = drag.cards[0]
        for (let fi = 0; fi < 4; fi++) {
          if (canStackOnFoundation(card, foundationRef.current[fi])) {
            let flipped = false
            let scoreDelta = SCORE_TABLEAU_TO_FOUNDATION
            if (drag.sourceType === 'tableau') {
              const pile = tableauRef.current[drag.sourceIndex]
              pile.splice(pile.length - 1, 1)
              flipped = flipTopCard(pile)
              if (flipped) {
                addScore(SCORE_REVEAL_CARD)
                scoreDelta += SCORE_REVEAL_CARD
              }
            } else if (drag.sourceType === 'waste') {
              wasteRef.current.pop()
            } else if (drag.sourceType === 'foundation') {
              foundationRef.current[drag.sourceIndex].pop()
              scoreDelta = 0
            }

            foundationRef.current[fi].push(card)
            if (drag.sourceType !== 'foundation') addScore(SCORE_TABLEAU_TO_FOUNDATION)

            pushUndo({
              type: 'move',
              from: { type: drag.sourceType, index: drag.sourceIndex },
              to: { type: 'foundation', index: fi },
              cards: [card],
              flippedCard: flipped,
              scoreChange: scoreDelta,
              wasFromStock: false,
            })

            setMoveCount(prev => prev + 1)
            soundEngineRef.current.cardPlace(soundEnabledRef.current)
            placed = true

            if (checkWin()) {
              setGameState('won')
              soundEngineRef.current.winFanfare(soundEnabledRef.current)
              startCelebration()
            }
            break
          }
        }
      }
    }

    if (!placed) {
      soundEngineRef.current.invalidMove(soundEnabledRef.current)
    }

    forceRender(n => n + 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLayout, flipTopCard, addScore, pushUndo, checkWin, startCelebration])

  // ── Double-click handler for quick foundation moves ──
  const handleDoubleClick = useCallback((x: number, y: number) => {
    if (gameStateRef.current !== 'playing') return
    const hit = hitTest(x, y)
    if (!hit) return

    let card: Card | null = null
    let sourceType: PileType = 'tableau'
    let sourceIndex = 0

    if (hit.type === 'waste' && wasteRef.current.length > 0) {
      card = wasteRef.current[wasteRef.current.length - 1]
      sourceType = 'waste'
      sourceIndex = 0
    } else if (hit.type === 'tableau') {
      const pile = tableauRef.current[hit.index]
      if (pile.length > 0 && pile[pile.length - 1].faceUp) {
        card = pile[pile.length - 1]
        sourceType = 'tableau'
        sourceIndex = hit.index
      }
    }

    if (card) {
      tryMoveToFoundation(card, sourceType, sourceIndex)
      forceRender(n => n + 1)
    }
  }, [hitTest, tryMoveToFoundation])

  // ── Canvas rendering ──
  const drawCard = useCallback((ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, faceUp: boolean, highlighted: boolean = false) => {
    const dark = isDarkRef.current

    ctx.save()

    // Card shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 2

    // Card body
    ctx.beginPath()
    ctx.roundRect(x, y, CARD_W, CARD_H, CARD_RADIUS)

    if (faceUp) {
      ctx.fillStyle = dark ? '#1f2937' : '#ffffff'
    } else {
      // Card back pattern
      const gradient = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H)
      if (dark) {
        gradient.addColorStop(0, '#1e40af')
        gradient.addColorStop(0.5, '#1d4ed8')
        gradient.addColorStop(1, '#1e40af')
      } else {
        gradient.addColorStop(0, '#2563eb')
        gradient.addColorStop(0.5, '#3b82f6')
        gradient.addColorStop(1, '#2563eb')
      }
      ctx.fillStyle = gradient
    }
    ctx.fill()

    // Card border
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = highlighted
      ? '#fbbf24'
      : (dark ? '#374151' : '#d1d5db')
    ctx.lineWidth = highlighted ? 2.5 : 1
    ctx.stroke()

    if (highlighted) {
      // Glow effect
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }

    if (!faceUp) {
      // Card back decoration
      ctx.beginPath()
      ctx.roundRect(x + 4, y + 4, CARD_W - 8, CARD_H - 8, CARD_RADIUS - 2)
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Diamond pattern on back
      const cx = x + CARD_W / 2
      const cy = y + CARD_H / 2
      ctx.beginPath()
      ctx.moveTo(cx, cy - 16)
      ctx.lineTo(cx + 12, cy)
      ctx.lineTo(cx, cy + 16)
      ctx.lineTo(cx - 12, cy)
      ctx.closePath()
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)'
      ctx.fill()

      ctx.restore()
      return
    }

    // Face-up card content
    const isRed = suitColor(card.suit) === 'red'
    const textColor = isRed
      ? (dark ? '#f87171' : '#dc2626')
      : (dark ? '#e5e7eb' : '#1f2937')
    const suitSymbol = SUIT_SYMBOLS[card.suit]
    const label = rankLabel(card.rank)

    // Top-left rank + suit
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = textColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x + 5, y + 4)
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillText(suitSymbol, x + 5, y + 18)

    // Bottom-right rank + suit (inverted)
    ctx.save()
    ctx.translate(x + CARD_W - 5, y + CARD_H - 4)
    ctx.rotate(Math.PI)
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, 0, 0)
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.fillText(suitSymbol, 0, 14)
    ctx.restore()

    // Center suit (large)
    ctx.font = '28px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (card.rank >= 11) {
      // Face card - show letter + suit
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
      ctx.fillText(label, x + CARD_W / 2, y + CARD_H / 2 - 8)
      ctx.font = '20px system-ui, -apple-system, sans-serif'
      ctx.fillText(suitSymbol, x + CARD_W / 2, y + CARD_H / 2 + 16)
    } else if (card.rank === 1) {
      // Ace - large suit
      ctx.font = '36px system-ui, -apple-system, sans-serif'
      ctx.fillText(suitSymbol, x + CARD_W / 2, y + CARD_H / 2)
    } else {
      // Number cards - arrange suit symbols in pattern
      drawPips(ctx, card, x, y, suitSymbol, textColor)
    }

    ctx.restore()
  }, [])

  // Draw pip layout for number cards
  const drawPips = useCallback((ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, suitSymbol: string, color: string) => {
    const cx = x + CARD_W / 2
    const top = y + 22
    const bot = y + CARD_H - 22
    const mid = y + CARD_H / 2
    const left = x + 16
    const right = x + CARD_W - 16

    ctx.font = '15px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const pip = (px: number, py: number, flip: boolean = false) => {
      if (flip) {
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(Math.PI)
        ctx.fillText(suitSymbol, 0, 0)
        ctx.restore()
      } else {
        ctx.fillText(suitSymbol, px, py)
      }
    }

    const n = card.rank
    // Pip positions based on standard playing card layouts
    if (n === 2) {
      pip(cx, top); pip(cx, bot, true)
    } else if (n === 3) {
      pip(cx, top); pip(cx, mid); pip(cx, bot, true)
    } else if (n === 4) {
      pip(left, top); pip(right, top); pip(left, bot, true); pip(right, bot, true)
    } else if (n === 5) {
      pip(left, top); pip(right, top); pip(cx, mid); pip(left, bot, true); pip(right, bot, true)
    } else if (n === 6) {
      pip(left, top); pip(right, top); pip(left, mid); pip(right, mid); pip(left, bot, true); pip(right, bot, true)
    } else if (n === 7) {
      pip(left, top); pip(right, top); pip(cx, (top + mid) / 2)
      pip(left, mid); pip(right, mid); pip(left, bot, true); pip(right, bot, true)
    } else if (n === 8) {
      pip(left, top); pip(right, top); pip(cx, (top + mid) / 2)
      pip(left, mid); pip(right, mid)
      pip(cx, (mid + bot) / 2, true)
      pip(left, bot, true); pip(right, bot, true)
    } else if (n === 9) {
      pip(left, top); pip(right, top)
      pip(left, top + (mid - top) * 0.4); pip(right, top + (mid - top) * 0.4)
      pip(cx, mid)
      pip(left, mid + (bot - mid) * 0.6, true); pip(right, mid + (bot - mid) * 0.6, true)
      pip(left, bot, true); pip(right, bot, true)
    } else if (n === 10) {
      pip(left, top); pip(right, top)
      pip(cx, top + (mid - top) * 0.3)
      pip(left, top + (mid - top) * 0.5); pip(right, top + (mid - top) * 0.5)
      pip(left, mid + (bot - mid) * 0.5, true); pip(right, mid + (bot - mid) * 0.5, true)
      pip(cx, mid + (bot - mid) * 0.7, true)
      pip(left, bot, true); pip(right, bot, true)
    }
  }, [])

  const drawEmptyPile = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, label?: string) => {
    const dark = isDarkRef.current
    ctx.beginPath()
    ctx.roundRect(x, y, CARD_W, CARD_H, CARD_RADIUS)
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])

    if (label) {
      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x + CARD_W / 2, y + CARD_H / 2)
    }
  }, [])

  // ── Main render loop ──
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dark = isDarkRef.current
    const sd = scaleRef.current * dprRef.current
    const w = canvasWidthRef.current / sd
    const h = canvasHeightRef.current / sd

    // Background - green felt
    if (dark) {
      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, '#0f3320')
      gradient.addColorStop(1, '#0a2618')
      ctx.fillStyle = gradient
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, '#15803d')
      gradient.addColorStop(1, '#166534')
      ctx.fillStyle = gradient
    }
    ctx.fillRect(0, 0, w, h)

    // Subtle felt texture
    ctx.globalAlpha = dark ? 0.03 : 0.05
    for (let i = 0; i < 200; i++) {
      const tx = Math.random() * w
      const ty = Math.random() * h
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
      ctx.fillRect(tx, ty, 1, 1)
    }
    ctx.globalAlpha = 1.0

    const layout = getLayout()
    const hint = hintRef.current
    const hintBlink = hint ? Math.sin(hintBlinkRef.current * 4) > 0 : false

    // ── Draw stock pile ──
    if (stockRef.current.length === 0) {
      // Draw recycle arrow icon
      drawEmptyPile(ctx, layout.stockX, layout.stockY)
      if (wasteRef.current.length > 0) {
        ctx.font = '24px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.6)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('\u21BB', layout.stockX + CARD_W / 2, layout.stockY + CARD_H / 2)
      }
    } else {
      const stockHighlight = !!(hintBlink && hint && hint.fromType === 'stock')
      drawCard(ctx, stockRef.current[stockRef.current.length - 1], layout.stockX, layout.stockY, false, stockHighlight)
      // Card count badge
      if (stockRef.current.length > 1) {
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const badgeX = layout.stockX + CARD_W - 8
        const badgeY = layout.stockY + 8
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(String(stockRef.current.length), badgeX, badgeY)
      }
    }

    // ── Draw waste pile ──
    if (wasteRef.current.length === 0) {
      drawEmptyPile(ctx, layout.wasteX, layout.wasteY)
    } else {
      const topWaste = wasteRef.current[wasteRef.current.length - 1]
      const isDragging = dragRef.current && dragRef.current.sourceType === 'waste'
      if (!isDragging) {
        const wasteHighlight = !!(hintBlink && hint && hint.fromType === 'waste' && hint.cardId === topWaste.id)
        drawCard(ctx, topWaste, layout.wasteX, layout.wasteY, true, wasteHighlight)
      }
    }

    // ── Draw foundation piles ──
    for (let fi = 0; fi < 4; fi++) {
      const fx = layout.foundationXs[fi]
      const pile = foundationRef.current[fi]
      const suitLabel = SUIT_SYMBOLS[SUITS[fi]]

      if (pile.length === 0) {
        drawEmptyPile(ctx, fx, FOUNDATION_Y, suitLabel)
      } else {
        const top = pile[pile.length - 1]
        const isTargetHighlight = !!(hintBlink && hint && hint.toType === 'foundation' && hint.toIndex === fi)
        drawCard(ctx, top, fx, FOUNDATION_Y, true, isTargetHighlight)
      }
    }

    // ── Draw tableau ──
    for (let ti = 0; ti < 7; ti++) {
      const tx = layout.tableauXs[ti]
      const pile = tableauRef.current[ti]

      if (pile.length === 0) {
        const isTargetHighlight = hintBlink && hint && hint.toType === 'tableau' && hint.toIndex === ti
        drawEmptyPile(ctx, tx, TABLEAU_Y, isTargetHighlight ? 'K' : '')
        if (isTargetHighlight) {
          ctx.beginPath()
          ctx.roundRect(tx, TABLEAU_Y, CARD_W, CARD_H, CARD_RADIUS)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }
        continue
      }

      const drag = dragRef.current
      const isDraggingFromThis = drag && drag.sourceType === 'tableau' && drag.sourceIndex === ti

      for (let ci = 0; ci < pile.length; ci++) {
        const card = pile[ci]
        const cy = TABLEAU_Y + ci * (card.faceUp ? CARD_GAP_FACE_UP : CARD_GAP_FACE_DOWN)

        // Skip cards being dragged
        if (isDraggingFromThis) {
          const dragStartIdx = pile.length - drag.cards.length
          if (ci >= dragStartIdx) continue
        }

        const isHinted = !!(hintBlink && hint && hint.fromType === 'tableau' && hint.fromIndex === ti && hint.cardId === card.id)
        const isTargetHint = !!(hintBlink && hint && hint.toType === 'tableau' && hint.toIndex === ti && ci === pile.length - 1)
        drawCard(ctx, card, tx, cy, card.faceUp, isHinted || isTargetHint)
      }
    }

    // ── Draw dragged cards ──
    if (dragRef.current) {
      const drag = dragRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const dx = mx - drag.offsetX
      const dy = my - drag.offsetY

      ctx.globalAlpha = 0.9
      for (let i = 0; i < drag.cards.length; i++) {
        drawCard(ctx, drag.cards[i], dx, dy + i * CARD_GAP_FACE_UP, true)
      }
      ctx.globalAlpha = 1.0
    }

    // ── Draw celebration ──
    if (celebrationRef.current.length > 0) {
      const gravity = 0.15
      let anyVisible = false

      for (const cc of celebrationRef.current) {
        cc.vy += gravity
        cc.x += cc.vx
        cc.y += cc.vy
        cc.rotation += cc.vr

        // Bounce off bottom
        if (cc.y > h - CARD_H) {
          cc.y = h - CARD_H
          cc.vy *= -0.6
          cc.vx *= 0.95
        }
        // Bounce off sides
        if (cc.x < 0 || cc.x > w - CARD_W) {
          cc.vx *= -0.8
          cc.x = Math.max(0, Math.min(w - CARD_W, cc.x))
        }

        if (cc.y < h + CARD_H) anyVisible = true

        ctx.save()
        ctx.translate(cc.x + CARD_W / 2, cc.y + CARD_H / 2)
        ctx.rotate(cc.rotation)
        drawCard(ctx, cc.card, -CARD_W / 2, -CARD_H / 2, true)
        ctx.restore()
      }

      if (!anyVisible) {
        celebrationRef.current = []
      }
    }

    // ── Win overlay ──
    if (gameStateRef.current === 'won') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, h)
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#fbbf24'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('\uD83C\uDFC6', w / 2, h / 2 - 40)
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(t('youWin'), w / 2, h / 2)
      ctx.font = '16px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#d1d5db'
      ctx.fillText(`${t('score')}: ${scoreRef.current}`, w / 2, h / 2 + 35)
    }

    // Advance hint blink
    if (hintRef.current) {
      hintBlinkRef.current += 0.05
      if (hintBlinkRef.current > Math.PI * 6) {
        hintRef.current = null // Auto-clear hint after ~3 seconds
      }
    }

    rafRef.current = requestAnimationFrame(render)
  }, [getLayout, drawCard, drawEmptyPile, drawPips, t])

  // ── Canvas sizing ──
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const maxW = container.clientWidth
    const logicalW = 7 * CARD_W + 6 * PILE_GAP + 30
    const neededH = TABLEAU_Y + 13 * CARD_GAP_FACE_UP + CARD_H + 20

    const scale = Math.min(maxW / logicalW, 1.5)
    scaleRef.current = scale

    const displayW = Math.floor(logicalW * scale)
    const displayH = Math.floor(neededH * scale)

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    canvasWidthRef.current = canvas.width
    canvasHeightRef.current = canvas.height

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    }
  }, [])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  // ── Start render loop ──
  useEffect(() => {
    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [render])

  // ── Mouse events ──
  const lastClickTime = useRef(0)
  const lastClickPos = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY)

    const now = Date.now()
    const dx = x - lastClickPos.current.x
    const dy = y - lastClickPos.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (now - lastClickTime.current < 350 && dist < 10) {
      handleDoubleClick(x, y)
      lastClickTime.current = 0
      return
    }

    lastClickTime.current = now
    lastClickPos.current = { x, y }

    mouseRef.current = { x, y }
    startDrag(x, y)
  }, [getCanvasCoords, startDrag, handleDoubleClick])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    moveDrag(x, y)
  }, [getCanvasCoords, moveDrag])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    endDrag(x, y)
  }, [getCanvasCoords, endDrag])

  // ── Touch events ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY)

    const now = Date.now()
    const dx = x - lastClickPos.current.x
    const dy = y - lastClickPos.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (now - lastClickTime.current < 350 && dist < 15) {
      handleDoubleClick(x, y)
      lastClickTime.current = 0
      return
    }

    lastClickTime.current = now
    lastClickPos.current = { x, y }

    mouseRef.current = { x, y }
    startDrag(x, y)
  }, [getCanvasCoords, startDrag, handleDoubleClick])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY)
    moveDrag(x, y)
  }, [getCanvasCoords, moveDrag])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return
    const { x, y } = mouseRef.current
    endDrag(x, y)
  }, [endDrag])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          performUndo()
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        showHint()
      }
      if (e.key === 'n' || e.key === 'N') {
        dealNewGame()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [performUndo, showHint, dealNewGame])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Stats bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Play className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">{t('moves')}:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{moveCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-400">{t('time')}:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 dark:text-gray-400">{t('score')}:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{score}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-500 dark:text-gray-400">{t('highScore')}:</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">{highScore}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={dealNewGame}
              className="flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
              title={t('newGame')}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newGame')}</span>
            </button>
            <button
              onClick={performUndo}
              disabled={undoStackRef.current.length === 0 || gameState !== 'playing'}
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={`${t('undo')} (Ctrl+Z)`}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('undo')}</span>
            </button>
            <button
              onClick={showHint}
              disabled={gameState !== 'playing'}
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={`${t('hint')} (H)`}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">{t('hint')}</span>
            </button>
            {canAutoComplete() && gameState === 'playing' && (
              <button
                onClick={doAutoComplete}
                className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-lg px-3 py-2 text-sm font-medium hover:from-yellow-600 hover:to-amber-600 transition-all animate-pulse"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">{t('autoComplete')}</span>
              </button>
            )}
            <button
              onClick={toggleSound}
              className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg p-2 transition-all"
              title={soundEnabled ? t('soundOn') : t('soundOff')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Game canvas */}
      <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="mx-auto cursor-pointer rounded-lg"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Win message */}
      {gameState === 'won' && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 rounded-xl shadow-lg p-6 text-center">
          <div className="text-4xl mb-3">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">{t('congratulations')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('score')}: <span className="font-bold text-green-600 dark:text-green-400">{score}</span>
            {' \u00B7 '}
            {t('moves')}: <span className="font-bold">{moveCount}</span>
            {' \u00B7 '}
            {t('time')}: <span className="font-bold">{formatTime(elapsedTime)}</span>
          </p>
          <button
            onClick={dealNewGame}
            className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-6 py-3 font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
          >
            {t('newGame')}
          </button>
        </div>
      )}

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('guide')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('basicRules')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('basicRulesItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('controls')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('controlsItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('scoring')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('scoringItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">{t('tips')}</h3>
            <ul className="list-disc list-inside space-y-1">
              {(t.raw('tipsItems') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
