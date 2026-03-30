'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitBranch, Play, RefreshCw, Share2, Check, Save, Users, Target, Zap, BookMarked, Camera, ChevronDown, ChevronUp } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import GuideSection from '@/components/GuideSection'

interface LadderLine {
  fromIndex: number
  toIndex: number
  position: number
}

interface ParticipantInfo {
  name: string
  animal: string
}

interface PathPoint {
  x: number
  y: number
}

interface Sparkle {
  id: number
  x: number
  y: number
  color: string
  createdAt: number
}

interface RoundRecord {
  round: number
  results: Record<string, string>
}

// Participant colors (up to 8)
const COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

// Preset configurations
interface Preset {
  id: string
  participants: ParticipantInfo[]
  outcomes: string[]
}

const PRESETS: Preset[] = [
  {
    id: 'lunch',
    participants: [
      { name: '나', animal: '🐶' }, { name: '친구1', animal: '🐱' },
      { name: '친구2', animal: '🐭' }, { name: '친구3', animal: '🐹' }
    ],
    outcomes: ['짜장면', '짬뽕', '라면', '김밥']
  },
  {
    id: 'duty',
    participants: [
      { name: '1번', animal: '🐶' }, { name: '2번', animal: '🐱' }, { name: '3번', animal: '🐭' }
    ],
    outcomes: ['당번', '당번', '면제']
  },
  {
    id: 'gameOrder',
    participants: [
      { name: '플레이어1', animal: '🐶' }, { name: '플레이어2', animal: '🐱' },
      { name: '플레이어3', animal: '🐭' }, { name: '플레이어4', animal: '🐹' }
    ],
    outcomes: ['1순위', '2순위', '3순위', '4순위']
  },
  {
    id: 'teams',
    participants: [
      { name: '참가자1', animal: '🐶' }, { name: '참가자2', animal: '🐱' },
      { name: '참가자3', animal: '🐭' }, { name: '참가자4', animal: '🐹' }
    ],
    outcomes: ['A팀', 'B팀', 'A팀', 'B팀']
  },
  {
    id: 'coffee',
    participants: [
      { name: '나', animal: '🐶' }, { name: '동료1', animal: '🐱' }, { name: '동료2', animal: '🐭' }
    ],
    outcomes: ['구매', '구매', '면제']
  },
]

// Easing functions
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// Seeded PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shuffle array with given random function
function shuffleArray<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Compute total length of polyline
function polylineLength(points: PathPoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

// Get (x, y) at progress t [0, 1] along a polyline
function pointAtProgress(points: PathPoint[], t: number): PathPoint {
  if (points.length === 0) return { x: 0, y: 0 }
  if (t <= 0) return points[0]
  if (t >= 1) return points[points.length - 1]

  const total = polylineLength(points)
  const target = total * t
  let acc = 0

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)
    if (acc + segLen >= target) {
      const ratio = segLen > 0 ? (target - acc) / segLen : 0
      return { x: points[i - 1].x + dx * ratio, y: points[i - 1].y + dy * ratio }
    }
    acc += segLen
  }
  return points[points.length - 1]
}

export default function LadderGame() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('ladder')
  const tCommon = useTranslations('common')

  const animalIcons = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄']

  const [participants, setParticipants] = useState<ParticipantInfo[]>([
    { name: '참가자1', animal: '🐶' },
    { name: '참가자2', animal: '🐱' },
    { name: '참가자3', animal: '🐭' },
  ])
  const [outcomes, setOutcomes] = useState<string[]>(['결과1', '결과2', '결과3'])
  const [ladderLines, setLadderLines] = useState<LadderLine[]>([])
  const [ladderComplexity, setLadderComplexity] = useState<number>(3)
  const [isPlaying, setIsPlaying] = useState(false)
  const [results, setResults] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState<number>(1500)

  // Animation state
  const [animProgress, setAnimProgress] = useState<Record<number, number>>({})
  const [tokenPos, setTokenPos] = useState<Record<number, PathPoint>>({})
  const [animatingIdx, setAnimatingIdx] = useState<number>(-1)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [revealedResults, setRevealedResults] = useState<Set<string>>(new Set())

  // Feature 5: Blind mode
  const [blindMode, setBlindMode] = useState(false)
  const [revealedOutcomes, setRevealedOutcomes] = useState<Set<number>>(new Set())

  // Feature 4: Reveal one by one
  const [revealOneByOne, setRevealOneByOne] = useState(false)
  const [manualRevealed, setManualRevealed] = useState<Set<string>>(new Set())

  // Feature 6: Multi-round
  const [rounds, setRounds] = useState<RoundRecord[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [showRoundHistory, setShowRoundHistory] = useState(false)

  // Feature: Position selection phase
  const [colAssignments, setColAssignments] = useState<(number | null)[]>([null, null, null])
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(null)
  const [isSelectionPhase, setIsSelectionPhase] = useState(false)

  // Feature 8: Seed-based
  const [currentSeed, setCurrentSeed] = useState<number>(0)

  // Feature 7: Image export
  const svgRef = useRef<SVGSVGElement>(null)

  const rafRef = useRef<number | undefined>(undefined)
  const sparkleCounter = useRef(0)

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('ladder')

  const applyPreset = useCallback((preset: Preset) => {
    setParticipants(preset.participants)
    setOutcomes(preset.outcomes)
    setLadderLines([])
    setResults({})
    setShowResults(false)
    setCompletedSet(new Set())
    setAnimProgress({})
    setTokenPos({})
    setRevealedOutcomes(new Set())
    setManualRevealed(new Set())
    setIsSelectionPhase(false)
    setColAssignments(preset.participants.map((_, i) => i))
    setSelectedParticipant(null)
  }, [])

  // ── Position assignment helpers ──────────────────────────────────
  const autoAssign = useCallback(() => {
    const shuffled = [...Array(participants.length).keys()].sort(() => Math.random() - 0.5)
    setColAssignments(shuffled)
    setSelectedParticipant(null)
  }, [participants.length])

  const assignInOrder = useCallback(() => {
    setColAssignments(Array.from({ length: participants.length }, (_, i) => i))
    setSelectedParticipant(null)
  }, [participants.length])

  // ── SVG layout ──────────────────────────────────────────────────
  const svgWidth = Math.max(320, participants.length * 90)
  const svgHeight = 380
  const TOP_PAD = 72
  const BOT_PAD = 72

  const maxLevel = ladderLines.length > 0
    ? Math.max(...ladderLines.map(l => l.position))
    : 9
  const numLevels = maxLevel + 1
  const levelHeight = (svgHeight - TOP_PAD - BOT_PAD) / numLevels
  const colWidth = svgWidth / (participants.length + 1)

  const getX = useCallback((col: number) => colWidth * (col + 1), [colWidth])
  const getRungY = useCallback((level: number) => TOP_PAD + levelHeight * (level + 0.5), [levelHeight])

  // ── Path calculation ─────────────────────────────────────────────
  const calcPathIndices = useCallback((startIdx: number): number[] => {
    const path = [startIdx]
    let cur = startIdx
    for (let lv = 0; lv <= maxLevel; lv++) {
      for (const rung of ladderLines) {
        if (rung.position !== lv) continue
        if (rung.fromIndex === cur) { cur = rung.toIndex; break }
        if (rung.toIndex === cur) { cur = rung.fromIndex; break }
      }
      path.push(cur)
    }
    return path
  }, [ladderLines, maxLevel])

  // Build polyline points for smooth SVG animation
  const buildPathPoints = useCallback((startIdx: number): PathPoint[] => {
    const indices = calcPathIndices(startIdx)
    const pts: PathPoint[] = []
    pts.push({ x: getX(indices[0]), y: TOP_PAD })

    for (let l = 0; l < indices.length - 1; l++) {
      const from = indices[l]
      const to = indices[l + 1]
      if (from !== to) {
        const ry = getRungY(l)
        pts.push({ x: getX(from), y: ry })
        pts.push({ x: getX(to), y: ry })
      }
    }
    const finalPos = indices[indices.length - 1]
    pts.push({ x: getX(finalPos), y: svgHeight - BOT_PAD })
    return pts
  }, [calcPathIndices, getX, getRungY, svgHeight])

  // Cached path points per participant
  const pathPointsRef = useRef<PathPoint[][]>([])
  const pathLengthsRef = useRef<number[]>([])

  // ── URL helpers ──────────────────────────────────────────────────
  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k)
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // ── Participants / outcomes ──────────────────────────────────────
  const addParticipant = () => {
    if (participants.length >= 8) return
    const used = new Set(participants.map(p => p.animal))
    const free = animalIcons.filter(a => !used.has(a))
    const animal = free.length > 0
      ? free[Math.floor(Math.random() * free.length)]
      : animalIcons[participants.length % animalIcons.length]
    const next = [...participants, { name: `참가자${participants.length + 1}`, animal }]
    const nextO = [...outcomes, `결과${outcomes.length + 1}`]
    setParticipants(next)
    setOutcomes(nextO)
    updateURL({
      participants: JSON.stringify(next.map(p => ({ name: p.name, animal: p.animal }))),
      outcomes: JSON.stringify(nextO),
    })
  }

  const removeParticipant = (idx: number) => {
    if (participants.length <= 2) return
    const next = participants.filter((_, i) => i !== idx)
    const nextO = outcomes.filter((_, i) => i !== idx)
    setParticipants(next)
    setOutcomes(nextO)
    updateURL({
      participants: JSON.stringify(next.map(p => ({ name: p.name, animal: p.animal }))),
      outcomes: JSON.stringify(nextO),
    })
  }

  const updateParticipant = (idx: number, value: string) => {
    const updated = [...participants]
    updated[idx] = { ...updated[idx], name: value }
    setParticipants(updated)
    updateURL({ participants: JSON.stringify(updated.map(p => ({ name: p.name, animal: p.animal }))) })
  }

  const updateParticipantAnimal = (idx: number, animal: string) => {
    const updated = [...participants]
    updated[idx] = { ...updated[idx], animal }
    setParticipants(updated)
    updateURL({ participants: JSON.stringify(updated.map(p => ({ name: p.name, animal: p.animal }))) })
  }

  const updateOutcome = (idx: number, value: string) => {
    const updated = [...outcomes]
    updated[idx] = value
    setOutcomes(updated)
    updateURL({ outcomes: JSON.stringify(updated) })
  }

  // ── Generate ladder (seed-based) ───────────────────────────────
  const generateLadder = useCallback((seed?: number) => {
    const usedSeed = seed ?? Date.now()
    const rand = mulberry32(usedSeed)

    const lines: LadderLine[] = []
    const ladderHeight = Math.max(8, 6 + ladderComplexity * 2)
    const probMap: Record<number, number> = { 1: 0.25, 2: 0.4, 3: 0.6, 4: 0.8 }
    const prob = probMap[ladderComplexity] ?? 0.5

    for (let level = 0; level < ladderHeight; level++) {
      const used = new Set<number>()
      for (let i = 0; i < participants.length - 1; i++) {
        if (!used.has(i) && !used.has(i + 1) && rand() < prob) {
          lines.push({ fromIndex: i, toIndex: i + 1, position: level })
          used.add(i)
          used.add(i + 1)
        }
      }
    }

    setLadderLines(lines)
    setShowResults(false)
    setResults({})
    setAnimProgress({})
    setTokenPos({})
    setAnimatingIdx(-1)
    setCompletedSet(new Set())
    setSparkles([])
    setRevealedResults(new Set())
    setRevealedOutcomes(new Set())
    setManualRevealed(new Set())
    setCurrentSeed(usedSeed)

    // Enter position selection phase
    setColAssignments(Array(participants.length).fill(null))
    setSelectedParticipant(null)
    setIsSelectionPhase(true)

    // Update URL with seed
    const params = new URLSearchParams(searchParams)
    params.set('seed', usedSeed.toString())
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [ladderComplexity, participants.length, searchParams, router])

  // ── Add sparkle effect ───────────────────────────────────────────
  const addSparkle = (x: number, y: number, color: string) => {
    const id = sparkleCounter.current++
    setSparkles(prev => [...prev.slice(-20), { id, x, y, color, createdAt: performance.now() }])
  }

  // Clean up old sparkles
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now()
      setSparkles(prev => prev.filter(s => now - s.createdAt < 800))
    }, 200)
    return () => clearInterval(id)
  }, [])

  // ── Core animation engine ────────────────────────────────────────
  const animateOne = useCallback((participantIdx: number, onDone: () => void) => {
    const pts = pathPointsRef.current[participantIdx]
    if (!pts || pts.length === 0) { onDone(); return }

    const duration = animationSpeed
    const startTime = performance.now()

    // Track which "turn" points we've sparkled
    let lastSparkleT = -0.1

    const frame = (now: number) => {
      const rawT = Math.min((now - startTime) / duration, 1)
      const easedT = easeInOutCubic(rawT)

      setAnimProgress(prev => ({ ...prev, [participantIdx]: easedT }))
      const pos = pointAtProgress(pts, easedT)
      setTokenPos(prev => ({ ...prev, [participantIdx]: pos }))

      // Detect when we're near a "horizontal" segment (direction change) → sparkle
      if (easedT - lastSparkleT > 0.08) {
        // Check if we crossed a turn point
        for (let i = 1; i < pts.length - 1; i++) {
          const prevPt = pts[i - 1]
          const thisPt = pts[i]
          const nextPt = pts[i + 1]
          const isPivot = Math.abs(prevPt.x - thisPt.x) < 1 && Math.abs(thisPt.y - nextPt.y) < 1
          if (!isPivot) continue
          // t of this pivot point
          const lenToPivot = polylineLength(pts.slice(0, i + 1))
          const total = polylineLength(pts)
          const pivotT = total > 0 ? lenToPivot / total : 0
          if (Math.abs(easedT - pivotT) < 0.06 && Math.abs(lastSparkleT - pivotT) > 0.05) {
            addSparkle(thisPt.x, thisPt.y, COLORS[participantIdx % COLORS.length])
            lastSparkleT = pivotT
          }
        }
      }

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        onDone()
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }, [animationSpeed])

  // ── Play ladder (all participants sequentially) ────────────────
  const playLadder = useCallback(() => {
    if (isPlaying || ladderLines.length === 0) return

    // Exit selection phase
    setIsSelectionPhase(false)

    // Pre-compute all paths (per column)
    pathPointsRef.current = participants.map((_, col) => buildPathPoints(col))
    pathLengthsRef.current = pathPointsRef.current.map(polylineLength)

    // Compute results based on colAssignments
    const finalResults: Record<string, string> = {}
    colAssignments.forEach((participantIdx, col) => {
      if (participantIdx === null) return
      const indices = calcPathIndices(col)
      finalResults[participants[participantIdx].name] = outcomes[indices[indices.length - 1]]
    })

    setIsPlaying(true)
    setShowResults(false)
    setResults({})
    setAnimProgress({})
    setTokenPos({})
    setCompletedSet(new Set())
    setSparkles([])
    setRevealedResults(new Set())
    setManualRevealed(new Set())

    const runNext = (col: number) => {
      if (col >= participants.length) {
        // All done
        setResults(finalResults)
        setShowResults(true)
        setIsPlaying(false)
        setShowSaveButton(true)
        setAnimatingIdx(-1)

        // Blind mode: reveal all outcomes
        if (blindMode) {
          const allOutcomeIndices = new Set<number>()
          colAssignments.forEach((pIdx, c) => {
            if (pIdx === null) return
            const indices = calcPathIndices(c)
            allOutcomeIndices.add(indices[indices.length - 1])
          })
          setRevealedOutcomes(allOutcomeIndices)
        }

        // Reveal results one by one (unless revealOneByOne mode)
        if (!revealOneByOne) {
          colAssignments.forEach((pIdx, i) => {
            if (pIdx === null) return
            const name = participants[pIdx].name
            setTimeout(() => {
              setRevealedResults(prev => new Set([...prev, name]))
            }, i * 150)
          })
        } else {
          // In revealOneByOne mode, set revealedResults to all so cards show but hidden
          setRevealedResults(new Set(participants.map(p => p.name)))
        }
        return
      }

      setAnimatingIdx(col)
      animateOne(col, () => {
        setCompletedSet(prev => new Set([...prev, col]))
        setAnimatingIdx(-1)
        // Short pause between columns
        setTimeout(() => runNext(col + 1), 400)
      })
    }

    setTimeout(() => runNext(0), 200)
  }, [isPlaying, ladderLines, participants, outcomes, colAssignments, buildPathPoints, calcPathIndices, animateOne, blindMode, revealOneByOne])

  // ── Feature 1: Play single participant ─────────────────────────
  const playSingle = useCallback((participantIdx: number) => {
    if (isPlaying || ladderLines.length === 0) return

    // Find which column this participant is assigned to
    const col = colAssignments.indexOf(participantIdx)
    if (col === -1) return // not assigned

    // If already completed this column, skip
    if (completedSet.has(col)) return

    // Pre-compute path for this column if not already done
    if (!pathPointsRef.current[col]) {
      pathPointsRef.current = participants.map((_, i) => buildPathPoints(i))
      pathLengthsRef.current = pathPointsRef.current.map(polylineLength)
    }

    const indices = calcPathIndices(col)
    const outcomeIdx = indices[indices.length - 1]
    const outcome = outcomes[outcomeIdx]

    setIsPlaying(true)
    setAnimatingIdx(col)

    animateOne(col, () => {
      setCompletedSet(prev => new Set([...prev, col]))
      setAnimatingIdx(-1)
      setIsPlaying(false)
      // Accumulate results (don't overwrite)
      setResults(prev => ({ ...prev, [participants[participantIdx].name]: outcome }))
      setShowResults(true)
      setShowSaveButton(true)

      // Blind mode: reveal this outcome column
      if (blindMode) {
        setRevealedOutcomes(prev => new Set([...prev, outcomeIdx]))
      }

      // Reveal one by one mode: add to revealedResults but not manualRevealed
      if (!revealOneByOne) {
        setRevealedResults(prev => new Set([...prev, participants[participantIdx].name]))
      } else {
        setRevealedResults(prev => new Set([...prev, participants[participantIdx].name]))
      }
    })
  }, [isPlaying, ladderLines, participants, outcomes, colAssignments, buildPathPoints, calcPathIndices, animateOne, blindMode, revealOneByOne, completedSet])

  // Reset colAssignments when participants count changes during selection phase
  useEffect(() => {
    if (isSelectionPhase) {
      setColAssignments(Array(participants.length).fill(null))
      setSelectedParticipant(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.length])

  // Stop animation on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Show results immediately ─────────────────────────────────────
  const showResultsOnly = () => {
    if (isPlaying) return

    // Exit selection phase
    setIsSelectionPhase(false)

    // Compute results based on colAssignments
    const finalResults: Record<string, string> = {}
    colAssignments.forEach((participantIdx, col) => {
      if (participantIdx === null) return
      const indices = calcPathIndices(col)
      finalResults[participants[participantIdx].name] = outcomes[indices[indices.length - 1]]
    })
    setResults(finalResults)
    setShowResults(true)
    setShowSaveButton(true)
    // Build all path data so trails show
    pathPointsRef.current = participants.map((_, i) => buildPathPoints(i))
    const fullProgress: Record<number, number> = {}
    const fullTokenPos: Record<number, PathPoint> = {}
    participants.forEach((_, i) => {
      fullProgress[i] = 1
      fullTokenPos[i] = pathPointsRef.current[i][pathPointsRef.current[i].length - 1]
    })
    setAnimProgress(fullProgress)
    setTokenPos(fullTokenPos)
    setCompletedSet(new Set(participants.map((_, i) => i)))

    // Blind mode: reveal all
    if (blindMode) {
      const allOutcomeIndices = new Set<number>()
      colAssignments.forEach((pIdx, col) => {
        if (pIdx === null) return
        const indices = calcPathIndices(col)
        allOutcomeIndices.add(indices[indices.length - 1])
      })
      setRevealedOutcomes(allOutcomeIndices)
    }

    if (!revealOneByOne) {
      setRevealedResults(new Set(participants.map(p => p.name)))
    } else {
      setRevealedResults(new Set(participants.map(p => p.name)))
    }
  }

  // ── Feature 3: Rematch (shuffle outcomes, new ladder) ──────────
  const handleRematch = useCallback(() => {
    const shuffled = shuffleArray(outcomes, Math.random)
    setOutcomes(shuffled)
    // Generate new ladder with new seed
    const newSeed = Date.now()
    setTimeout(() => {
      generateLadder(newSeed)
    }, 0)
  }, [outcomes, generateLadder])

  // ── Feature 3: Reshuffle ladder only (keep outcomes order) ─────
  const handleReshuffleLadder = useCallback(() => {
    const newSeed = Date.now()
    generateLadder(newSeed)
  }, [generateLadder])

  // ── Feature 6: Next round ──────────────────────────────────────
  const handleNextRound = useCallback(() => {
    if (Object.keys(results).length === 0) return
    setRounds(prev => [...prev, { round: currentRound, results: { ...results } }])
    setCurrentRound(prev => prev + 1)
    // Generate new ladder, keep participants and outcomes
    const newSeed = Date.now()
    generateLadder(newSeed)
  }, [results, currentRound, generateLadder])

  // ── Feature 7: Image export ────────────────────────────────────
  const exportImage = useCallback(async () => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const scale = 2
      const resultAreaHeight = 40 + Object.keys(results).length * 32
      const canvasWidth = (img.naturalWidth || svgWidth) * scale
      const canvasHeight = ((img.naturalHeight || svgHeight) + resultAreaHeight) * scale
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth / scale, canvasHeight / scale)
      ctx.drawImage(img, 0, 0, img.naturalWidth || svgWidth, img.naturalHeight || svgHeight)

      // Draw results below SVG
      if (Object.keys(results).length > 0) {
        const startY = (img.naturalHeight || svgHeight) + 16
        ctx.font = 'bold 16px sans-serif'
        ctx.fillStyle = '#1F2937'
        ctx.fillText('🎯 결과', 16, startY)

        let y = startY + 24
        Object.entries(results).forEach(([name, outcome]) => {
          const color = COLORS[participants.findIndex(p => p.name === name) % COLORS.length]
          const p = participants.find(p2 => p2.name === name)
          ctx.font = '14px sans-serif'
          ctx.fillStyle = '#374151'
          ctx.fillText(`${p?.animal || ''} ${name}  →  ${outcome}`, 20, y)
          ctx.fillStyle = color
          ctx.fillRect(canvasWidth / scale - 80, y - 12, 60, 18)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 11px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(outcome, canvasWidth / scale - 50, y)
          ctx.textAlign = 'start'
          y += 28
        })
      }

      canvas.toBlob(blob => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `사다리-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [results, participants, svgWidth, svgHeight])

  // ── URL init ─────────────────────────────────────────────────────
  useEffect(() => {
    const pp = searchParams.get('participants')
    const op = searchParams.get('outcomes')
    const cp = searchParams.get('complexity')
    const sp = searchParams.get('speed')
    const seedParam = searchParams.get('seed')

    const rp = searchParams.get('results')

    if (pp) { try { const v = JSON.parse(pp); if (Array.isArray(v)) setParticipants(v) } catch { /* ignore */ } }
    if (op) { try { const v = JSON.parse(op); if (Array.isArray(v)) setOutcomes(v) } catch { /* ignore */ } }
    if (cp) { const v = parseInt(cp); if ([1, 2, 3, 4].includes(v)) setLadderComplexity(v) }
    if (sp) { const v = parseInt(sp); if ([3000, 1500, 800].includes(v)) setAnimationSpeed(v) }
    if (rp) {
      try {
        const v = JSON.parse(rp)
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          setResults(v)
          setShowResults(true)
          setRevealedResults(new Set(Object.keys(v)))
        }
      } catch { /* ignore */ }
    }

    // Restore seed-based ladder
    if (seedParam) {
      const seed = parseInt(seedParam)
      if (!isNaN(seed)) {
        setCurrentSeed(seed)
        // Defer ladder generation to after state updates
        setTimeout(() => {
          // We need to use the parsed participants length for generation
          // Since generateLadder reads from state, defer it
        }, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generate ladder from seed when seed is set from URL and participants are ready
  const seedInitRef = useRef(false)
  useEffect(() => {
    if (seedInitRef.current) return
    const seedParam = searchParams.get('seed')
    if (seedParam && ladderLines.length === 0) {
      const seed = parseInt(seedParam)
      if (!isNaN(seed)) {
        seedInitRef.current = true
        // Need to generate with current participants/complexity
        const rand = mulberry32(seed)
        const lines: LadderLine[] = []
        const ladderHeight = Math.max(8, 6 + ladderComplexity * 2)
        const probMap: Record<number, number> = { 1: 0.25, 2: 0.4, 3: 0.6, 4: 0.8 }
        const prob = probMap[ladderComplexity] ?? 0.5
        for (let level = 0; level < ladderHeight; level++) {
          const used = new Set<number>()
          for (let i = 0; i < participants.length - 1; i++) {
            if (!used.has(i) && !used.has(i + 1) && rand() < prob) {
              lines.push({ fromIndex: i, toIndex: i + 1, position: level })
              used.add(i)
              used.add(i + 1)
            }
          }
        }
        setLadderLines(lines)
        setCurrentSeed(seed)
        // Enter selection phase for URL-restored ladders (unless results already exist)
        const rp = searchParams.get('results')
        if (rp) {
          // Results from URL — assign in order, skip selection
          setColAssignments(Array.from({ length: participants.length }, (_, i) => i))
          setIsSelectionPhase(false)
        } else {
          setColAssignments(Array(participants.length).fill(null))
          setSelectedParticipant(null)
          setIsSelectionPhase(true)
        }
      }
    }
  }, [searchParams, participants.length, ladderComplexity, ladderLines.length])

  // ── Share / save ─────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      // Build URL with seed included
      const params = new URLSearchParams(searchParams)
      if (currentSeed) params.set('seed', currentSeed.toString())
      params.set('participants', JSON.stringify(participants.map(p => ({ name: p.name, animal: p.animal }))))
      params.set('outcomes', JSON.stringify(outcomes))
      params.set('complexity', ladderComplexity.toString())
      params.set('speed', animationSpeed.toString())
      if (showResults && Object.keys(results).length > 0) {
        params.set('results', JSON.stringify(results))
      }

      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleSave = () => {
    if (Object.keys(results).length === 0) return
    saveCalculation(
      { participants, outcomes, ladderComplexity, ladderLinesCount: ladderLines.length, playedAt: new Date().toISOString() },
      { results: { ...results }, participantCount: participants.length }
    )
    setShowSaveButton(false)
  }

  // ── SVG rendering helpers ────────────────────────────────────────
  const ptsToStr = (pts: PathPoint[]) => pts.map(p => `${p.x},${p.y}`).join(' ')

  // Build clipped polyline up to progress t (for trail drawing effect)
  const buildTrailPoints = (pts: PathPoint[], tVal: number): PathPoint[] => {
    if (tVal <= 0 || pts.length === 0) return []
    if (tVal >= 1) return pts
    const total = polylineLength(pts)
    const target = total * tVal
    const trail: PathPoint[] = [pts[0]]
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x
      const dy = pts[i].y - pts[i - 1].y
      const seg = Math.sqrt(dx * dx + dy * dy)
      if (acc + seg >= target) {
        const r = seg > 0 ? (target - acc) / seg : 0
        trail.push({ x: pts[i - 1].x + dx * r, y: pts[i - 1].y + dy * r })
        break
      }
      trail.push(pts[i])
      acc += seg
    }
    return trail
  }

  const ladderReady = ladderLines.length > 0
  const allCompleted = completedSet.size === participants.length

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t('description')}</p>
        </div>
        <div className="flex-shrink-0">
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(historyId: string) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setParticipants(inputs.participants || [{ name: '참가자1', animal: '🐶' }, { name: '참가자2', animal: '🐱' }, { name: '참가자3', animal: '🐭' }])
              setOutcomes(inputs.outcomes || ['결과1', '결과2', '결과3'])
              setLadderComplexity(inputs.ladderComplexity || 3)
              generateLadder()
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: { inputs?: { participants?: unknown[] }; result?: { participantCount?: number; results?: Record<string, unknown> } }) => {
            if (!history.inputs || !history.result) return '빈 기록'
            return `참가자 ${history.result.participantCount ?? 0}명, 결과 ${Object.keys(history.result.results ?? {}).length}개`
          }}
        />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Settings panel ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2 text-green-600" />
            {t('settings.title')}
          </h2>

          <div className="space-y-6">
            {/* Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BookMarked className="inline w-4 h-4 mr-1 mb-0.5" />
                {t('presets.title')}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    disabled={isPlaying}
                    className="flex-shrink-0 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {t(`presets.${preset.id}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button — right after presets for quick access */}
            <button
              onClick={() => generateLadder()}
              disabled={isPlaying}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-green-200 dark:shadow-none"
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                <span>{t('generateLadder')}</span>
              </div>
            </button>

            {/* Position selection phase UI */}
            {isSelectionPhase && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    📍 위치 선택 ({colAssignments.filter(v => v !== null).length}/{participants.length} 배치)
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={autoAssign} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors">
                      🎲 랜덤 배치
                    </button>
                    <button onClick={assignInOrder} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      📋 순서대로
                    </button>
                  </div>
                </div>

                {/* Unassigned participants list */}
                <div className="flex flex-wrap gap-2">
                  {participants.map((p, idx) => {
                    if (colAssignments.includes(idx)) return null
                    const isSelected = selectedParticipant === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedParticipant(isSelected ? null : idx)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          ${isSelected
                            ? 'scale-105'
                            : 'hover:scale-105'
                          }`}
                        style={{
                          backgroundColor: `${COLORS[idx % COLORS.length]}22`,
                          color: COLORS[idx % COLORS.length],
                          ...(isSelected ? { outline: `2px solid ${COLORS[idx % COLORS.length]}`, outlineOffset: '1px' } : {})
                        }}
                      >
                        <span>{p.animal}</span>
                        <span>{p.name}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    )
                  })}
                  {colAssignments.every(v => v !== null) && (
                    <div className="w-full text-center text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                      ✅ 모두 배치 완료! 게임을 시작하세요.
                    </div>
                  )}
                </div>

                {selectedParticipant !== null && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    👆 오른쪽 사다리에서 원하는 열을 클릭하세요
                  </p>
                )}
              </div>
            )}

            {/* Participants */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.participants')} ({participants.length}명)
                </label>
                <button
                  onClick={addParticipant}
                  disabled={participants.length >= 8}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('settings.addParticipant')}
                </button>
              </div>
              <div className="space-y-2">
                {participants.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <select
                      value={p.animal}
                      onChange={e => updateParticipantAnimal(i, e.target.value)}
                      className="w-12 px-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-center flex-shrink-0"
                    >
                      {animalIcons.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => updateParticipant(i, e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder={`참가자 ${i + 1}`}
                    />
                    {participants.length > 2 && (
                      <button
                        onClick={() => removeParticipant(i)}
                        className="flex-shrink-0 px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        {tCommon('delete')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Outcomes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('settings.outcomes')}
              </label>
              <div className="space-y-2">
                {outcomes.map((o, i) => (
                  <input
                    key={i}
                    type="text"
                    value={o}
                    onChange={e => updateOutcome(i, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`결과 ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.complexity')}
              </label>
              <select
                value={ladderComplexity}
                onChange={e => { const v = parseInt(e.target.value); setLadderComplexity(v); updateURL({ complexity: v.toString() }) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>{t('settings.complexities.simple')} (25%)</option>
                <option value={2}>{t('settings.complexities.normal')} (40%)</option>
                <option value={3}>{t('settings.complexities.complex')} (60%)</option>
                <option value={4}>{t('settings.complexities.veryComplex')} (80%)</option>
              </select>
            </div>

            {/* Speed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.speed')}
              </label>
              <select
                value={animationSpeed}
                onChange={e => { const v = parseInt(e.target.value); setAnimationSpeed(v); updateURL({ speed: v.toString() }) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={3000}>{t('settings.speeds.slow')}</option>
                <option value={1500}>{t('settings.speeds.normal')}</option>
                <option value={800}>{t('settings.speeds.fast')}</option>
              </select>
            </div>

            {/* Feature 4 & 5: Mode toggles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                게임 모드
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBlindMode(prev => !prev)}
                  disabled={isPlaying}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    blindMode
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>🙈</span>
                  <span>블라인드</span>
                </button>
                <button
                  onClick={() => setRevealOneByOne(prev => !prev)}
                  disabled={isPlaying}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    revealOneByOne
                      ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>🎭</span>
                  <span>한명씩 공개</span>
                </button>
              </div>
            </div>

            {/* Round indicator */}
            {rounds.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {currentRound}라운드
                </span>
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  (총 {rounds.length}라운드 기록)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Ladder SVG + results ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <GitBranch className="w-6 h-6 mr-2 text-green-600" />
                {t('ladder.title')}
                {currentRound > 1 && (
                  <span className="ml-2 text-sm font-normal text-blue-500 dark:text-blue-400">
                    ({currentRound}라운드)
                  </span>
                )}
              </h3>
              {ladderReady && (() => {
                const allAssigned = !isSelectionPhase || colAssignments.every(v => v !== null)
                const buttonsDisabled = isPlaying || (isSelectionPhase && !allAssigned)
                return (
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => playLadder()}
                      disabled={buttonsDisabled}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 rounded-xl font-semibold text-sm hover:from-orange-600 hover:to-red-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
                    >
                      {isPlaying ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /><span>{t('playing')}</span></>
                      ) : (
                        <><Play className="w-4 h-4" /><span>{t('startGame')}</span></>
                      )}
                    </button>
                    <button
                      onClick={showResultsOnly}
                      disabled={buttonsDisabled}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 px-4 rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-indigo-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
                    >
                      <Zap className="w-4 h-4" /><span>{t('showResultsOnly')}</span>
                    </button>
                    {isSelectionPhase && !allAssigned && (
                      <div className="w-full text-center text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ⚠️ 모든 참가자를 배치한 후 게임을 시작할 수 있습니다
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Hint for individual play (only when not in selection phase) */}
            {ladderReady && !isPlaying && !allCompleted && !isSelectionPhase && (
              <div className="text-center mb-2">
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  🖱️ 아래 이름을 클릭하면 개별 확인 가능
                </span>
              </div>
            )}

            {/* Top labels: Selection phase → column slot picker; Game phase → participant labels with playSingle */}
            <div
              className="flex mb-2"
              style={{ paddingLeft: `${100 / (2 * (participants.length + 1))}%`, paddingRight: `${100 / (2 * (participants.length + 1))}%` }}
            >
              {isSelectionPhase ? (
                /* Column selection slots */
                <>
                  {Array.from({ length: participants.length }, (_, col) => {
                    const assignedIdx = colAssignments[col]
                    const isAssigned = assignedIdx !== null
                    const p = isAssigned ? participants[assignedIdx] : null
                    const isSelectedSlot = selectedParticipant !== null && !isAssigned

                    return (
                      <button
                        key={col}
                        onClick={() => {
                          if (isAssigned) {
                            // Cancel assignment
                            setColAssignments(prev => { const n = [...prev]; n[col] = null; return n })
                          } else if (selectedParticipant !== null) {
                            // Assign selected participant to this column
                            setColAssignments(prev => { const n = [...prev]; n[col] = selectedParticipant; return n })
                            setSelectedParticipant(null)
                          }
                        }}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-xs font-medium transition-all
                          ${isAssigned
                            ? 'cursor-pointer hover:opacity-70'
                            : isSelectedSlot
                              ? 'bg-green-100 dark:bg-green-900/40 border-2 border-dashed border-green-400 animate-pulse cursor-pointer'
                              : 'bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-default'
                          }`}
                        style={isAssigned ? {
                          color: COLORS[assignedIdx % COLORS.length],
                          background: `${COLORS[assignedIdx % COLORS.length]}18`,
                          boxShadow: `0 0 0 2px ${COLORS[assignedIdx % COLORS.length]}40`,
                        } : {}}
                      >
                        {isAssigned && p ? (
                          <>
                            <span className="text-base">{p.animal}</span>
                            <span className="truncate max-w-full">{p.name}</span>
                            <span className="text-[10px] opacity-60">✕ 취소</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg text-gray-400">{isSelectedSlot ? '📍' : '+'}</span>
                            <span className="text-gray-400">{col + 1}번</span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </>
              ) : (
                /* Game phase: participant labels with playSingle */
                <>
                  {participants.map((_, col) => {
                    const participantIdx = colAssignments[col]
                    if (participantIdx === null || participantIdx === undefined) return (
                      <div key={col} className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700">
                        <span className="text-gray-400">{col + 1}번</span>
                      </div>
                    )
                    const p = participants[participantIdx]
                    const isCompleted = completedSet.has(col)
                    const canClick = ladderReady && !isPlaying && !isCompleted
                    return (
                      <button
                        key={col}
                        onClick={() => canClick && playSingle(participantIdx)}
                        disabled={isPlaying || !ladderReady || isCompleted}
                        title={canClick ? `${p.name} 개별 실행` : isCompleted ? `${p.name} 완료` : '먼저 사다리를 생성하세요'}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-xs font-medium transition-all ${
                          canClick
                            ? 'hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-offset-1 dark:ring-offset-gray-800'
                            : isCompleted
                              ? 'opacity-50 cursor-default'
                              : 'hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed'
                        }`}
                        style={{
                          color: COLORS[participantIdx % COLORS.length],
                          background: `${COLORS[participantIdx % COLORS.length]}18`,
                          ...(canClick ? { boxShadow: `0 0 0 2px ${COLORS[participantIdx % COLORS.length]}40` } : {}),
                        }}
                      >
                        <span className={`text-base leading-none ${canClick ? 'animate-bounce' : ''}`}>{p.animal}</span>
                        <span className="truncate max-w-full">{p.name}</span>
                        {isCompleted && <span className="text-[10px]">✓</span>}
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            {/* SVG Ladder */}
            <div className="relative bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
              {!ladderReady ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-400 dark:text-gray-600">
                  <GitBranch className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">{t('ladder.placeholder')}</p>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full"
                  style={{ maxHeight: '360px' }}
                >
                  <defs>
                    {/* Glow filter per color */}
                    {COLORS.map((c, i) => (
                      <filter key={i} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feFlood floodColor={c} floodOpacity="0.6" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                          <feMergeNode in="glow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    ))}
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Vertical bars */}
                  {participants.map((_, col) => {
                    const pIdx = colAssignments[col]
                    const colorIdx = pIdx !== null && pIdx !== undefined ? pIdx : col
                    return (
                      <g key={col}>
                        <line
                          x1={getX(col)} y1={TOP_PAD}
                          x2={getX(col)} y2={svgHeight - BOT_PAD}
                          stroke={animatingIdx === col ? COLORS[colorIdx % COLORS.length] : '#CBD5E1'}
                          strokeWidth={animatingIdx === col ? 3.5 : 2.5}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </g>
                    )
                  })}

                  {/* Horizontal rungs */}
                  {ladderLines.map((rung, ri) => {
                    const ry = getRungY(rung.position)
                    const x1 = getX(rung.fromIndex)
                    const x2 = getX(rung.toIndex)
                    return (
                      <g key={ri}>
                        <line
                          x1={x1} y1={ry} x2={x2} y2={ry}
                          stroke="#93C5FD"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx={x1} cy={ry} r="3.5" fill="#3B82F6" />
                        <circle cx={x2} cy={ry} r="3.5" fill="#3B82F6" />
                      </g>
                    )
                  })}

                  {/* Completed paths (faded trail) — i is col index */}
                  {participants.map((_, col) => {
                    if (!completedSet.has(col) && animatingIdx !== col) return null
                    if (!pathPointsRef.current[col]) return null
                    const prog = animProgress[col] ?? 0
                    const trail = buildTrailPoints(pathPointsRef.current[col], prog)
                    if (trail.length < 2) return null
                    const pIdx = colAssignments[col]
                    const colorIdx = pIdx !== null && pIdx !== undefined ? pIdx : col
                    const color = COLORS[colorIdx % COLORS.length]
                    const isDone = completedSet.has(col)
                    return (
                      <polyline
                        key={col}
                        points={ptsToStr(trail)}
                        fill="none"
                        stroke={color}
                        strokeWidth={isDone ? 2.5 : 3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={isDone ? 0.35 : 0.85}
                        filter={isDone ? undefined : `url(#glow-${colorIdx % COLORS.length})`}
                        style={{ transition: isDone ? 'stroke-opacity 0.5s' : undefined }}
                      />
                    )
                  })}

                  {/* Active token (currently animating) — animatingIdx is col index */}
                  {animatingIdx >= 0 && tokenPos[animatingIdx] && (() => {
                    const { x, y } = tokenPos[animatingIdx]
                    const pIdx = colAssignments[animatingIdx]
                    const colorIdx = pIdx !== null && pIdx !== undefined ? pIdx : animatingIdx
                    const color = COLORS[colorIdx % COLORS.length]
                    const p = pIdx !== null && pIdx !== undefined ? participants[pIdx] : null
                    return (
                      <g key={animatingIdx} filter={`url(#glow-${colorIdx % COLORS.length})`}>
                        {/* Pulse ring */}
                        <circle cx={x} cy={y} r="18" fill={color} fillOpacity="0.15" />
                        {/* Token circle */}
                        <circle cx={x} cy={y} r="14" fill={color} fillOpacity="0.9" />
                        {/* Emoji */}
                        <text
                          x={x} y={y + 5}
                          textAnchor="middle"
                          fontSize="14"
                          style={{ userSelect: 'none' }}
                        >
                          {p?.animal ?? '?'}
                        </text>
                      </g>
                    )
                  })()}

                  {/* Completed tokens (small, at end) — i is col index */}
                  {participants.map((_, col) => {
                    if (!completedSet.has(col)) return null
                    const pts = pathPointsRef.current[col]
                    if (!pts || pts.length === 0) return null
                    const end = pts[pts.length - 1]
                    const pIdx = colAssignments[col]
                    const colorIdx = pIdx !== null && pIdx !== undefined ? pIdx : col
                    const color = COLORS[colorIdx % COLORS.length]
                    const p = pIdx !== null && pIdx !== undefined ? participants[pIdx] : null
                    return (
                      <g key={col} opacity="0.7">
                        <circle cx={end.x} cy={end.y} r="11" fill={color} fillOpacity="0.8" />
                        <text x={end.x} y={end.y + 4} textAnchor="middle" fontSize="11" style={{ userSelect: 'none' }}>{p?.animal ?? '?'}</text>
                      </g>
                    )
                  })}

                  {/* Sparkles */}
                  {sparkles.map(s => {
                    const age = (performance.now() - s.createdAt) / 800
                    const opacity = 1 - age
                    const scale = 0.5 + age * 1.5
                    return (
                      <g key={s.id} transform={`translate(${s.x},${s.y})`} opacity={Math.max(0, opacity)}>
                        {[0, 60, 120, 180, 240, 300].map(angle => {
                          const r = 10 * scale
                          const rad = (angle * Math.PI) / 180
                          return (
                            <circle
                              key={angle}
                              cx={Math.cos(rad) * r}
                              cy={Math.sin(rad) * r}
                              r="2.5"
                              fill={s.color}
                            />
                          )
                        })}
                      </g>
                    )
                  })}
                </svg>
              )}
            </div>

            {/* Outcome labels (bottom) — Feature 5: blind mode */}
            {ladderReady && (
              <div
                className="flex mt-2"
                style={{ paddingLeft: `${100 / (2 * (participants.length + 1))}%`, paddingRight: `${100 / (2 * (participants.length + 1))}%` }}
              >
                {outcomes.map((o, i) => (
                  <div key={i} className="flex-1 flex justify-center">
                    <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 px-2 py-1 rounded-lg max-w-full truncate text-center">
                      {isSelectionPhase || (blindMode && !revealedOutcomes.has(i)) ? '???' : o}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active participant indicator — animatingIdx is col index */}
            {isPlaying && animatingIdx >= 0 && (() => {
              const pIdx = colAssignments[animatingIdx]
              const p = pIdx !== null && pIdx !== undefined ? participants[pIdx] : null
              const colorIdx = pIdx !== null && pIdx !== undefined ? pIdx : animatingIdx
              const color = COLORS[colorIdx % COLORS.length]
              return (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ color }}>
                  <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: color }} />
                  <span>{p?.animal ?? '?'} {p?.name ?? '?'} 이동 중...</span>
                </div>
              )
            })()}
          </div>

          {/* Results card */}
          {showResults && Object.keys(results).length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl shadow-lg p-8 border-2 border-amber-200 dark:border-amber-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center">
                <Target className="w-6 h-6 mr-2 text-orange-500" />
                {t('result.title')}
              </h3>

              <div className="space-y-2.5 mb-6">
                {Object.entries(results).map(([name, outcome]) => {
                  const color = COLORS[participants.findIndex(p => p.name === name) % COLORS.length]
                  const revealed = revealedResults.has(name)
                  const isManualRevealed = manualRevealed.has(name)
                  const shouldHide = revealOneByOne && !isManualRevealed

                  return (
                    <div
                      key={name}
                      onClick={() => {
                        if (revealOneByOne && !isManualRevealed) {
                          setManualRevealed(prev => new Set([...prev, name]))
                        }
                      }}
                      className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-500 ${
                        shouldHide ? 'cursor-pointer hover:shadow-md' : ''
                      }`}
                      style={{
                        opacity: revealed ? 1 : 0,
                        transform: revealed ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                        borderLeft: `4px solid ${color}`,
                        perspective: '600px',
                      }}
                    >
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-base">{participants.find(p => p.name === name)?.animal}</span>
                        {name}
                      </span>
                      <span className="text-lg text-gray-400">→</span>
                      {shouldHide ? (
                        <span
                          className="font-bold px-3 py-1 rounded-lg text-white text-sm bg-gray-400 dark:bg-gray-500"
                          style={{
                            display: 'inline-block',
                            transition: 'transform 0.6s',
                            transformStyle: 'preserve-3d',
                          }}
                        >
                          ❓ 클릭하여 공개
                        </span>
                      ) : (
                        <span
                          className="font-bold px-3 py-1 rounded-lg text-white text-sm"
                          style={{
                            backgroundColor: color,
                            display: 'inline-block',
                            animation: isManualRevealed ? 'flipReveal 0.6s ease-out' : undefined,
                          }}
                        >
                          {outcome}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRematch}
                    disabled={isPlaying}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-3 py-2 rounded-xl text-amber-700 dark:text-amber-300 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    🔄 리매치
                  </button>
                  <button
                    onClick={handleReshuffleLadder}
                    disabled={isPlaying}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 bg-teal-100 dark:bg-teal-900/40 hover:bg-teal-200 dark:hover:bg-teal-900/60 px-3 py-2 rounded-xl text-teal-700 dark:text-teal-300 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    🔀 사다리만 다시
                  </button>
                  <button
                    onClick={handleNextRound}
                    disabled={isPlaying}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 px-3 py-2 rounded-xl text-blue-700 dark:text-blue-300 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    ➡️ 다음 라운드
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportImage}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                  >
                    <Camera className="w-4 h-4" />
                    <span>이미지 저장</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                  >
                    {isCopied ? <><Check className="w-4 h-4" /><span>{tCommon('copied')}</span></> : <><Share2 className="w-4 h-4" /><span>{t('result.share')}</span></>}
                  </button>
                  {showSaveButton && (
                    <button
                      onClick={handleSave}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      <span>{tCommon('save')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feature 6: Round history */}
          {rounds.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => setShowRoundHistory(prev => !prev)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  📊 라운드 기록 ({rounds.length}라운드)
                </span>
                {showRoundHistory ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {showRoundHistory && (
                <div className="px-4 pb-4 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="py-2 px-3 text-left text-gray-500 dark:text-gray-400 font-medium">참가자</th>
                        {rounds.map((r) => (
                          <th key={r.round} className="py-2 px-3 text-center text-gray-500 dark:text-gray-400 font-medium">
                            {r.round}R
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <td className="py-2 px-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                            <span className="mr-1">{p.animal}</span>{p.name}
                          </td>
                          {rounds.map((r) => (
                            <td key={r.round} className="py-2 px-3 text-center">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              >
                                {r.results[p.name] || '-'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSS for flip animation */}
      <style jsx>{`
        @keyframes flipReveal {
          0% { transform: rotateY(90deg); opacity: 0; }
          50% { transform: rotateY(-10deg); opacity: 1; }
          100% { transform: rotateY(0deg); opacity: 1; }
        }
      `}</style>

      <GuideSection namespace="ladder" />
    </div>
  )
}
