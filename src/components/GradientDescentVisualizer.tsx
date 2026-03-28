'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, BookOpen, MousePointer } from 'lucide-react'

// ── Loss Functions ──
type LossFn = (x: number, y: number) => number
interface LossDef {
  name: string
  fn: LossFn
  range: [number, number]
  defaultStart: [number, number]
  desc: string
}

const LOSS_FUNCTIONS: LossDef[] = [
  {
    name: '볼록 함수 (x² + y²)',
    fn: (x, y) => x * x + y * y,
    range: [-5, 5],
    defaultStart: [4, 3],
    desc: '가장 단순한 볼록 함수. 모든 옵티마이저가 쉽게 수렴합니다.',
  },
  {
    name: '긴 타원 (x² + 10y²)',
    fn: (x, y) => x * x + 10 * y * y,
    range: [-5, 5],
    defaultStart: [4, 3],
    desc: '축 방향으로 곡률이 다른 함수. 모멘텀/Adam의 이점을 확인하세요.',
  },
  {
    name: 'Himmelblau (다중 최솟값)',
    fn: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    range: [-5, 5],
    defaultStart: [-3, -3],
    desc: '4개의 동일한 최솟값. 시작점에 따라 다른 곳으로 수렴합니다.',
  },
  {
    name: '진동 함수 (지역 최솟값)',
    fn: (x, y) => Math.sin(x * 1.5) + Math.sin(y * 1.5) + 0.05 * (x * x + y * y),
    range: [-5, 5],
    defaultStart: [3, 3],
    desc: '여러 지역 최솟값이 존재. 학습률에 따라 탈출 여부가 달라집니다.',
  },
]

// ── Optimizer Definitions ──
type OptimizerName = 'sgd' | 'momentum' | 'adam' | 'rmsprop'
interface OptimizerDef { name: string; key: OptimizerName; color: string; desc: string }

const OPTIMIZERS: OptimizerDef[] = [
  { name: 'SGD (Vanilla)', key: 'sgd', color: '#ef4444', desc: '기본 경사하강법' },
  { name: 'Momentum', key: 'momentum', color: '#3b82f6', desc: '관성을 이용한 가속' },
  { name: 'Adam', key: 'adam', color: '#10b981', desc: '적응형 학습률 + 모멘텀' },
  { name: 'RMSProp', key: 'rmsprop', color: '#f59e0b', desc: '적응형 학습률' },
]

// ── Numerical Gradient ──
function gradient(fn: LossFn, x: number, y: number, h = 1e-5): [number, number] {
  const dx = (fn(x + h, y) - fn(x - h, y)) / (2 * h)
  const dy = (fn(x, y + h) - fn(x, y - h)) / (2 * h)
  return [dx, dy]
}

// ── Optimizer State ──
interface OptState {
  x: number; y: number
  vx: number; vy: number       // momentum
  mx: number; my: number       // adam m
  sx: number; sy: number       // adam v / rmsprop s
  t: number                    // step count
  path: [number, number][]
  losses: number[]
  converged: boolean
}

function createOptState(x: number, y: number, fn: LossFn): OptState {
  return { x, y, vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, t: 0, path: [[x, y]], losses: [fn(x, y)], converged: false }
}

function stepOptimizer(state: OptState, fn: LossFn, lr: number, type: OptimizerName): OptState {
  if (state.converged) return state
  const [gx, gy] = gradient(fn, state.x, state.y)
  const gMag = Math.sqrt(gx * gx + gy * gy)
  if (gMag < 1e-7 || state.t > 2000) return { ...state, converged: true }

  let nx = state.x, ny = state.y
  let nvx = state.vx, nvy = state.vy
  let nmx = state.mx, nmy = state.my
  let nsx = state.sx, nsy = state.sy
  const nt = state.t + 1

  switch (type) {
    case 'sgd':
      nx -= lr * gx; ny -= lr * gy
      break
    case 'momentum': {
      const beta = 0.9
      nvx = beta * state.vx + lr * gx
      nvy = beta * state.vy + lr * gy
      nx -= nvx; ny -= nvy
      break
    }
    case 'adam': {
      const b1 = 0.9, b2 = 0.999, eps = 1e-8
      nmx = b1 * state.mx + (1 - b1) * gx
      nmy = b1 * state.my + (1 - b1) * gy
      nsx = b2 * state.sx + (1 - b2) * gx * gx
      nsy = b2 * state.sy + (1 - b2) * gy * gy
      const mxh = nmx / (1 - b1 ** nt), myh = nmy / (1 - b1 ** nt)
      const sxh = nsx / (1 - b2 ** nt), syh = nsy / (1 - b2 ** nt)
      nx -= lr * mxh / (Math.sqrt(sxh) + eps)
      ny -= lr * myh / (Math.sqrt(syh) + eps)
      break
    }
    case 'rmsprop': {
      const beta = 0.9, eps = 1e-8
      nsx = beta * state.sx + (1 - beta) * gx * gx
      nsy = beta * state.sy + (1 - beta) * gy * gy
      nx -= lr * gx / (Math.sqrt(nsx) + eps)
      ny -= lr * gy / (Math.sqrt(nsy) + eps)
      break
    }
  }

  const loss = fn(nx, ny)
  const newPath = [...state.path, [nx, ny] as [number, number]]
  const newLosses = [...state.losses, loss]

  return { x: nx, y: ny, vx: nvx, vy: nvy, mx: nmx, my: nmy, sx: nsx, sy: nsy, t: nt, path: newPath, losses: newLosses, converged: false }
}

// ── Color Mapping ──
function lossToColor(v: number, minV: number, maxV: number, dark: boolean): [number, number, number] {
  const t = Math.max(0, Math.min(1, (v - minV) / (maxV - minV + 1e-10)))
  const s = Math.sqrt(t) // compress highlights
  if (dark) {
    // dark: deep blue → teal → yellow
    const r = Math.floor(s * 220)
    const g = Math.floor((s < 0.5 ? s * 2 : 1) * 180)
    const b = Math.floor((1 - s) * 200 + 30)
    return [r, g, b]
  }
  // light: blue → green → yellow → red
  if (s < 0.33) {
    const p = s / 0.33
    return [Math.floor(30 + p * 20), Math.floor(80 + p * 120), Math.floor(200 - p * 40)]
  } else if (s < 0.66) {
    const p = (s - 0.33) / 0.33
    return [Math.floor(50 + p * 160), Math.floor(200 - p * 40), Math.floor(160 - p * 120)]
  }
  const p = (s - 0.66) / 0.34
  return [Math.floor(210 + p * 40), Math.floor(160 - p * 120), Math.floor(40 - p * 20)]
}

// ── Component ──
export default function GradientDescentVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<ImageData | null>(null)
  const [lossFnIdx, setLossFnIdx] = useState(0)
  const [optimizerIdx, setOptimizerIdx] = useState(0)
  const [lr, setLr] = useState(-1.3) // log10
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(3)
  const [comparison, setComparison] = useState(false)
  const [startPt, setStartPt] = useState<[number, number]>(LOSS_FUNCTIONS[0].defaultStart)
  const [states, setStates] = useState<Map<OptimizerName, OptState>>(new Map())
  const [isDark, setIsDark] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const animRef = useRef(0)
  const surfaceDarkRef = useRef(false)
  const surfaceFnRef = useRef(0)

  const lossDef = LOSS_FUNCTIONS[lossFnIdx]
  const realLr = Math.pow(10, lr)
  const canvasSize = 500

  // Dark mode detection
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Precompute surface
  const computeSurface = useCallback((fnIdx: number, dark: boolean) => {
    const def = LOSS_FUNCTIONS[fnIdx]
    const { fn, range } = def
    const [lo, hi] = range
    const size = canvasSize
    const img = new ImageData(size, size)
    let minV = Infinity, maxV = -Infinity
    const vals = new Float64Array(size * size)
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = lo + (px / (size - 1)) * (hi - lo)
        const y = lo + (py / (size - 1)) * (hi - lo)
        const v = fn(x, y)
        vals[py * size + px] = v
        if (v < minV) minV = v
        if (v > maxV) maxV = v
      }
    }
    // Clamp maxV for better contrast
    const clampMax = minV + (maxV - minV) * 0.7
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const v = vals[py * size + px]
        const [r, g, b] = lossToColor(v, minV, clampMax, dark)
        const i = (py * size + px) * 4
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
      }
    }
    // Draw contour lines
    const numContours = 12
    for (let c = 1; c <= numContours; c++) {
      const threshold = minV + (c / (numContours + 1)) * (clampMax - minV)
      for (let py = 1; py < size - 1; py++) {
        for (let px = 1; px < size - 1; px++) {
          const v = vals[py * size + px]
          const vr = vals[py * size + px + 1]
          const vd = vals[(py + 1) * size + px]
          if ((v - threshold) * (vr - threshold) < 0 || (v - threshold) * (vd - threshold) < 0) {
            const i = (py * size + px) * 4
            const a = dark ? 0.35 : 0.25
            img.data[i] = Math.floor(img.data[i] * (1 - a) + (dark ? 255 : 0) * a)
            img.data[i + 1] = Math.floor(img.data[i + 1] * (1 - a) + (dark ? 255 : 0) * a)
            img.data[i + 2] = Math.floor(img.data[i + 2] * (1 - a) + (dark ? 255 : 0) * a)
          }
        }
      }
    }
    return img
  }, [canvasSize])

  // Initialize states
  const initStates = useCallback(() => {
    const fn = LOSS_FUNCTIONS[lossFnIdx].fn
    const map = new Map<OptimizerName, OptState>()
    if (comparison) {
      OPTIMIZERS.forEach(o => map.set(o.key, createOptState(startPt[0], startPt[1], fn)))
    } else {
      const key = OPTIMIZERS[optimizerIdx].key
      map.set(key, createOptState(startPt[0], startPt[1], fn))
    }
    setStates(map)
    setRunning(false)
  }, [lossFnIdx, optimizerIdx, comparison, startPt])

  useEffect(() => { initStates() }, [initStates])

  // Rebuild surface on fn/dark change
  useEffect(() => {
    if (surfaceFnRef.current !== lossFnIdx || surfaceDarkRef.current !== isDark) {
      surfaceRef.current = computeSurface(lossFnIdx, isDark)
      surfaceFnRef.current = lossFnIdx
      surfaceDarkRef.current = isDark
    }
  }, [lossFnIdx, isDark, computeSurface])

  // Convert world coords to canvas pixel
  const toCanvas = useCallback((wx: number, wy: number): [number, number] => {
    const [lo, hi] = lossDef.range
    const px = ((wx - lo) / (hi - lo)) * canvasSize
    const py = ((wy - lo) / (hi - lo)) * canvasSize
    return [px, py]
  }, [lossDef.range, canvasSize])

  const fromCanvas = useCallback((px: number, py: number): [number, number] => {
    const [lo, hi] = lossDef.range
    const wx = lo + (px / canvasSize) * (hi - lo)
    const wy = lo + (py / canvasSize) * (hi - lo)
    return [wx, wy]
  }, [lossDef.range, canvasSize])

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const cssSize = canvasSize
    canvas.width = cssSize * dpr
    canvas.height = cssSize * dpr
    canvas.style.width = `${cssSize}px`
    canvas.style.height = `${cssSize}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Surface
    if (surfaceRef.current) {
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = canvasSize; tmpCanvas.height = canvasSize
      const tmpCtx = tmpCanvas.getContext('2d')!
      tmpCtx.putImageData(surfaceRef.current, 0, 0)
      ctx.drawImage(tmpCanvas, 0, 0, cssSize, cssSize)
    }

    // Axis labels
    const [lo, hi] = lossDef.range
    ctx.font = '10px sans-serif'
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
    for (let v = Math.ceil(lo); v <= Math.floor(hi); v++) {
      if (v === 0) continue
      const [px] = toCanvas(v, 0)
      ctx.fillText(String(v), px - 4, cssSize - 4)
      const [, py] = toCanvas(0, v)
      ctx.fillText(String(v), 4, py + 4)
    }
    // Draw axes
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 0.5
    const [ox, oy] = toCanvas(0, 0)
    ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, cssSize); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(cssSize, oy); ctx.stroke()

    // Draw paths
    states.forEach((st, key) => {
      const opt = OPTIMIZERS.find(o => o.key === key)!
      ctx.strokeStyle = opt.color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.beginPath()
      st.path.forEach(([wx, wy], i) => {
        const [px, py] = toCanvas(wx, wy)
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      })
      ctx.stroke()

      // Dots along path (every 5th)
      st.path.forEach(([wx, wy], i) => {
        if (i % 5 !== 0 && i !== st.path.length - 1) return
        const [px, py] = toCanvas(wx, wy)
        ctx.fillStyle = opt.color
        ctx.beginPath(); ctx.arc(px, py, i === st.path.length - 1 ? 5 : 2, 0, Math.PI * 2); ctx.fill()
      })

      // Current position glow
      if (st.path.length > 0) {
        const [wx, wy] = st.path[st.path.length - 1]
        const [px, py] = toCanvas(wx, wy)
        ctx.shadowColor = opt.color
        ctx.shadowBlur = 12
        ctx.fillStyle = opt.color
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0

        // Gradient arrow
        if (!st.converged) {
          const [gx, gy] = gradient(lossDef.fn, wx, wy)
          const gMag = Math.sqrt(gx * gx + gy * gy)
          if (gMag > 1e-6) {
            const arrowLen = Math.min(30, gMag * 8)
            const dx = (-gx / gMag) * arrowLen
            const dy = (-gy / gMag) * arrowLen
            ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
            ctx.lineWidth = 1.5
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx, py + dy); ctx.stroke()
            // Arrowhead
            const angle = Math.atan2(dy, dx)
            ctx.beginPath()
            ctx.moveTo(px + dx, py + dy)
            ctx.lineTo(px + dx - 6 * Math.cos(angle - 0.4), py + dy - 6 * Math.sin(angle - 0.4))
            ctx.lineTo(px + dx - 6 * Math.cos(angle + 0.4), py + dy - 6 * Math.sin(angle + 0.4))
            ctx.closePath(); ctx.fillStyle = isDark ? '#ffffff' : '#000000'; ctx.fill()
          }
        }
      }
    })

    // Start point indicator
    const [spx, spy] = toCanvas(startPt[0], startPt[1])
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(spx, spy, 10, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(spx - 5, spy); ctx.lineTo(spx + 5, spy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(spx, spy - 5); ctx.lineTo(spx, spy + 5); ctx.stroke()
  }, [states, lossDef, isDark, toCanvas, startPt, canvasSize])

  useEffect(() => { draw() }, [draw])

  // Animation loop
  useEffect(() => {
    if (!running) { cancelAnimationFrame(animRef.current); return }
    let frame = 0
    const loop = () => {
      frame++
      if (frame % Math.max(1, 6 - speed) === 0) {
        setStates(prev => {
          const next = new Map(prev)
          let allConverged = true
          next.forEach((st, key) => {
            if (!st.converged) {
              const updated = stepOptimizer(st, lossDef.fn, realLr, key)
              next.set(key, updated)
              if (!updated.converged) allConverged = false
            }
          })
          if (allConverged) setRunning(false)
          return next
        })
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [running, lossDef.fn, realLr, speed])

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const [wx, wy] = fromCanvas(px, py)
    setStartPt([Math.round(wx * 100) / 100, Math.round(wy * 100) / 100])
    setRunning(false)
  }, [fromCanvas])

  // Primary optimizer state for stats
  const primaryKey = comparison ? OPTIMIZERS[0].key : OPTIMIZERS[optimizerIdx].key
  const primaryState = states.get(primaryKey)

  // Mini loss chart
  const lossChartData = useMemo(() => {
    if (!primaryState) return []
    const l = primaryState.losses
    const start = Math.max(0, l.length - 100)
    return l.slice(start)
  }, [primaryState])

  const lossMin = useMemo(() => Math.min(...(lossChartData.length > 0 ? lossChartData : [0])), [lossChartData])
  const lossMax = useMemo(() => Math.max(...(lossChartData.length > 0 ? lossChartData : [1])), [lossChartData])

  // Presets
  const applyPreset = (fnIdx: number, start: [number, number], lrVal: number, comp: boolean) => {
    setLossFnIdx(fnIdx)
    setStartPt(start)
    setLr(Math.log10(lrVal))
    setComparison(comp)
    setRunning(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">경사하강법 시각화</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          2D 손실 함수 위에서 최적점을 찾아가는 경사하강법을 인터랙티브하게 학습하세요
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center">프리셋:</span>
        <button onClick={() => applyPreset(0, [4, 3], 0.05, true)} className="px-3 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition">
          간단한 볼록 함수 비교
        </button>
        <button onClick={() => applyPreset(1, [4, 3], 0.02, true)} className="px-3 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition">
          긴 타원 (느린 수렴)
        </button>
        <button onClick={() => applyPreset(2, [-3, -3], 0.005, false)} className="px-3 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition">
          Himmelblau (다중 최솟값)
        </button>
        <button onClick={() => applyPreset(3, [3, 3], 0.05, true)} className="px-3 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition">
          진동 함수 (지역 최솟값)
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">설정</h2>

            {/* Loss function */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">손실 함수</label>
              <select
                value={lossFnIdx}
                onChange={e => { setLossFnIdx(Number(e.target.value)); setRunning(false) }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {LOSS_FUNCTIONS.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{lossDef.desc}</p>
            </div>

            {/* Comparison toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={comparison}
                onChange={e => { setComparison(e.target.checked); setRunning(false) }}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">비교 모드 (전체 옵티마이저)</span>
            </label>

            {/* Optimizer (single mode) */}
            {!comparison && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">옵티마이저</label>
                <select
                  value={optimizerIdx}
                  onChange={e => { setOptimizerIdx(Number(e.target.value)); setRunning(false) }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {OPTIMIZERS.map((o, i) => <option key={i} value={i}>{o.name}</option>)}
                </select>
              </div>
            )}

            {/* Learning rate */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                학습률: <span className="font-mono text-blue-600 dark:text-blue-400">{realLr.toFixed(4)}</span>
              </label>
              <input
                type="range" min={-3} max={0} step={0.01} value={lr}
                onChange={e => setLr(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0.001</span><span>0.01</span><span>0.1</span><span>1.0</span>
              </div>
            </div>

            {/* Speed */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                속도: {speed}x
              </label>
              <input
                type="range" min={1} max={5} step={1} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setRunning(r => !r)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition"
              >
                {running ? <><Pause size={14} /> 일시정지</> : <><Play size={14} /> 시작</>}
              </button>
              <button
                onClick={initStates}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <MousePointer size={12} />
              캔버스를 클릭하여 시작점 지정
            </div>
          </div>

          {/* Legend (comparison mode) */}
          {comparison && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">범례</h3>
              <div className="space-y-1.5">
                {OPTIMIZERS.map(o => {
                  const st = states.get(o.key)
                  return (
                    <div key={o.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: o.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{o.name}</span>
                      </div>
                      <span className="font-mono text-gray-500 dark:text-gray-400">
                        {st ? `${st.t}회` : '-'}
                        {st?.converged && ' ✓'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full cursor-crosshair rounded-lg"
              style={{ maxWidth: canvasSize, maxHeight: canvasSize, aspectRatio: '1/1' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">통계</h2>
            {primaryState && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">위치 (x, y)</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">
                      ({primaryState.x.toFixed(3)}, {primaryState.y.toFixed(3)})
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">손실값</div>
                    <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {primaryState.losses[primaryState.losses.length - 1]?.toFixed(6)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">반복 횟수</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white">{primaryState.t}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">상태</div>
                    <div className={`text-sm font-medium ${primaryState.converged ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {primaryState.converged ? '수렴 완료' : running ? '최적화 중...' : '대기'}
                    </div>
                  </div>
                </div>

                {/* Mini loss chart */}
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">손실 히스토리 (최근 100회)</div>
                  <div className="h-20 bg-gray-50 dark:bg-gray-900 rounded-lg p-1 relative overflow-hidden">
                    {lossChartData.length > 1 && (
                      <svg viewBox={`0 0 ${lossChartData.length - 1} 100`} className="w-full h-full" preserveAspectRatio="none">
                        <polyline
                          points={lossChartData.map((v, i) => {
                            const ny = lossMax === lossMin ? 50 : 100 - ((v - lossMin) / (lossMax - lossMin)) * 90 - 5
                            return `${i},${ny}`
                          }).join(' ')}
                          fill="none"
                          stroke={isDark ? '#60a5fa' : '#3b82f6'}
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                    <div className="absolute top-0 left-1 text-[8px] text-gray-400">{lossMax.toFixed(2)}</div>
                    <div className="absolute bottom-0 left-1 text-[8px] text-gray-400">{lossMin.toFixed(4)}</div>
                  </div>
                </div>
              </>
            )}

            {/* Comparison stats table */}
            {comparison && (
              <div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">수렴 비교</div>
                <div className="space-y-1">
                  {OPTIMIZERS.map(o => {
                    const st = states.get(o.key)
                    if (!st) return null
                    const lastLoss = st.losses[st.losses.length - 1]
                    return (
                      <div key={o.key} className="flex items-center gap-2 text-[11px]">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                        <span className="text-gray-600 dark:text-gray-400 w-16 truncate">{o.key}</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200 flex-1 text-right">
                          {lastLoss?.toFixed(4)}
                        </span>
                        <span className="font-mono text-gray-500 w-10 text-right">{st.t}회</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Start point display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">시작점</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400">x</label>
                <input
                  type="number" step="0.5" value={startPt[0]}
                  onChange={e => { setStartPt([Number(e.target.value), startPt[1]]); setRunning(false) }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400">y</label>
                <input
                  type="number" step="0.5" value={startPt[1]}
                  onChange={e => { setStartPt([startPt[0], Number(e.target.value)]); setRunning(false) }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">경사하강법 가이드</h2>
          </div>
          {guideOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {guideOpen && (
          <div className="mt-6 space-y-6">
            {/* What is */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">경사하강법이란?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                경사하강법(Gradient Descent)은 함수의 최솟값을 찾기 위해 기울기(gradient)의 반대 방향으로 조금씩 이동하는 최적화 알고리즘입니다.
                산 위에서 공이 가장 낮은 곳을 향해 굴러가는 것과 같은 원리입니다.
                머신러닝에서는 손실 함수(loss function)를 최소화하여 모델의 파라미터를 학습하는 데 핵심적으로 사용됩니다.
              </p>
            </div>

            {/* Optimizer comparison */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">최적화 알고리즘 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">알고리즘</th>
                      <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">원리</th>
                      <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">장점</th>
                      <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-medium">단점</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300">
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-2 font-medium">SGD</td>
                      <td className="py-2 px-2">기울기 × 학습률만큼 이동</td>
                      <td className="py-2 px-2">단순, 메모리 효율적</td>
                      <td className="py-2 px-2">느린 수렴, 진동</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-2 font-medium">Momentum</td>
                      <td className="py-2 px-2">이전 이동 방향의 관성 유지</td>
                      <td className="py-2 px-2">빠른 수렴, 진동 감소</td>
                      <td className="py-2 px-2">하이퍼파라미터 1개 추가</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-2 font-medium">RMSProp</td>
                      <td className="py-2 px-2">기울기 크기에 따라 학습률 조절</td>
                      <td className="py-2 px-2">방향별 적응형 학습률</td>
                      <td className="py-2 px-2">전역 학습률 선택 필요</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 font-medium">Adam</td>
                      <td className="py-2 px-2">Momentum + RMSProp 결합</td>
                      <td className="py-2 px-2">대부분의 경우 안정적</td>
                      <td className="py-2 px-2">일반화 성능이 SGD보다 낮을 수 있음</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Learning rate */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">학습률의 중요성</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                  <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">너무 크면</div>
                  <p className="text-xs text-red-600 dark:text-red-400">최솟값을 지나쳐 발산하거나, 값이 튀어 수렴하지 못합니다.</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">적절하면</div>
                  <p className="text-xs text-green-600 dark:text-green-400">안정적으로 최솟값에 수렴합니다. 함수와 옵티마이저에 따라 달라집니다.</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3">
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">너무 작으면</div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">수렴이 매우 느리고, 지역 최솟값에 갇힐 수 있습니다.</p>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">자주 묻는 질문</h3>
              <div className="space-y-3">
                {[
                  { q: '경사하강법은 항상 최솟값을 찾나요?', a: '볼록(convex) 함수에서는 전역 최솟값을 찾지만, 비볼록 함수에서는 지역 최솟값이나 안장점에 갇힐 수 있습니다. "진동 함수" 프리셋에서 확인해보세요.' },
                  { q: 'Adam이 항상 가장 좋은 옵티마이저인가요?', a: '실무에서 Adam은 안정적인 기본 선택이지만, 일부 연구에서는 잘 튜닝된 SGD+Momentum이 더 좋은 일반화 성능을 보입니다. 문제에 따라 달라집니다.' },
                  { q: '모멘텀은 왜 빠른가요?', a: '이전 이동 방향의 관성을 유지하므로, 좁은 골짜기에서 진동이 줄어들고 일관된 방향으로 더 빠르게 이동합니다. "긴 타원" 프리셋에서 SGD와 비교해보세요.' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Q. {item.q}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{item.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
