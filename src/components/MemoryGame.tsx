'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw, Trophy, Star, Clock, Zap, Volume2, VolumeX, BookOpen } from 'lucide-react'

// ── Types ──
type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'
type ThemeKey = 'emoji' | 'food' | 'sports' | 'korean' | 'numbers'
type GameState = 'menu' | 'playing' | 'won'

interface Card {
  id: number
  value: string
  flipped: boolean
  matched: boolean
}

interface BestScore {
  moves: number
  time: number
  stars: number
}

// ── Constants ──
const DIFFICULTY_CONFIG: Record<Difficulty, { cols: number; rows: number; pairs: number }> = {
  easy: { cols: 4, rows: 3, pairs: 6 },
  normal: { cols: 4, rows: 4, pairs: 8 },
  hard: { cols: 5, rows: 4, pairs: 10 },
  expert: { cols: 6, rows: 4, pairs: 12 },
}

const THEME_POOLS: Record<Exclude<ThemeKey, 'numbers'>, string[]> = {
  emoji: ['🐶', '🐱', '🐻', '🦊', '🐰', '🐸', '🐵', '🐯', '🦁', '🐮', '🐷', '🐨'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥐', '🌮', '🍣', '🍜', '🍩', '🧁'],
  sports: ['⚽', '🏀', '🎾', '⚾', '🏐', '🎱', '🏓', '🥊', '🏸', '🎳', '🥋', '🏹'],
  korean: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ'],
}

function generateNumberPool(): string[] {
  const numbers: number[] = []
  while (numbers.length < 12) {
    const n = Math.floor(Math.random() * 99) + 1
    if (!numbers.includes(n)) numbers.push(n)
  }
  return numbers.map(String)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function calcStars(moves: number, pairs: number): number {
  const minMoves = pairs
  if (moves <= minMoves * 1.5) return 3
  if (moves <= minMoves * 2.5) return 2
  return 1
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Sound via Web Audio API ──
function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Silently fail if Web Audio is not available
  }
}

function playFlipSound() { playTone(600, 0.08, 'sine', 0.1) }
function playMatchSound() { playTone(880, 0.15, 'sine', 0.12); setTimeout(() => playTone(1100, 0.2, 'sine', 0.12), 100) }
function playMismatchSound() { playTone(300, 0.15, 'triangle', 0.08) }
function playComboSound(combo: number) { playTone(660 + combo * 110, 0.2, 'sine', 0.15); setTimeout(() => playTone(880 + combo * 110, 0.25, 'sine', 0.15), 80) }
function playWinSound() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.15), i * 120))
}

// ── Confetti ──
interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotationSpeed: number
  life: number
}

function createConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const W = canvas.width = canvas.offsetWidth * 2
  const H = canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c471ed', '#f5af19']
  const particles: Particle[] = []
  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * W / 2, y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 8, vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4, rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12, life: 1,
    })
  }
  let running = true
  function animate() {
    if (!running) return
    ctx!.clearRect(0, 0, W / 2, H / 2)
    let alive = false
    for (const p of particles) {
      if (p.life <= 0) continue
      alive = true
      p.x += p.vx
      p.vy += 0.12
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.life -= 0.005
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate((p.rotation * Math.PI) / 180)
      ctx!.globalAlpha = Math.max(0, p.life)
      ctx!.fillStyle = p.color
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx!.restore()
    }
    if (alive) requestAnimationFrame(animate)
  }
  animate()
  return () => { running = false }
}

// ── Component ──
export default function MemoryGame() {
  const t = useTranslations('memoryGame')

  // State
  const [gameState, setGameState] = useState<GameState>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [theme, setTheme] = useState<ThemeKey>('emoji')
  const [cards, setCards] = useState<Card[]>([])
  const [firstFlipped, setFirstFlipped] = useState<number | null>(null)
  const [secondFlipped, setSecondFlipped] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [timer, setTimer] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [bestScores, setBestScores] = useState<Record<string, BestScore>>({})
  const [showComboText, setShowComboText] = useState(false)
  const [locked, setLocked] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const confettiRef = useRef<HTMLCanvasElement>(null)
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load best scores
  useEffect(() => {
    try {
      const saved = localStorage.getItem('memoryGame_bestScores')
      if (saved) setBestScores(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState])

  // Win detection
  useEffect(() => {
    if (gameState !== 'playing') return
    const config = DIFFICULTY_CONFIG[difficulty]
    if (matchedPairs === config.pairs) {
      if (timerRef.current) clearInterval(timerRef.current)
      setGameState('won')
      if (soundEnabled) playWinSound()
      // Save best score
      const stars = calcStars(moves, config.pairs)
      const key = `${difficulty}_${theme}`
      const current = bestScores[key]
      if (!current || moves < current.moves || (moves === current.moves && timer < current.time)) {
        const updated = { ...bestScores, [key]: { moves, time: timer, stars } }
        setBestScores(updated)
        try { localStorage.setItem('memoryGame_bestScores', JSON.stringify(updated)) } catch { /* */ }
      }
      // Confetti
      setTimeout(() => {
        if (confettiRef.current) createConfetti(confettiRef.current)
      }, 300)
    }
  }, [matchedPairs, gameState, difficulty, theme, moves, timer, soundEnabled, bestScores])

  // Start game
  const startGame = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty]
    const pool = theme === 'numbers' ? generateNumberPool() : THEME_POOLS[theme]
    const selected = shuffle(pool).slice(0, config.pairs)
    const doubled = shuffle([...selected, ...selected])
    setCards(doubled.map((value, i) => ({ id: i, value, flipped: false, matched: false })))
    setFirstFlipped(null)
    setSecondFlipped(null)
    setMoves(0)
    setMatchedPairs(0)
    setTimer(0)
    setCombo(0)
    setMaxCombo(0)
    setLocked(false)
    setGameState('playing')
  }, [difficulty, theme])

  // Flip card
  const flipCard = useCallback((id: number) => {
    if (locked) return
    const card = cards[id]
    if (!card || card.flipped || card.matched) return

    if (soundEnabled) playFlipSound()

    if (firstFlipped === null) {
      setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c))
      setFirstFlipped(id)
    } else if (secondFlipped === null && id !== firstFlipped) {
      setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c))
      setSecondFlipped(id)
      setMoves(m => m + 1)
      setLocked(true)

      const first = cards[firstFlipped]
      const second = cards[id]

      if (first.value === second.value) {
        // Match
        const newCombo = combo + 1
        setCombo(newCombo)
        setMaxCombo(prev => Math.max(prev, newCombo))
        if (soundEnabled) {
          if (newCombo >= 2) playComboSound(newCombo)
          else playMatchSound()
        }
        if (newCombo >= 2) {
          setShowComboText(true)
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current)
          comboTimerRef.current = setTimeout(() => setShowComboText(false), 1000)
        }
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstFlipped || c.id === id ? { ...c, matched: true } : c
          ))
          setMatchedPairs(mp => mp + 1)
          setFirstFlipped(null)
          setSecondFlipped(null)
          setLocked(false)
        }, 400)
      } else {
        // No match
        setCombo(0)
        if (soundEnabled) setTimeout(() => playMismatchSound(), 400)
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstFlipped || c.id === id ? { ...c, flipped: false } : c
          ))
          setFirstFlipped(null)
          setSecondFlipped(null)
          setLocked(false)
        }, 800)
      }
    }
  }, [cards, firstFlipped, secondFlipped, locked, combo, soundEnabled])

  // Reset game
  const resetGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameState('menu')
  }, [])

  const config = DIFFICULTY_CONFIG[difficulty]
  const stars = calcStars(moves, config.pairs)
  const bestKey = `${difficulty}_${theme}`
  const best = bestScores[bestKey]

  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
  const themes: ThemeKey[] = ['emoji', 'food', 'sports', 'korean', 'numbers']

  const difficultyColors: Record<Difficulty, string> = {
    easy: 'bg-green-100 dark:bg-green-900/40 border-green-400 text-green-800 dark:text-green-300',
    normal: 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-800 dark:text-blue-300',
    hard: 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 text-orange-800 dark:text-orange-300',
    expert: 'bg-red-100 dark:bg-red-900/40 border-red-400 text-red-800 dark:text-red-300',
  }

  // ── Menu Screen ──
  if (gameState === 'menu') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        <div className="max-w-xl mx-auto space-y-6">
          {/* Difficulty selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('selectDifficulty')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {difficulties.map(d => {
                const cfg = DIFFICULTY_CONFIG[d]
                const isSelected = difficulty === d
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? `${difficultyColors[d]} border-current ring-2 ring-offset-2 ring-current dark:ring-offset-gray-800 scale-[1.02]`
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                  >
                    <div className={`font-bold text-base ${isSelected ? '' : 'text-gray-900 dark:text-white'}`}>
                      {t(`difficulty.${d}`)}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {cfg.cols}x{cfg.rows} ({cfg.pairs} {t('pairs')})
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Theme selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('selectTheme')}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {themes.map(th => {
                const isSelected = theme === th
                const preview = th === 'numbers' ? '42' : (THEME_POOLS[th]?.[0] ?? '')
                return (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-700 scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">{preview}</div>
                    <div className={`text-xs font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                      {t(`theme.${th}`)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Best score display */}
          {best && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{t('bestRecord')}</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-yellow-700 dark:text-yellow-400">
                <span>{best.moves} {t('movesUnit')}</span>
                <span>{formatTime(best.time)}</span>
                <span>{'★'.repeat(best.stars)}{'☆'.repeat(3 - best.stars)}</span>
              </div>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 py-4 text-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {t('startGame')}
          </button>
        </div>

        {/* Guide */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('guide.howToPlay.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.howToPlay.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                    <span className="text-blue-500 shrink-0">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('guide.scoring.title')}</h3>
              <ul className="space-y-1">
                {(t.raw('guide.scoring.items') as string[]).map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                    <span className="text-yellow-500 shrink-0">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Win Screen ──
  if (gameState === 'won') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        </div>

        <div className="max-w-lg mx-auto relative">
          <canvas
            ref={confettiRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center relative z-0">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('congratulations')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('winMessage')}</p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <Star
                  key={s}
                  className={`w-10 h-10 transition-all duration-500 ${
                    s <= stars
                      ? 'text-yellow-400 fill-yellow-400 scale-110'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                  style={{ transitionDelay: `${s * 200}ms` }}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{moves}</div>
                <div className="text-xs text-blue-500 dark:text-blue-400">{t('movesUnit')}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatTime(timer)}</div>
                <div className="text-xs text-green-500 dark:text-green-400">{t('timeLabel')}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{maxCombo}x</div>
                <div className="text-xs text-purple-500 dark:text-purple-400">{t('maxCombo')}</div>
              </div>
            </div>

            {/* Best record indicator */}
            {best && best.moves === moves && best.time === timer && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-300 font-semibold">
                  <Trophy className="w-5 h-5" />
                  {t('newRecord')}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98]"
              >
                {t('playAgain')}
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200"
              >
                {t('backToMenu')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing Screen ──
  const progressPct = (matchedPairs / config.pairs) * 100

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
            title={soundEnabled ? t('soundOn') : t('soundOff')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('menu')}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">{t('movesLabel')}:</span>
              <span className="font-bold text-gray-900 dark:text-white">{moves}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="font-bold text-gray-900 dark:text-white">{formatTime(timer)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {combo >= 2 && (
              <div className={`flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold transition-all duration-300 ${showComboText ? 'scale-125' : 'scale-100'}`}>
                {combo}x {t('comboLabel')}!
              </div>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {matchedPairs}/{config.pairs} {t('pairs')}
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex justify-center">
        <div
          className="grid gap-2 sm:gap-3 w-full"
          style={{
            maxWidth: `${Math.min(config.cols * 100, 600)}px`,
            gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          }}
        >
          {cards.map(card => {
            const isFlipped = card.flipped || card.matched
            const isKoreanTheme = theme === 'korean'
            const isNumberTheme = theme === 'numbers'
            const showText = isKoreanTheme || isNumberTheme

            return (
              <button
                key={card.id}
                onClick={() => flipCard(card.id)}
                disabled={card.flipped || card.matched || locked}
                className={`relative aspect-square rounded-xl transition-transform duration-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  card.matched ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{ perspective: '1000px' }}
              >
                <div
                  className="relative w-full h-full transition-transform duration-500 ease-in-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Back (hidden state) */}
                  <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 shadow-md hover:shadow-lg transition-shadow"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="text-white/30 text-3xl sm:text-4xl font-bold">?</div>
                  </div>
                  {/* Front (revealed state) */}
                  <div
                    className={`absolute inset-0 rounded-xl flex items-center justify-center shadow-md ${
                      card.matched
                        ? 'bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400 dark:ring-green-500'
                        : 'bg-white dark:bg-gray-700'
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    {showText ? (
                      <span className={`font-bold ${
                        isKoreanTheme
                          ? 'text-2xl sm:text-3xl text-gray-800 dark:text-white'
                          : 'text-xl sm:text-2xl text-blue-700 dark:text-blue-300'
                      }`}>
                        {card.value}
                      </span>
                    ) : (
                      <span className="text-3xl sm:text-4xl select-none">{card.value}</span>
                    )}
                    {card.matched && (
                      <div className="absolute inset-0 rounded-xl animate-pulse bg-green-400/10 pointer-events-none" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty & Theme tag */}
      <div className="flex justify-center gap-2 text-xs">
        <span className={`px-3 py-1 rounded-full border ${difficultyColors[difficulty]}`}>
          {t(`difficulty.${difficulty}`)}
        </span>
        <span className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
          {t(`theme.${theme}`)}
        </span>
      </div>
    </div>
  )
}
