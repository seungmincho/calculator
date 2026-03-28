'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──
interface Process {
  id: number
  name: string
  arrivalTime: number
  burstTime: number
  priority: number
  color: string
}

interface TimelineEvent {
  processId: number | null // null = idle
  start: number
  end: number
}

interface ProcessStats {
  id: number
  name: string
  waitingTime: number
  turnaroundTime: number
  responseTime: number
}

interface SimResult {
  algorithm: string
  timeline: TimelineEvent[]
  stats: ProcessStats[]
  avgWaiting: number
  avgTurnaround: number
  avgResponse: number
}

type Algorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'Priority'

const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']
const ALGO_LABELS: Record<Algorithm, string> = {
  FCFS: 'FCFS (선입선출)',
  SJF: 'SJF (최단작업 우선)',
  SRTF: 'SRTF (최소잔여시간)',
  RR: 'Round Robin',
  Priority: 'Priority (우선순위)',
}

// ── Scheduling Algorithms ──
function runFCFS(procs: Process[]): TimelineEvent[] {
  const sorted = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime || a.id - b.id)
  const timeline: TimelineEvent[] = []
  let time = 0
  for (const p of sorted) {
    if (time < p.arrivalTime) {
      timeline.push({ processId: null, start: time, end: p.arrivalTime })
      time = p.arrivalTime
    }
    timeline.push({ processId: p.id, start: time, end: time + p.burstTime })
    time += p.burstTime
  }
  return timeline
}

function runSJF(procs: Process[]): TimelineEvent[] {
  const remaining = procs.map(p => ({ ...p, rem: p.burstTime }))
  const timeline: TimelineEvent[] = []
  const done = new Set<number>()
  let time = 0
  while (done.size < procs.length) {
    const available = remaining.filter(p => p.arrivalTime <= time && !done.has(p.id))
    if (available.length === 0) {
      const next = remaining.filter(p => !done.has(p.id)).sort((a, b) => a.arrivalTime - b.arrivalTime)[0]
      timeline.push({ processId: null, start: time, end: next.arrivalTime })
      time = next.arrivalTime
      continue
    }
    available.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime)
    const p = available[0]
    timeline.push({ processId: p.id, start: time, end: time + p.burstTime })
    time += p.burstTime
    done.add(p.id)
  }
  return timeline
}

function runSRTF(procs: Process[]): TimelineEvent[] {
  const remaining = procs.map(p => ({ ...p, rem: p.burstTime }))
  const timeline: TimelineEvent[] = []
  const done = new Set<number>()
  let time = 0
  const maxTime = procs.reduce((s, p) => s + p.arrivalTime + p.burstTime, 0)
  while (done.size < procs.length && time < maxTime) {
    const available = remaining.filter(p => p.arrivalTime <= time && !done.has(p.id) && p.rem > 0)
    if (available.length === 0) {
      const next = remaining.filter(p => !done.has(p.id)).sort((a, b) => a.arrivalTime - b.arrivalTime)[0]
      if (!next) break
      timeline.push({ processId: null, start: time, end: next.arrivalTime })
      time = next.arrivalTime
      continue
    }
    available.sort((a, b) => a.rem - b.rem || a.arrivalTime - b.arrivalTime)
    const p = available[0]
    // Run for 1 unit
    const last = timeline[timeline.length - 1]
    if (last && last.processId === p.id && last.end === time) {
      last.end = time + 1
    } else {
      timeline.push({ processId: p.id, start: time, end: time + 1 })
    }
    p.rem--
    time++
    if (p.rem === 0) done.add(p.id)
  }
  return timeline
}

function runRR(procs: Process[], quantum: number): TimelineEvent[] {
  const queue: { id: number; rem: number }[] = []
  const remaining = procs.map(p => ({ ...p, rem: p.burstTime }))
  const sorted = [...remaining].sort((a, b) => a.arrivalTime - b.arrivalTime)
  const timeline: TimelineEvent[] = []
  const done = new Set<number>()
  let time = 0
  let idx = 0
  // Add initial processes
  while (idx < sorted.length && sorted[idx].arrivalTime <= time) {
    queue.push({ id: sorted[idx].id, rem: sorted[idx].rem })
    idx++
  }
  while (done.size < procs.length) {
    if (queue.length === 0) {
      if (idx < sorted.length) {
        timeline.push({ processId: null, start: time, end: sorted[idx].arrivalTime })
        time = sorted[idx].arrivalTime
        while (idx < sorted.length && sorted[idx].arrivalTime <= time) {
          queue.push({ id: sorted[idx].id, rem: sorted[idx].rem })
          idx++
        }
      } else break
      continue
    }
    const cur = queue.shift()!
    const run = Math.min(cur.rem, quantum)
    const last = timeline[timeline.length - 1]
    if (last && last.processId === cur.id && last.end === time) {
      last.end = time + run
    } else {
      timeline.push({ processId: cur.id, start: time, end: time + run })
    }
    time += run
    cur.rem -= run
    // Add newly arrived processes before re-adding current
    while (idx < sorted.length && sorted[idx].arrivalTime <= time) {
      queue.push({ id: sorted[idx].id, rem: sorted[idx].rem })
      idx++
    }
    if (cur.rem > 0) {
      queue.push(cur)
    } else {
      done.add(cur.id)
    }
  }
  return timeline
}

function runPriority(procs: Process[]): TimelineEvent[] {
  const remaining = procs.map(p => ({ ...p, rem: p.burstTime }))
  const timeline: TimelineEvent[] = []
  const done = new Set<number>()
  let time = 0
  while (done.size < procs.length) {
    const available = remaining.filter(p => p.arrivalTime <= time && !done.has(p.id))
    if (available.length === 0) {
      const next = remaining.filter(p => !done.has(p.id)).sort((a, b) => a.arrivalTime - b.arrivalTime)[0]
      if (!next) break
      timeline.push({ processId: null, start: time, end: next.arrivalTime })
      time = next.arrivalTime
      continue
    }
    // Lower number = higher priority (non-preemptive)
    available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime)
    const p = available[0]
    timeline.push({ processId: p.id, start: time, end: time + p.burstTime })
    time += p.burstTime
    done.add(p.id)
  }
  return timeline
}

function computeStats(procs: Process[], timeline: TimelineEvent[]): ProcessStats[] {
  return procs.map(p => {
    const events = timeline.filter(e => e.processId === p.id)
    const firstStart = events.length > 0 ? events[0].start : 0
    const lastEnd = events.length > 0 ? events[events.length - 1].end : 0
    const totalExec = events.reduce((s, e) => s + (e.end - e.start), 0)
    const turnaroundTime = lastEnd - p.arrivalTime
    const waitingTime = turnaroundTime - totalExec
    const responseTime = firstStart - p.arrivalTime
    return { id: p.id, name: p.name, waitingTime, turnaroundTime, responseTime }
  })
}

function simulate(procs: Process[], algo: Algorithm, quantum: number): SimResult {
  let timeline: TimelineEvent[]
  switch (algo) {
    case 'FCFS': timeline = runFCFS(procs); break
    case 'SJF': timeline = runSJF(procs); break
    case 'SRTF': timeline = runSRTF(procs); break
    case 'RR': timeline = runRR(procs, quantum); break
    case 'Priority': timeline = runPriority(procs); break
  }
  const stats = computeStats(procs, timeline)
  const n = stats.length || 1
  return {
    algorithm: ALGO_LABELS[algo],
    timeline,
    stats,
    avgWaiting: stats.reduce((s, st) => s + st.waitingTime, 0) / n,
    avgTurnaround: stats.reduce((s, st) => s + st.turnaroundTime, 0) / n,
    avgResponse: stats.reduce((s, st) => s + st.responseTime, 0) / n,
  }
}

// ── Presets ──
const PRESETS: { label: string; procs: Omit<Process, 'color'>[] }[] = [
  { label: '기본 3개 프로세스', procs: [
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 2, priority: 3 },
  ]},
  { label: '동시 도착 4개', procs: [
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
    { id: 2, name: 'P2', arrivalTime: 0, burstTime: 4, priority: 1 },
    { id: 3, name: 'P3', arrivalTime: 0, burstTime: 2, priority: 4 },
    { id: 4, name: 'P4', arrivalTime: 0, burstTime: 6, priority: 2 },
  ]},
  { label: '우선순위 역전', procs: [
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 10, priority: 3 },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 1, priority: 1 },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 3, priority: 2 },
    { id: 4, name: 'P4', arrivalTime: 3, burstTime: 2, priority: 1 },
  ]},
  { label: 'RR 비교용 (5개)', procs: [
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
    { id: 4, name: 'P4', arrivalTime: 3, burstTime: 2, priority: 4 },
    { id: 5, name: 'P5', arrivalTime: 4, burstTime: 4, priority: 2 },
  ]},
]

// ── Gantt Chart Canvas ──
function GanttCanvas({ results, processes, currentTime }: {
  results: SimResult[]
  processes: Process[]
  currentTime: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [darkTick, setDarkTick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || results.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const maxEnd = Math.max(...results.flatMap(r => r.timeline.map(e => e.end)), 1)
    const ROW_H = 36
    const LABEL_W = 160
    const PADDING = 20
    const TOP_AXIS = 28
    const SECTION_GAP = 16
    const ALGO_LABEL_H = 24

    const totalSections = results.length
    const canvasH = PADDING + totalSections * (ALGO_LABEL_H + TOP_AXIS + processes.length * ROW_H + SECTION_GAP)
    const canvasW = container.clientWidth

    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = canvasW + 'px'
    canvas.style.height = canvasH + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#e5e7eb' : '#1f2937'
    const mutedColor = isDark ? '#6b7280' : '#9ca3af'
    const gridColor = isDark ? '#374151' : '#e5e7eb'
    const bgColor = isDark ? '#1f2937' : '#ffffff'
    const idleBg = isDark ? '#374151' : '#f3f4f6'

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvasW, canvasH)

    const chartW = canvasW - LABEL_W - PADDING * 2
    const unitW = chartW / maxEnd

    let yOffset = PADDING

    for (const result of results) {
      // Algorithm label
      ctx.fillStyle = textColor
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillText(result.algorithm, PADDING, yOffset + 14)
      yOffset += ALGO_LABEL_H

      // Time axis
      ctx.fillStyle = mutedColor
      ctx.font = '11px system-ui, sans-serif'
      for (let t = 0; t <= maxEnd; t++) {
        const x = LABEL_W + PADDING + t * unitW
        ctx.fillStyle = gridColor
        ctx.fillRect(x, yOffset + TOP_AXIS - 4, 1, processes.length * ROW_H + 4)
        ctx.fillStyle = mutedColor
        ctx.textAlign = 'center'
        ctx.fillText(String(t), x, yOffset + TOP_AXIS - 8)
      }
      ctx.textAlign = 'left'

      // Process rows
      for (let pi = 0; pi < processes.length; pi++) {
        const p = processes[pi]
        const y = yOffset + TOP_AXIS + pi * ROW_H
        // Row label
        ctx.fillStyle = textColor
        ctx.font = '12px system-ui, sans-serif'
        ctx.fillText(p.name, PADDING + 4, y + ROW_H / 2 + 4)
        // Arrival marker
        const arrX = LABEL_W + PADDING + p.arrivalTime * unitW
        ctx.fillStyle = p.color + '40'
        ctx.fillRect(arrX, y + 2, 2, ROW_H - 4)
      }

      // Timeline bars
      for (const event of result.timeline) {
        const x = LABEL_W + PADDING + event.start * unitW
        const w = (event.end - event.start) * unitW
        if (event.processId === null) {
          // Idle
          ctx.fillStyle = idleBg
          ctx.strokeStyle = mutedColor
          ctx.setLineDash([4, 3])
          const idleY = yOffset + TOP_AXIS + 2
          const idleH = processes.length * ROW_H - 4
          ctx.fillRect(x + 1, idleY, w - 2, idleH)
          ctx.strokeRect(x + 1, idleY, w - 2, idleH)
          ctx.setLineDash([])
        } else {
          const proc = processes.find(pr => pr.id === event.processId)
          if (!proc) continue
          const pi = processes.indexOf(proc)
          const y = yOffset + TOP_AXIS + pi * ROW_H
          const barH = ROW_H - 6

          // Dim future events
          const alpha = event.start < currentTime ? '' : '60'
          ctx.fillStyle = proc.color + alpha
          ctx.beginPath()
          ctx.roundRect(x + 1, y + 3, w - 2, barH, 4)
          ctx.fill()

          // Current time highlight
          if (event.start <= currentTime && currentTime < event.end) {
            ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.roundRect(x + 1, y + 3, w - 2, barH, 4)
            ctx.stroke()
            ctx.lineWidth = 1
          }

          // Label inside bar
          if (w > 20) {
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 11px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(proc.name, x + w / 2, y + 3 + barH / 2 + 4)
            ctx.textAlign = 'left'
          }
        }
      }

      // Current time indicator line
      if (currentTime > 0) {
        const cx = LABEL_W + PADDING + currentTime * unitW
        ctx.strokeStyle = isDark ? '#fbbf24' : '#dc2626'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 3])
        ctx.beginPath()
        ctx.moveTo(cx, yOffset + TOP_AXIS - 4)
        ctx.lineTo(cx, yOffset + TOP_AXIS + processes.length * ROW_H)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.lineWidth = 1
        // Time label
        ctx.fillStyle = isDark ? '#fbbf24' : '#dc2626'
        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`t=${currentTime}`, cx, yOffset + TOP_AXIS + processes.length * ROW_H + 14)
        ctx.textAlign = 'left'
      }

      yOffset += TOP_AXIS + processes.length * ROW_H + SECTION_GAP
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, processes, currentTime, darkTick])

  // Dark mode observer
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDarkTick(t => t + 1)
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  if (results.length === 0) return null

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  )
}

// ── Main Component ──
export default function CpuSchedulingVisualizer() {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 6, priority: 2, color: COLORS[0] },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 4, priority: 1, color: COLORS[1] },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 2, priority: 3, color: COLORS[2] },
  ])
  const [algorithm, setAlgorithm] = useState<Algorithm>('FCFS')
  const [quantum, setQuantum] = useState(2)
  const [compareMode, setCompareMode] = useState(false)
  const [compareAlgos, setCompareAlgos] = useState<Algorithm[]>(['FCFS', 'SJF', 'RR'])
  const [results, setResults] = useState<SimResult[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextId = useRef(4)

  const maxEnd = results.length > 0
    ? Math.max(...results.flatMap(r => r.timeline.map(e => e.end)), 1)
    : 0

  const runSimulation = useCallback(() => {
    if (processes.length === 0) return
    const algos = compareMode ? compareAlgos : [algorithm]
    const res = algos.map(a => simulate(processes, a, quantum))
    setResults(res)
    setCurrentTime(0)
    setIsPlaying(false)
    if (animRef.current) clearInterval(animRef.current)
  }, [processes, algorithm, quantum, compareMode, compareAlgos])

  const togglePlay = useCallback(() => {
    if (results.length === 0) return
    if (isPlaying) {
      if (animRef.current) clearInterval(animRef.current)
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      const end = Math.max(...results.flatMap(r => r.timeline.map(e => e.end)))
      animRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= end) {
            if (animRef.current) clearInterval(animRef.current)
            setIsPlaying(false)
            return end
          }
          return prev + 1
        })
      }, 500)
    }
  }, [isPlaying, results])

  const resetAnim = useCallback(() => {
    if (animRef.current) clearInterval(animRef.current)
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  useEffect(() => {
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [])

  const addProcess = () => {
    const id = nextId.current++
    setProcesses(prev => [...prev, {
      id, name: `P${id}`, arrivalTime: 0, burstTime: 3, priority: 1, color: COLORS[(id - 1) % COLORS.length]
    }])
  }

  const removeProcess = (id: number) => setProcesses(prev => prev.filter(p => p.id !== id))

  const updateProcess = (id: number, field: keyof Process, value: number) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, [field]: Math.max(0, value) } : p))
  }

  const loadPreset = (idx: number) => {
    const preset = PRESETS[idx]
    nextId.current = preset.procs.length + 1
    setProcesses(preset.procs.map((p, i) => ({ ...p, color: COLORS[i % COLORS.length] })))
    setResults([])
    setCurrentTime(0)
  }

  const toggleCompareAlgo = (a: Algorithm) => {
    setCompareAlgos(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  const inputCls = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CPU 스케줄링 시각화</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          FCFS, SJF, SRTF, Round Robin, Priority 스케줄링 알고리즘을 간트 차트로 비교하세요
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">프리셋</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((pr, i) => (
                <button key={i} onClick={() => loadPreset(i)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Process Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">프로세스</h3>
              <button onClick={addProcess} disabled={processes.length >= 8}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Plus size={12} /> 추가
              </button>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {processes.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="w-7 font-medium text-gray-700 dark:text-gray-300 shrink-0">{p.name}</span>
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <div>
                      <label className="text-gray-400 text-[10px]">도착</label>
                      <input type="number" min={0} value={p.arrivalTime}
                        onChange={e => updateProcess(p.id, 'arrivalTime', parseInt(e.target.value) || 0)}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-[10px]">실행</label>
                      <input type="number" min={1} value={p.burstTime}
                        onChange={e => updateProcess(p.id, 'burstTime', Math.max(1, parseInt(e.target.value) || 1))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-[10px]">우선순위</label>
                      <input type="number" min={1} value={p.priority}
                        onChange={e => updateProcess(p.id, 'priority', Math.max(1, parseInt(e.target.value) || 1))}
                        className={inputCls} />
                    </div>
                  </div>
                  <button onClick={() => removeProcess(p.id)}
                    className="text-red-400 hover:text-red-600 shrink-0 p-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={compareMode}
                onChange={e => setCompareMode(e.target.checked)}
                className="accent-violet-600" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">비교 모드</span>
            </label>

            {compareMode ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">비교할 알고리즘 선택:</p>
                {(Object.keys(ALGO_LABELS) as Algorithm[]).map(a => (
                  <label key={a} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={compareAlgos.includes(a)}
                      onChange={() => toggleCompareAlgo(a)}
                      className="accent-violet-600" />
                    {ALGO_LABELS[a]}
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">알고리즘</label>
                <select value={algorithm} onChange={e => setAlgorithm(e.target.value as Algorithm)}
                  className={inputCls}>
                  {(Object.keys(ALGO_LABELS) as Algorithm[]).map(a => (
                    <option key={a} value={a}>{ALGO_LABELS[a]}</option>
                  ))}
                </select>
              </div>
            )}

            {((!compareMode && algorithm === 'RR') || (compareMode && compareAlgos.includes('RR'))) && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Time Quantum</label>
                <input type="number" min={1} max={20} value={quantum}
                  onChange={e => setQuantum(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputCls} />
              </div>
            )}

            <button onClick={runSimulation} disabled={processes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all">
              <Play size={16} /> 실행
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Gantt Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">간트 차트</h3>
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={togglePlay}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors">
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    {isPlaying ? '일시정지' : '재생'}
                  </button>
                  <button onClick={resetAnim}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <RotateCcw size={12} /> 초기화
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    t = {currentTime} / {maxEnd}
                  </span>
                </div>
              )}
            </div>
            {results.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
                프로세스를 설정하고 &quot;실행&quot; 버튼을 클릭하세요
              </div>
            ) : (
              <>
                {/* Time slider */}
                <input type="range" min={0} max={maxEnd} value={currentTime}
                  onChange={e => { setCurrentTime(parseInt(e.target.value)); setIsPlaying(false); if (animRef.current) clearInterval(animRef.current) }}
                  className="w-full mb-2 accent-violet-600" />
                <GanttCanvas results={results} processes={processes} currentTime={currentTime} />
              </>
            )}
          </div>

          {/* Statistics */}
          {results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">통계</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {results.length > 1 && <th className="text-left py-2 px-2 text-gray-500">알고리즘</th>}
                      <th className="text-left py-2 px-2 text-gray-500">프로세스</th>
                      <th className="text-right py-2 px-2 text-gray-500">대기 시간</th>
                      <th className="text-right py-2 px-2 text-gray-500">반환 시간</th>
                      <th className="text-right py-2 px-2 text-gray-500">응답 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, ri) => (
                      <React.Fragment key={ri}>
                        {r.stats.map((s, si) => (
                          <tr key={`${ri}-${si}`} className="border-b border-gray-100 dark:border-gray-700/50">
                            {results.length > 1 && si === 0 && (
                              <td rowSpan={r.stats.length + 1} className="py-1.5 px-2 text-gray-700 dark:text-gray-300 font-medium align-top">
                                {r.algorithm}
                              </td>
                            )}
                            <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{s.name}</td>
                            <td className="py-1.5 px-2 text-right text-gray-700 dark:text-gray-300">{s.waitingTime}</td>
                            <td className="py-1.5 px-2 text-right text-gray-700 dark:text-gray-300">{s.turnaroundTime}</td>
                            <td className="py-1.5 px-2 text-right text-gray-700 dark:text-gray-300">{s.responseTime}</td>
                          </tr>
                        ))}
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                          <td className="py-1.5 px-2 font-semibold text-violet-700 dark:text-violet-300">평균</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-violet-700 dark:text-violet-300">{r.avgWaiting.toFixed(1)}</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-violet-700 dark:text-violet-300">{r.avgTurnaround.toFixed(1)}</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-violet-700 dark:text-violet-300">{r.avgResponse.toFixed(1)}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button onClick={() => setGuideOpen(!guideOpen)}
          className="flex items-center justify-between w-full text-left">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CPU 스케줄링 가이드</h2>
          {guideOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {guideOpen && (
          <div className="mt-4 space-y-6 text-sm text-gray-700 dark:text-gray-300">
            {/* What is */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">CPU 스케줄링이란?</h3>
              <p className="leading-relaxed">
                CPU 스케줄링은 운영체제가 여러 프로세스 중 어떤 프로세스에 CPU를 할당할지 결정하는 핵심 기능입니다.
                멀티프로그래밍 환경에서 CPU 이용률을 극대화하고 응답 시간을 최소화하기 위해 다양한 알고리즘이 사용됩니다.
              </p>
            </div>

            {/* Algorithm Comparison */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">알고리즘 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-violet-50 dark:bg-violet-900/30">
                      <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left">알고리즘</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left">선점</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left">기준</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left">장점</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-left">단점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['FCFS', '비선점', '도착 순서', '구현 간단, 기아 없음', 'Convoy Effect, 긴 대기 시간'],
                      ['SJF', '비선점', '실행 시간', '최적 평균 대기 시간', '실행 시간 예측 어려움, 기아 발생'],
                      ['SRTF', '선점', '남은 시간', 'SJF보다 더 나은 대기 시간', '잦은 문맥 교환, 기아 발생'],
                      ['Round Robin', '선점', '시간 할당량', '공정, 응답 시간 우수', 'Quantum 선택이 성능 좌우'],
                      ['Priority', '비선점', '우선순위', '중요 작업 우선 처리', '기아 발생 (에이징으로 해결)'],
                    ].map(([algo, preempt, criteria, pros, cons], i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="border border-gray-200 dark:border-gray-600 px-3 py-1.5 font-medium">{algo}</td>
                        <td className="border border-gray-200 dark:border-gray-600 px-3 py-1.5">{preempt}</td>
                        <td className="border border-gray-200 dark:border-gray-600 px-3 py-1.5">{criteria}</td>
                        <td className="border border-gray-200 dark:border-gray-600 px-3 py-1.5">{pros}</td>
                        <td className="border border-gray-200 dark:border-gray-600 px-3 py-1.5">{cons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Terms */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">핵심 용어</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium text-violet-700 dark:text-violet-300">대기 시간 (Waiting Time)</dt>
                  <dd className="ml-4 text-gray-600 dark:text-gray-400">프로세스가 준비 큐에서 CPU를 기다린 총 시간. 반환 시간 - 실행 시간.</dd>
                </div>
                <div>
                  <dt className="font-medium text-violet-700 dark:text-violet-300">반환 시간 (Turnaround Time)</dt>
                  <dd className="ml-4 text-gray-600 dark:text-gray-400">프로세스 제출부터 완료까지의 총 시간. 대기 시간 + 실행 시간.</dd>
                </div>
                <div>
                  <dt className="font-medium text-violet-700 dark:text-violet-300">응답 시간 (Response Time)</dt>
                  <dd className="ml-4 text-gray-600 dark:text-gray-400">프로세스 제출 후 최초로 CPU를 할당받기까지의 시간. 대화형 시스템에서 중요.</dd>
                </div>
                <div>
                  <dt className="font-medium text-violet-700 dark:text-violet-300">문맥 교환 (Context Switch)</dt>
                  <dd className="ml-4 text-gray-600 dark:text-gray-400">CPU가 다른 프로세스로 전환할 때 현재 상태를 저장하고 복원하는 과정. 오버헤드 발생.</dd>
                </div>
              </dl>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h3>
              <div className="space-y-3">
                {[
                  { q: 'SJF가 최적인데 왜 실무에서 잘 안 쓰나요?', a: 'SJF는 프로세스의 실행 시간을 미리 알아야 하는데, 실제로는 예측이 어렵습니다. 과거 실행 이력을 기반으로 추정(지수 평균)하는 방법이 있지만 정확하지 않아, 실무에서는 Round Robin이나 멀티레벨 큐를 주로 사용합니다.' },
                  { q: 'Round Robin의 시간 할당량은 어떻게 정하나요?', a: '할당량이 너무 크면 FCFS와 같아지고, 너무 작으면 문맥 교환 오버헤드가 커집니다. 일반적으로 CPU 버스트의 80%가 할당량 이내에 완료되도록 설정합니다. Linux CFS는 가변적인 타임슬라이스를 사용합니다.' },
                  { q: '기아(Starvation)란 무엇이며 어떻게 해결하나요?', a: '우선순위가 낮은 프로세스가 무한히 대기하는 현상입니다. 에이징(Aging) 기법으로 대기 시간이 길어질수록 우선순위를 높여 해결합니다. 또는 Round Robin을 혼합하는 방법도 있습니다.' },
                ].map(({ q, a }, i) => (
                  <div key={i} className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
                    <p className="font-medium text-violet-800 dark:text-violet-200 mb-1">Q. {q}</p>
                    <p className="text-gray-600 dark:text-gray-400">{a}</p>
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
