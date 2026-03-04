'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitBranch, Play, RefreshCw, Share2, Check, Save, Users, Target, Zap } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'

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

// Participant colors (up to 8)
const COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

// Easing functions
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

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
  const [results, setResults] = useState<{ [key: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState<number>(1500)

  // Animation state
  const [animProgress, setAnimProgress] = useState<Record<number, number>>({})   // 0–1 per participant
  const [tokenPos, setTokenPos] = useState<Record<number, PathPoint>>({})
  const [animatingIdx, setAnimatingIdx] = useState<number>(-1)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [revealedResults, setRevealedResults] = useState<Set<string>>(new Set())

  const rafRef = useRef<number | undefined>(undefined)
  const sparkleCounter = useRef(0)

  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('ladder')

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

  // ── Generate ladder ──────────────────────────────────────────────
  const generateLadder = () => {
    const lines: LadderLine[] = []
    const ladderHeight = Math.max(8, 6 + ladderComplexity * 2)
    const probMap: Record<number, number> = { 1: 0.25, 2: 0.4, 3: 0.6, 4: 0.8 }
    const prob = probMap[ladderComplexity] ?? 0.5

    for (let level = 0; level < ladderHeight; level++) {
      const used = new Set<number>()
      for (let i = 0; i < participants.length - 1; i++) {
        if (!used.has(i) && !used.has(i + 1) && Math.random() < prob) {
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
  }

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

  // ── Play ladder ──────────────────────────────────────────────────
  const playLadder = useCallback((startFrom = 0) => {
    if (isPlaying || ladderLines.length === 0) return

    // Pre-compute all paths
    pathPointsRef.current = participants.map((_, i) => buildPathPoints(i))
    pathLengthsRef.current = pathPointsRef.current.map(polylineLength)

    const finalResults: Record<string, string> = {}
    participants.forEach((p, i) => {
      const indices = calcPathIndices(i)
      finalResults[p.name] = outcomes[indices[indices.length - 1]]
    })

    setIsPlaying(true)
    setShowResults(false)
    setResults({})
    setAnimProgress({})
    setTokenPos({})
    setCompletedSet(new Set())
    setSparkles([])
    setRevealedResults(new Set())

    const runNext = (idx: number) => {
      if (idx >= participants.length) {
        // All done
        setResults(finalResults)
        setShowResults(true)
        setIsPlaying(false)
        setShowSaveButton(true)
        setAnimatingIdx(-1)
        // Reveal results one by one
        participants.forEach((p, i) => {
          setTimeout(() => {
            setRevealedResults(prev => new Set([...prev, p.name]))
          }, i * 150)
        })
        return
      }

      setAnimatingIdx(idx)
      animateOne(idx, () => {
        setCompletedSet(prev => new Set([...prev, idx]))
        setAnimatingIdx(-1)
        // Short pause between participants
        setTimeout(() => runNext(idx + 1), 400)
      })
    }

    setTimeout(() => runNext(startFrom), 200)
  }, [isPlaying, ladderLines, participants, outcomes, buildPathPoints, calcPathIndices, animateOne])

  // Stop animation on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Show results immediately ─────────────────────────────────────
  const showResultsOnly = () => {
    if (isPlaying) return
    const finalResults: Record<string, string> = {}
    participants.forEach((p, i) => {
      const indices = calcPathIndices(i)
      finalResults[p.name] = outcomes[indices[indices.length - 1]]
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
    setRevealedResults(new Set(participants.map(p => p.name)))
  }

  // ── URL init ─────────────────────────────────────────────────────
  useEffect(() => {
    const pp = searchParams.get('participants')
    const op = searchParams.get('outcomes')
    const cp = searchParams.get('complexity')
    const sp = searchParams.get('speed')

    if (pp) { try { const v = JSON.parse(pp); if (Array.isArray(v)) setParticipants(v) } catch { /* ignore */ } }
    if (op) { try { const v = JSON.parse(op); if (Array.isArray(v)) setOutcomes(v) } catch { /* ignore */ } }
    if (cp) { const v = parseInt(cp); if ([1, 2, 3, 4].includes(v)) setLadderComplexity(v) }
    if (sp) { const v = parseInt(sp); if ([3000, 1500, 800].includes(v)) setAnimationSpeed(v) }
  }, [searchParams])

  // ── Share / save ─────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      const url = window.location.href
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
  const buildTrailPoints = (pts: PathPoint[], t: number): PathPoint[] => {
    if (t <= 0 || pts.length === 0) return []
    if (t >= 1) return pts
    const total = polylineLength(pts)
    const target = total * t
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
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

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Settings panel ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2 text-green-600" />
            {t('settings.title')}
          </h2>

          <div className="space-y-6">
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
                  <div key={i} className="flex space-x-2 items-center">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <select
                      value={p.animal}
                      onChange={e => updateParticipantAnimal(i, e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-center"
                    >
                      {animalIcons.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input
                      type="text"
                      value={p.name}
                      onChange={e => updateParticipant(i, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder={`참가자 ${i + 1}`}
                    />
                    {participants.length > 2 && (
                      <button
                        onClick={() => removeParticipant(i)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={generateLadder}
                disabled={isPlaying}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-green-200 dark:shadow-none"
              >
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>{t('generateLadder')}</span>
                </div>
              </button>

              {ladderReady && (
                <button
                  onClick={() => playLadder()}
                  disabled={isPlaying}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-orange-200 dark:shadow-none"
                >
                  {isPlaying ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{t('playing')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Play className="w-5 h-5" />
                      <span>{t('startGame')}</span>
                    </div>
                  )}
                </button>
              )}

              {ladderReady && (
                <button
                  onClick={showResultsOnly}
                  disabled={isPlaying}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-purple-200 dark:shadow-none"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    <span>결과만 보기</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Ladder SVG + results ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <GitBranch className="w-6 h-6 mr-2 text-green-600" />
              {t('ladder.title')}
            </h3>

            {/* Participant labels (top) */}
            <div
              className="flex mb-2"
              style={{ paddingLeft: `${colWidth * 0.5}px`, paddingRight: `${colWidth * 0.5}px` }}
            >
              {participants.map((p, i) => (
                <button
                  key={i}
                  onClick={() => ladderReady && playLadder(i)}
                  disabled={isPlaying || !ladderReady}
                  title={ladderReady ? `${p.name}부터 시작` : '먼저 사다리를 생성하세요'}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  style={{
                    color: COLORS[i % COLORS.length],
                    background: `${COLORS[i % COLORS.length]}18`,
                  }}
                >
                  <span className="text-base leading-none">{p.animal}</span>
                  <span className="truncate max-w-full">{p.name}</span>
                </button>
              ))}
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
                  {participants.map((_, i) => (
                    <g key={i}>
                      <line
                        x1={getX(i)} y1={TOP_PAD}
                        x2={getX(i)} y2={svgHeight - BOT_PAD}
                        stroke={animatingIdx === i ? COLORS[i % COLORS.length] : '#CBD5E1'}
                        strokeWidth={animatingIdx === i ? 3.5 : 2.5}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </g>
                  ))}

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

                  {/* Completed paths (faded trail) */}
                  {participants.map((_, i) => {
                    if (!completedSet.has(i) && animatingIdx !== i) return null
                    if (!pathPointsRef.current[i]) return null
                    const prog = animProgress[i] ?? 0
                    const trail = buildTrailPoints(pathPointsRef.current[i], prog)
                    if (trail.length < 2) return null
                    const color = COLORS[i % COLORS.length]
                    const isDone = completedSet.has(i)
                    return (
                      <polyline
                        key={i}
                        points={ptsToStr(trail)}
                        fill="none"
                        stroke={color}
                        strokeWidth={isDone ? 2.5 : 3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={isDone ? 0.35 : 0.85}
                        filter={isDone ? undefined : `url(#glow-${i % COLORS.length})`}
                        style={{ transition: isDone ? 'stroke-opacity 0.5s' : undefined }}
                      />
                    )
                  })}

                  {/* Active token (currently animating) */}
                  {animatingIdx >= 0 && tokenPos[animatingIdx] && (() => {
                    const { x, y } = tokenPos[animatingIdx]
                    const color = COLORS[animatingIdx % COLORS.length]
                    const p = participants[animatingIdx]
                    return (
                      <g key={animatingIdx} filter={`url(#glow-${animatingIdx % COLORS.length})`}>
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
                          {p.animal}
                        </text>
                      </g>
                    )
                  })()}

                  {/* Completed tokens (small, at end) */}
                  {participants.map((p, i) => {
                    if (!completedSet.has(i)) return null
                    const pts = pathPointsRef.current[i]
                    if (!pts || pts.length === 0) return null
                    const end = pts[pts.length - 1]
                    const color = COLORS[i % COLORS.length]
                    return (
                      <g key={i} opacity="0.7">
                        <circle cx={end.x} cy={end.y} r="11" fill={color} fillOpacity="0.8" />
                        <text x={end.x} y={end.y + 4} textAnchor="middle" fontSize="11" style={{ userSelect: 'none' }}>{p.animal}</text>
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

            {/* Outcome labels (bottom) */}
            {ladderReady && (
              <div
                className="flex mt-2"
                style={{ paddingLeft: `${colWidth * 0.5}px`, paddingRight: `${colWidth * 0.5}px` }}
              >
                {outcomes.map((o, i) => (
                  <div key={i} className="flex-1 flex justify-center">
                    <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700 px-2 py-1 rounded-lg max-w-full truncate text-center">
                      {o}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active participant indicator */}
            {isPlaying && animatingIdx >= 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ color: COLORS[animatingIdx % COLORS.length] }}>
                <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: COLORS[animatingIdx % COLORS.length] }} />
                <span>{participants[animatingIdx]?.animal} {participants[animatingIdx]?.name} 이동 중...</span>
              </div>
            )}
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
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-500"
                      style={{
                        opacity: revealed ? 1 : 0,
                        transform: revealed ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-base">{participants.find(p => p.name === name)?.animal}</span>
                        {name}
                      </span>
                      <span className="text-lg text-gray-400">→</span>
                      <span
                        className="font-bold px-3 py-1 rounded-lg text-white text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {outcome}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                >
                  {isCopied ? <><Check className="w-4 h-4" /><span>{tCommon('copied')}</span></> : <><Share2 className="w-4 h-4" /><span>{t('result.share')}</span></>}
                </button>
                {showSaveButton && (
                  <button
                    onClick={handleSave}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    <span>{tCommon('save')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎯 {t('guide.title')}</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.usageTitle')}</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.usage.0')}</li>
              <li>• {t('guide.usage.1')}</li>
              <li>• {t('guide.usage.2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.examplesTitle')}</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.examples.0')}</li>
              <li>• {t('guide.examples.1')}</li>
              <li>• {t('guide.examples.2')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('guide.tipsTitle')}</h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• {t('guide.tips.0')}</li>
              <li>• {t('guide.tips.1')}</li>
              <li>• {t('guide.tips.2')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
