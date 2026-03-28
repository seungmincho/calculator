'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Play, Pause, SkipForward, RotateCcw, Shuffle, BookOpen,
  ChevronDown, ChevronUp, MousePointer, Target, Info,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Point {
  x: number
  y: number
  cluster: number
}

interface Centroid {
  x: number
  y: number
}

type Phase = 'idle' | 'assign' | 'update' | 'converged'

// ── Constants ────────────────────────────────────────────────────────────────
const CLUSTER_COLORS = [
  { light: '#3b82f6', dark: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },   // blue
  { light: '#ef4444', dark: '#f87171', bg: 'rgba(239,68,68,0.12)' },    // red
  { light: '#22c55e', dark: '#4ade80', bg: 'rgba(34,197,94,0.12)' },    // green
  { light: '#f59e0b', dark: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },   // amber
  { light: '#8b5cf6', dark: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },   // purple
  { light: '#ec4899', dark: '#f472b6', bg: 'rgba(236,72,153,0.12)' },   // pink
  { light: '#14b8a6', dark: '#2dd4bf', bg: 'rgba(20,184,166,0.12)' },   // teal
  { light: '#f97316', dark: '#fb923c', bg: 'rgba(249,115,22,0.12)' },   // orange
]

const CENTROID_SYMBOL_SIZE = 10

const CANVAS_LOGICAL_W = 600
const CANVAS_LOGICAL_H = 500

// ── Utility ──────────────────────────────────────────────────────────────────
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function computeSSE(points: Point[], centroids: Centroid[]): number {
  let sse = 0
  for (const p of points) {
    if (p.cluster >= 0 && p.cluster < centroids.length) {
      const c = centroids[p.cluster]
      sse += (p.x - c.x) ** 2 + (p.y - c.y) ** 2
    }
  }
  return sse
}

// ── Data generators ──────────────────────────────────────────────────────────
function generateCircularClusters(k: number, count: number): Point[] {
  const pts: Point[] = []
  const cx = CANVAS_LOGICAL_W / 2
  const cy = CANVAS_LOGICAL_H / 2
  const radius = Math.min(cx, cy) * 0.6
  for (let i = 0; i < k; i++) {
    const angle = (2 * Math.PI * i) / k - Math.PI / 2
    const mx = cx + radius * Math.cos(angle)
    const my = cy + radius * Math.sin(angle)
    const perCluster = Math.floor(count / k)
    for (let j = 0; j < perCluster; j++) {
      const r = Math.random() * 45 + 5
      const a = Math.random() * 2 * Math.PI
      pts.push({ x: mx + r * Math.cos(a), y: my + r * Math.sin(a), cluster: -1 })
    }
  }
  return pts
}

function generateOverlappingClusters(k: number, count: number): Point[] {
  const pts: Point[] = []
  const cx = CANVAS_LOGICAL_W / 2
  const cy = CANVAS_LOGICAL_H / 2
  for (let i = 0; i < k; i++) {
    const mx = cx + (Math.random() - 0.5) * 120
    const my = cy + (Math.random() - 0.5) * 120
    const perCluster = Math.floor(count / k)
    for (let j = 0; j < perCluster; j++) {
      const r = Math.random() * 80
      const a = Math.random() * 2 * Math.PI
      pts.push({ x: mx + r * Math.cos(a), y: my + r * Math.sin(a), cluster: -1 })
    }
  }
  return pts
}

function generateMoonShapes(count: number): Point[] {
  const pts: Point[] = []
  const half = Math.floor(count / 2)
  // Upper moon
  for (let i = 0; i < half; i++) {
    const angle = Math.PI * Math.random()
    const r = 100 + (Math.random() - 0.5) * 30
    pts.push({
      x: 200 + r * Math.cos(angle),
      y: 280 - r * Math.sin(angle) + (Math.random() - 0.5) * 15,
      cluster: -1,
    })
  }
  // Lower moon
  for (let i = 0; i < half; i++) {
    const angle = Math.PI + Math.PI * Math.random()
    const r = 100 + (Math.random() - 0.5) * 30
    pts.push({
      x: 350 + r * Math.cos(angle),
      y: 220 - r * Math.sin(angle) + (Math.random() - 0.5) * 15,
      cluster: -1,
    })
  }
  return pts
}

function initCentroids(points: Point[], k: number): Centroid[] {
  // K-means++ initialization
  if (points.length === 0) return []
  const centroids: Centroid[] = []
  const idx = Math.floor(Math.random() * points.length)
  centroids.push({ x: points[idx].x, y: points[idx].y })

  for (let c = 1; c < k; c++) {
    const dists = points.map((p) => {
      let minD = Infinity
      for (const cen of centroids) {
        const d = dist(p, cen)
        if (d < minD) minD = d
      }
      return minD * minD
    })
    const total = dists.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    let chosen = 0
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i]
      if (r <= 0) { chosen = i; break }
    }
    centroids.push({ x: points[chosen].x, y: points[chosen].y })
  }
  return centroids
}

// ── Canvas drawing ───────────────────────────────────────────────────────────
function drawScene(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  centroids: Centroid[],
  showVoronoi: boolean,
  isDark: boolean,
  animProgress: number, // 0-1, for centroid movement
  prevCentroids: Centroid[] | null,
) {
  const w = CANVAS_LOGICAL_W
  const h = CANVAS_LOGICAL_H

  // Background
  ctx.fillStyle = isDark ? '#1f2937' : '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Voronoi boundaries (pixel-based for simplicity)
  if (showVoronoi && centroids.length > 1) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const step = 4 // sample every 4px for performance
    for (let py = 0; py < h; py += step) {
      for (let px = 0; px < w; px += step) {
        let minD1 = Infinity, minD2 = Infinity
        for (const cen of centroids) {
          const d = (px - cen.x) ** 2 + (py - cen.y) ** 2
          if (d < minD1) { minD2 = minD1; minD1 = d }
          else if (d < minD2) { minD2 = d }
        }
        const diff = Math.sqrt(minD2) - Math.sqrt(minD1)
        if (diff < 3) {
          // On boundary — paint thin line
          for (let dy = 0; dy < step && py + dy < h; dy++) {
            for (let dx = 0; dx < step && px + dx < w; dx++) {
              const idx = ((py + dy) * w + (px + dx)) * 4
              if (isDark) {
                data[idx] = 100; data[idx + 1] = 100; data[idx + 2] = 120; data[idx + 3] = 180
              } else {
                data[idx] = 180; data[idx + 1] = 180; data[idx + 2] = 200; data[idx + 3] = 120
              }
            }
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Points
  for (const p of points) {
    const cIdx = p.cluster
    const color = cIdx >= 0 && cIdx < CLUSTER_COLORS.length
      ? (isDark ? CLUSTER_COLORS[cIdx].dark : CLUSTER_COLORS[cIdx].light)
      : (isDark ? '#9ca3af' : '#6b7280')
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // Centroids (interpolated if animating)
  const drawCentroids = centroids.map((c, i) => {
    if (prevCentroids && animProgress < 1 && i < prevCentroids.length) {
      return {
        x: prevCentroids[i].x + (c.x - prevCentroids[i].x) * animProgress,
        y: prevCentroids[i].y + (c.y - prevCentroids[i].y) * animProgress,
      }
    }
    return c
  })

  for (let i = 0; i < drawCentroids.length; i++) {
    const c = drawCentroids[i]
    const color = isDark ? CLUSTER_COLORS[i].dark : CLUSTER_COLORS[i].light
    const s = CENTROID_SYMBOL_SIZE

    // Diamond shape
    ctx.beginPath()
    ctx.moveTo(c.x, c.y - s)
    ctx.lineTo(c.x + s, c.y)
    ctx.lineTo(c.x, c.y + s)
    ctx.lineTo(c.x - s, c.y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
    ctx.lineWidth = 2
    ctx.stroke()

    // Crosshair
    ctx.beginPath()
    ctx.moveTo(c.x - s - 3, c.y); ctx.lineTo(c.x + s + 3, c.y)
    ctx.moveTo(c.x, c.y - s - 3); ctx.lineTo(c.x, c.y + s + 3)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function KmeansClusteringVisualizer() {
  // State
  const [k, setK] = useState(3)
  const [points, setPoints] = useState<Point[]>([])
  const [centroids, setCentroids] = useState<Centroid[]>([])
  const [prevCentroids, setPrevCentroids] = useState<Centroid[] | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [iteration, setIteration] = useState(0)
  const [sseHistory, setSseHistory] = useState<number[]>([])
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(500) // ms per step
  const [guideOpen, setGuideOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [animProgress, setAnimProgress] = useState(1)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // ── Dark mode detection ──
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // ── Canvas DPR + draw ──
  const draw = useCallback((progress = 1) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cw = CANVAS_LOGICAL_W
    const ch = CANVAS_LOGICAL_H
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
    }
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.scale(dpr, dpr)
    drawScene(ctx, points, centroids, showVoronoi, isDark, progress, prevCentroids)
    ctx.restore()
  }, [points, centroids, showVoronoi, isDark, prevCentroids])

  useEffect(() => { draw(animProgress) }, [draw, animProgress])

  // ── Animate centroid movement ──
  const animateCentroids = useCallback((onDone: () => void) => {
    const start = performance.now()
    const duration = Math.min(speed * 0.6, 400)
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // ease out cubic
      const eased = 1 - (1 - t) ** 3
      setAnimProgress(eased)
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        setPrevCentroids(null)
        setAnimProgress(1)
        onDone()
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
  }, [speed])

  // ── Generate data ──
  const generateData = useCallback((preset: 'circular' | 'overlap' | 'moon' | 'random') => {
    setIsRunning(false)
    if (runTimerRef.current) clearTimeout(runTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    let newPts: Point[]
    const count = 150
    switch (preset) {
      case 'circular': newPts = generateCircularClusters(k, count); break
      case 'overlap': newPts = generateOverlappingClusters(k, count); break
      case 'moon': newPts = generateMoonShapes(count); break
      default:
        newPts = Array.from({ length: count }, () => ({
          x: 30 + Math.random() * (CANVAS_LOGICAL_W - 60),
          y: 30 + Math.random() * (CANVAS_LOGICAL_H - 60),
          cluster: -1,
        }))
    }
    // Clamp to canvas
    newPts = newPts.map(p => ({
      ...p,
      x: Math.max(10, Math.min(CANVAS_LOGICAL_W - 10, p.x)),
      y: Math.max(10, Math.min(CANVAS_LOGICAL_H - 10, p.y)),
    }))
    setPoints(newPts)
    const newCentroids = initCentroids(newPts, k)
    setCentroids(newCentroids)
    setPrevCentroids(null)
    setAnimProgress(1)
    setPhase('idle')
    setIteration(0)
    setSseHistory([])
  }, [k])

  // ── K-means step logic ──
  const doAssign = useCallback(() => {
    if (centroids.length === 0 || points.length === 0) return false
    let changed = false
    const newPts = points.map(p => {
      let minD = Infinity
      let bestC = 0
      for (let i = 0; i < centroids.length; i++) {
        const d = dist(p, centroids[i])
        if (d < minD) { minD = d; bestC = i }
      }
      if (p.cluster !== bestC) changed = true
      return { ...p, cluster: bestC }
    })
    setPoints(newPts)
    const sse = computeSSE(newPts, centroids)
    setSseHistory(h => [...h, sse])
    return changed
  }, [points, centroids])

  const doUpdate = useCallback(() => {
    const sums: { sx: number; sy: number; count: number }[] =
      Array.from({ length: centroids.length }, () => ({ sx: 0, sy: 0, count: 0 }))
    for (const p of points) {
      if (p.cluster >= 0 && p.cluster < sums.length) {
        sums[p.cluster].sx += p.x
        sums[p.cluster].sy += p.y
        sums[p.cluster].count++
      }
    }
    const newCentroids = centroids.map((c, i) => {
      if (sums[i].count === 0) return c
      return { x: sums[i].sx / sums[i].count, y: sums[i].sy / sums[i].count }
    })
    setPrevCentroids([...centroids])
    setCentroids(newCentroids)
    setAnimProgress(0)
  }, [points, centroids])

  const stepOnce = useCallback(() => {
    if (phase === 'converged') return

    if (phase === 'idle' || phase === 'update') {
      // Assignment phase
      const changed = doAssign()
      if (!changed && phase === 'update') {
        setPhase('converged')
        setIsRunning(false)
        return
      }
      setPhase('assign')
      setIteration(i => i + 1)
    } else if (phase === 'assign') {
      // Update centroids phase
      doUpdate()
      setPhase('update')
    }
  }, [phase, doAssign, doUpdate])

  // ── Auto-run loop ──
  useEffect(() => {
    if (!isRunning || phase === 'converged') {
      if (runTimerRef.current) clearTimeout(runTimerRef.current)
      return
    }
    runTimerRef.current = setTimeout(() => {
      stepOnce()
    }, speed)
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current)
    }
  }, [isRunning, phase, stepOnce, speed])

  // Animate centroids when phase transitions to 'update'
  useEffect(() => {
    if (prevCentroids && animProgress === 0) {
      animateCentroids(() => {})
    }
  }, [prevCentroids, animProgress, animateCentroids])

  // ── Canvas click to add point ──
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_LOGICAL_W / rect.width
    const scaleY = CANVAS_LOGICAL_H / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    setPoints(prev => [...prev, { x, y, cluster: -1 }])
  }, [])

  // ── Reset ──
  const handleReset = useCallback(() => {
    setIsRunning(false)
    if (runTimerRef.current) clearTimeout(runTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setPoints([])
    setCentroids([])
    setPrevCentroids(null)
    setAnimProgress(1)
    setPhase('idle')
    setIteration(0)
    setSseHistory([])
  }, [])

  // ── SSE chart (mini bar chart) ──
  const sseChart = useMemo(() => {
    if (sseHistory.length === 0) return null
    const maxSSE = Math.max(...sseHistory, 1)
    const barW = Math.min(20, 200 / sseHistory.length)
    return (
      <div className="flex items-end gap-px h-16 mt-1">
        {sseHistory.map((v, i) => (
          <div
            key={i}
            className="bg-teal-500 dark:bg-teal-400 rounded-t-sm min-w-[3px]"
            style={{ width: barW, height: `${Math.max(2, (v / maxSSE) * 100)}%` }}
            title={`Iter ${i + 1}: SSE ${v.toFixed(0)}`}
          />
        ))}
      </div>
    )
  }, [sseHistory])

  // ── Cluster sizes ──
  const clusterSizes = useMemo(() => {
    const sizes = new Map<number, number>()
    for (const p of points) {
      if (p.cluster >= 0) sizes.set(p.cluster, (sizes.get(p.cluster) ?? 0) + 1)
    }
    return sizes
  }, [points])

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (runTimerRef.current) clearTimeout(runTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ── Init on mount ──
  useEffect(() => {
    generateData('circular')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          K-means 클러스터링 시각화
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          데이터 포인트를 K개 군집으로 나누는 과정을 단계별로 관찰하세요
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left: Controls ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* K slider */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4" /> 설정
            </h2>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                K (군집 수): <span className="font-bold text-teal-600 dark:text-teal-400">{k}</span>
              </label>
              <input
                type="range"
                min={2} max={8} value={k}
                onChange={e => setK(Number(e.target.value))}
                className="w-full accent-teal-600 mt-1"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>2</span><span>8</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                속도: <span className="font-bold text-teal-600 dark:text-teal-400">{speed}ms</span>
              </label>
              <input
                type="range"
                min={100} max={1500} step={100} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full accent-teal-600 mt-1"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>빠름</span><span>느림</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showVoronoi}
                onChange={e => setShowVoronoi(e.target.checked)}
                className="accent-teal-600"
              />
              Voronoi 경계 표시
            </label>
          </div>

          {/* Data presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Shuffle className="w-4 h-4" /> 데이터 생성
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['circular', '원형 군집'],
                ['overlap', '겹치는 군집'],
                ['moon', '달 모양'],
                ['random', '랜덤'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => generateData(id)}
                  className="px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-teal-100 dark:hover:bg-teal-900 text-gray-700 dark:text-gray-300 transition-colors font-medium"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <MousePointer className="w-3 h-3" /> 캔버스를 클릭하면 포인트를 추가할 수 있습니다
            </p>
          </div>

          {/* Run controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              실행
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (phase === 'converged') return
                  stepOnce()
                }}
                disabled={phase === 'converged' || points.length === 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" /> 1단계
              </button>
              <button
                onClick={() => setIsRunning(r => !r)}
                disabled={phase === 'converged' || points.length === 0}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium transition-colors"
              >
                {isRunning ? <><Pause className="w-3.5 h-3.5" /> 일시정지</> : <><Play className="w-3.5 h-3.5" /> 실행</>}
              </button>
            </div>
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Info className="w-4 h-4" /> 통계
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                <div className="text-gray-400 dark:text-gray-500">반복</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{iteration}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                <div className="text-gray-400 dark:text-gray-500">상태</div>
                <div className={`text-sm font-bold ${
                  phase === 'converged'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : phase === 'assign'
                      ? 'text-blue-600 dark:text-blue-400'
                      : phase === 'update'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500'
                }`}>
                  {phase === 'converged' ? '수렴 완료' :
                   phase === 'assign' ? '할당' :
                   phase === 'update' ? '이동' : '대기'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                <div className="text-gray-400 dark:text-gray-500">포인트</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{points.length}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5">
                <div className="text-gray-400 dark:text-gray-500">SSE</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {sseHistory.length > 0 ? sseHistory[sseHistory.length - 1].toFixed(0) : '-'}
                </div>
              </div>
            </div>

            {/* Cluster sizes */}
            {clusterSizes.size > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-400 dark:text-gray-500">군집별 크기</div>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: k }, (_, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: CLUSTER_COLORS[i].bg,
                        color: isDark ? CLUSTER_COLORS[i].dark : CLUSTER_COLORS[i].light,
                      }}
                    >
                      C{i + 1}: {clusterSizes.get(i) ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SSE chart */}
            {sseHistory.length > 1 && (
              <div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">SSE 변화</div>
                {sseChart}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Canvas ── */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                style={{
                  maxWidth: CANVAS_LOGICAL_W,
                  aspectRatio: `${CANVAS_LOGICAL_W}/${CANVAS_LOGICAL_H}`,
                }}
              />
              {/* Phase overlay */}
              {phase === 'converged' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce">
                  수렴 완료 (Iteration {iteration})
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" /> 미할당
              </span>
              {Array.from({ length: k }, (_, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isDark ? CLUSTER_COLORS[i].dark : CLUSTER_COLORS[i].light }}
                  />
                  군집 {i + 1}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rotate-45 border-2 border-gray-500" style={{ borderRadius: 1 }} />
                센트로이드
              </span>
            </div>
          </div>

          {/* Step explanation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">알고리즘 단계</h3>
            <div className="flex gap-2 flex-wrap">
              {([
                ['idle', '초기화', '랜덤 센트로이드 K개 배치 (K-means++ 방식)'],
                ['assign', '할당', '각 포인트를 가장 가까운 센트로이드에 할당'],
                ['update', '이동', '각 군집의 평균 위치로 센트로이드 이동'],
                ['converged', '수렴', '할당이 변하지 않으면 종료'],
              ] as const).map(([p, label, desc]) => (
                <div
                  key={p}
                  className={`flex-1 min-w-[120px] rounded-lg p-3 text-xs border-2 transition-colors ${
                    phase === p
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 dark:border-teal-400'
                      : 'border-transparent bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className={`font-bold mb-0.5 ${phase === p ? 'text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    {label}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 leading-snug">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Guide Section ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> K-means 클러스터링 가이드
          </h2>
          {guideOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {guideOpen && (
          <div className="px-6 pb-6 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {/* What is */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">K-means 클러스터링이란?</h3>
              <p>
                K-means는 주어진 데이터를 <strong>K개의 군집(cluster)</strong>으로 나누는 대표적인 비지도 학습(unsupervised learning) 알고리즘입니다.
                각 군집은 하나의 센트로이드(중심점)로 대표되며, 데이터 포인트는 가장 가까운 센트로이드에 할당됩니다.
                1957년 Stuart Lloyd가 제안한 이래, 단순하면서도 효과적이어서 데이터 분석에서 가장 널리 사용되는 군집화 기법입니다.
              </p>
            </div>

            {/* How to use */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">사용 방법</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>K 슬라이더</strong>로 군집 수를 2~8 사이에서 선택합니다.</li>
                <li><strong>데이터 생성</strong> 버튼으로 프리셋 데이터를 로드하거나, 캔버스를 클릭해 포인트를 추가합니다.</li>
                <li><strong>1단계</strong> 버튼으로 할당 → 이동을 한 단계씩 진행합니다.</li>
                <li><strong>실행</strong> 버튼으로 수렴할 때까지 자동으로 반복합니다.</li>
                <li>SSE 그래프로 수렴 과정을 확인하고, Voronoi 경계로 군집 영역을 시각적으로 파악합니다.</li>
              </ol>
            </div>

            {/* How it works */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">동작 원리</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>초기화:</strong> K개의 센트로이드를 K-means++ 방식으로 배치합니다 (멀리 떨어진 점을 우선 선택하여 초기값 편향을 줄임).</li>
                <li><strong>할당(Assignment):</strong> 각 데이터 포인트를 유클리드 거리가 가장 짧은 센트로이드의 군집에 할당합니다. 시간복잡도 O(n*k).</li>
                <li><strong>갱신(Update):</strong> 각 군집에 할당된 포인트들의 평균 좌표를 계산하여 센트로이드를 이동합니다.</li>
                <li><strong>반복:</strong> 할당과 갱신을 반복합니다. 할당이 더 이상 변하지 않으면 수렴(convergence)으로 종료합니다.</li>
                <li><strong>복잡도:</strong> 일반적으로 O(n*k*d*i), n=데이터 수, k=군집 수, d=차원, i=반복 횟수.</li>
              </ol>
            </div>

            {/* Elbow Method */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">엘보 방법 (Elbow Method)</h3>
              <p>
                최적의 K를 찾기 위해 K=1,2,3,...으로 반복 실행하여 각 K에서의 <strong>SSE(Sum of Squared Errors)</strong>를 그래프로 그립니다.
                SSE가 급격히 감소하다가 완만해지는 지점(&quot;팔꿈치&quot;)이 최적의 K입니다.
                K가 커질수록 SSE는 줄지만, 과적합(overfitting) 위험이 있으므로 변곡점을 찾는 것이 핵심입니다.
              </p>
            </div>

            {/* Real world */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">실무 활용</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>고객 세분화:</strong> 구매 패턴으로 VIP/일반/이탈 고객 군집 분류</li>
                <li><strong>이미지 압축:</strong> 색상을 K개로 줄여 이미지 용량 감소 (color quantization)</li>
                <li><strong>문서 분류:</strong> TF-IDF 벡터를 군집화하여 뉴스/논문 토픽 분류</li>
                <li><strong>이상 탐지:</strong> 어떤 군집에도 가깝지 않은 데이터를 이상치로 판별</li>
                <li><strong>추천 시스템:</strong> 유사 사용자 그룹을 만들어 협업 필터링의 기초로 활용</li>
              </ul>
            </div>

            {/* Comparison */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">비슷한 알고리즘 비교</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>DBSCAN:</strong> 밀도 기반 군집화. K를 미리 정하지 않아도 되고, 비볼록 형태도 처리 가능. 단, 밀도 차이가 큰 데이터에 취약.</li>
                <li><strong>GMM (가우시안 혼합 모델):</strong> 확률적 군집화. 각 포인트의 군집 소속 확률을 제공. 더 유연하지만 계산 비용이 높음.</li>
                <li><strong>K-medoids:</strong> 센트로이드 대신 실제 데이터 포인트를 중심으로 사용. 이상치에 더 강건(robust).</li>
                <li><strong>계층적 군집화:</strong> 덴드로그램을 통해 다양한 K를 동시에 탐색. 단, 대규모 데이터에 느림 (O(n^3)).</li>
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">K-means의 한계</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>비볼록 형태:</strong> 달 모양, 고리 모양 등 비볼록(non-convex) 군집을 올바르게 분류하지 못합니다. &quot;달 모양&quot; 프리셋으로 직접 확인해보세요.</li>
                <li><strong>초기값 의존:</strong> 초기 센트로이드 위치에 따라 결과가 달라질 수 있습니다 (K-means++로 완화).</li>
                <li><strong>K 사전 지정:</strong> K를 미리 알아야 하며, 잘못된 K는 좋지 않은 결과를 줍니다.</li>
                <li><strong>구형 가정:</strong> 모든 군집이 비슷한 크기와 밀도의 구형이라고 가정합니다.</li>
              </ul>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q: SSE가 0이 되면 완벽한 군집화인가요?</p>
                  <p>A: SSE=0은 모든 포인트가 센트로이드와 정확히 일치할 때인데, 이는 K=N(포인트 수)일 때만 가능합니다. 실제로는 SSE의 &quot;감소율&quot;이 중요합니다.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q: K-means는 항상 수렴하나요?</p>
                  <p>A: 네, SSE는 매 반복마다 감소하거나 유지되므로 유한 시간 안에 반드시 수렴합니다. 단, 전역 최적(global optimum)이 아닌 지역 최적(local optimum)에 수렴할 수 있습니다.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q: K-means++가 일반 K-means보다 나은 이유는?</p>
                  <p>A: 일반 K-means는 센트로이드를 완전 랜덤으로 초기화하여 나쁜 결과에 빠지기 쉽습니다. K-means++는 이미 선택된 센트로이드와 먼 점을 확률적으로 선택하여 초기 배치를 분산시킵니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
