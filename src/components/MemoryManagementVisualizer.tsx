'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, RotateCcw, BarChart3, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──
type Algorithm = 'FIFO' | 'LRU' | 'LFU' | 'Optimal'

interface StepResult {
  frames: (number | null)[]
  isHit: boolean
  evicted: number | null
  reason: string
}

interface SimResult {
  steps: StepResult[]
  faults: number
  hits: number
}

// ── Presets ──
const PRESETS: { label: string; pages: string; desc: string }[] = [
  { label: '기본 예제', pages: '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1', desc: '교과서 표준 예제 (20 references)' },
  { label: "Belady's Anomaly", pages: '1 2 3 4 1 2 5 1 2 3 4 5', desc: 'FIFO에서 프레임 3→4 증가 시 폴트 증가' },
  { label: 'LRU 최적', pages: '1 2 3 4 2 1 5 6 2 1 2 3 7 6 3 2 1 2 3 6', desc: 'LRU가 FIFO보다 유리한 패턴' },
  { label: '짧은 예제', pages: '1 2 3 2 1 4 5 2 1 3', desc: '빠른 테스트용 (10 references)' },
]

// ── Algorithms ──
function simulateFIFO(pages: number[], frameCount: number): SimResult {
  const frames: (number | null)[] = Array(frameCount).fill(null)
  const queue: number[] = []
  const steps: StepResult[] = []
  let faults = 0, hits = 0

  for (const page of pages) {
    if (frames.includes(page)) {
      hits++
      steps.push({ frames: [...frames], isHit: true, evicted: null, reason: `${page}이(가) 프레임에 존재 → 히트` })
    } else {
      faults++
      let evicted: number | null = null
      const emptyIdx = frames.indexOf(null)
      if (emptyIdx !== -1) {
        frames[emptyIdx] = page
        queue.push(page)
        steps.push({ frames: [...frames], isHit: false, evicted: null, reason: `빈 프레임에 ${page} 적재` })
      } else {
        evicted = queue.shift()!
        const idx = frames.indexOf(evicted)
        frames[idx] = page
        queue.push(page)
        steps.push({ frames: [...frames], isHit: false, evicted, reason: `가장 먼저 들어온 ${evicted} 교체 → ${page} 적재` })
      }
    }
  }
  return { steps, faults, hits }
}

function simulateLRU(pages: number[], frameCount: number): SimResult {
  const frames: (number | null)[] = Array(frameCount).fill(null)
  const recent: number[] = []
  const steps: StepResult[] = []
  let faults = 0, hits = 0

  for (const page of pages) {
    if (frames.includes(page)) {
      hits++
      recent.splice(recent.indexOf(page), 1)
      recent.push(page)
      steps.push({ frames: [...frames], isHit: true, evicted: null, reason: `${page}이(가) 프레임에 존재 → 히트` })
    } else {
      faults++
      let evicted: number | null = null
      const emptyIdx = frames.indexOf(null)
      if (emptyIdx !== -1) {
        frames[emptyIdx] = page
        recent.push(page)
        steps.push({ frames: [...frames], isHit: false, evicted: null, reason: `빈 프레임에 ${page} 적재` })
      } else {
        evicted = recent.shift()!
        const idx = frames.indexOf(evicted)
        frames[idx] = page
        recent.push(page)
        steps.push({ frames: [...frames], isHit: false, evicted, reason: `가장 오래 전 사용된 ${evicted} 교체 → ${page} 적재` })
      }
    }
  }
  return { steps, faults, hits }
}

function simulateLFU(pages: number[], frameCount: number): SimResult {
  const frames: (number | null)[] = Array(frameCount).fill(null)
  const freq: Map<number, number> = new Map()
  const order: Map<number, number> = new Map()
  const steps: StepResult[] = []
  let faults = 0, hits = 0, tick = 0

  for (const page of pages) {
    tick++
    if (frames.includes(page)) {
      hits++
      freq.set(page, (freq.get(page) || 0) + 1)
      order.set(page, tick)
      steps.push({ frames: [...frames], isHit: true, evicted: null, reason: `${page}이(가) 프레임에 존재 (빈도 ${freq.get(page)}) → 히트` })
    } else {
      faults++
      let evicted: number | null = null
      const emptyIdx = frames.indexOf(null)
      if (emptyIdx !== -1) {
        frames[emptyIdx] = page
        freq.set(page, 1)
        order.set(page, tick)
        steps.push({ frames: [...frames], isHit: false, evicted: null, reason: `빈 프레임에 ${page} 적재` })
      } else {
        // Find page with lowest frequency, break ties by oldest access
        let minFreq = Infinity, minOrder = Infinity, victimIdx = 0
        for (let i = 0; i < frames.length; i++) {
          const f = frames[i]!
          const ff = freq.get(f) || 0
          const fo = order.get(f) || 0
          if (ff < minFreq || (ff === minFreq && fo < minOrder)) {
            minFreq = ff
            minOrder = fo
            victimIdx = i
          }
        }
        evicted = frames[victimIdx]!
        frames[victimIdx] = page
        freq.delete(evicted)
        order.delete(evicted)
        freq.set(page, 1)
        order.set(page, tick)
        steps.push({ frames: [...frames], isHit: false, evicted, reason: `최소 빈도(${minFreq}회) ${evicted} 교체 → ${page} 적재` })
      }
    }
  }
  return { steps, faults, hits }
}

function simulateOptimal(pages: number[], frameCount: number): SimResult {
  const frames: (number | null)[] = Array(frameCount).fill(null)
  const steps: StepResult[] = []
  let faults = 0, hits = 0

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    if (frames.includes(page)) {
      hits++
      steps.push({ frames: [...frames], isHit: true, evicted: null, reason: `${page}이(가) 프레임에 존재 → 히트` })
    } else {
      faults++
      let evicted: number | null = null
      const emptyIdx = frames.indexOf(null)
      if (emptyIdx !== -1) {
        frames[emptyIdx] = page
        steps.push({ frames: [...frames], isHit: false, evicted: null, reason: `빈 프레임에 ${page} 적재` })
      } else {
        // Find page used farthest in the future
        let farthest = -1, victimIdx = 0
        for (let j = 0; j < frames.length; j++) {
          const nextUse = pages.indexOf(frames[j]!, i + 1)
          if (nextUse === -1) { victimIdx = j; farthest = Infinity; break }
          if (nextUse > farthest) { farthest = nextUse; victimIdx = j }
        }
        evicted = frames[victimIdx]!
        frames[victimIdx] = page
        const futureStr = farthest === Infinity ? '미래에 미사용' : `가장 나중에 사용(${farthest}번째)`
        steps.push({ frames: [...frames], isHit: false, evicted, reason: `${futureStr}인 ${evicted} 교체 → ${page} 적재` })
      }
    }
  }
  return { steps, faults, hits }
}

function simulate(algo: Algorithm, pages: number[], frameCount: number): SimResult {
  switch (algo) {
    case 'FIFO': return simulateFIFO(pages, frameCount)
    case 'LRU': return simulateLRU(pages, frameCount)
    case 'LFU': return simulateLFU(pages, frameCount)
    case 'Optimal': return simulateOptimal(pages, frameCount)
  }
}

const ALGO_NAMES: Record<Algorithm, string> = {
  FIFO: 'FIFO (선입선출)',
  LRU: 'LRU (최근 최소 사용)',
  LFU: 'LFU (최소 빈도 사용)',
  Optimal: 'Optimal (최적)',
}

const ALGO_COLORS: Record<Algorithm, string> = {
  FIFO: 'blue',
  LRU: 'purple',
  LFU: 'amber',
  Optimal: 'emerald',
}

// ── FrameTable Component ──
function FrameTable({ pages, result, currentStep, label, color }: {
  pages: number[]
  result: SimResult
  currentStep: number
  label: string
  color: string
}) {
  const tableRef = useRef<HTMLDivElement>(null)
  const frameCount = result.steps[0]?.frames.length || 0

  useEffect(() => {
    if (tableRef.current && currentStep >= 0) {
      const cell = tableRef.current.querySelector(`[data-step="${currentStep}"]`)
      cell?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentStep])

  const borderColor = color === 'blue' ? 'border-blue-400 dark:border-blue-600'
    : color === 'purple' ? 'border-purple-400 dark:border-purple-600'
    : color === 'amber' ? 'border-amber-400 dark:border-amber-600'
    : 'border-emerald-400 dark:border-emerald-600'

  const headerBg = color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
    : color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
    : color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'

  return (
    <div className="mb-6">
      <div className={`text-sm font-semibold mb-2 px-2 py-1 rounded inline-block ${headerBg}`}>
        {label} — 폴트: {result.faults} / 히트: {result.hits} ({((result.hits / pages.length) * 100).toFixed(1)}%)
      </div>
      <div ref={tableRef} className="overflow-x-auto">
        <table className={`border-collapse text-center text-xs sm:text-sm ${borderColor}`}>
          <thead>
            <tr>
              <th className="px-2 py-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky left-0 z-10 min-w-[60px]">참조</th>
              {pages.map((p, i) => (
                <th
                  key={i}
                  data-step={i}
                  className={`px-2 py-1 border border-gray-300 dark:border-gray-600 min-w-[36px] transition-colors ${
                    i === currentStep ? 'bg-sky-200 dark:bg-sky-800 font-bold ring-2 ring-sky-500' :
                    i < currentStep ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                  } text-gray-900 dark:text-white`}
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: frameCount }, (_, row) => (
              <tr key={row}>
                <td className="px-2 py-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono sticky left-0 z-10">
                  F{row}
                </td>
                {pages.map((_, col) => {
                  if (col > currentStep) {
                    return <td key={col} className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30" />
                  }
                  const step = result.steps[col]
                  const val = step.frames[row]
                  const isCurrentCol = col === currentStep
                  const wasEvicted = step.evicted !== null && col > 0 && result.steps[col - 1]?.frames[row] === step.evicted && step.frames[row] !== step.evicted

                  let cellBg = 'bg-white dark:bg-gray-800'
                  if (isCurrentCol && !step.isHit && step.frames[row] === pages[col]) {
                    cellBg = 'bg-red-100 dark:bg-red-900/30'
                  } else if (isCurrentCol && step.isHit && val === pages[col]) {
                    cellBg = 'bg-emerald-100 dark:bg-emerald-900/30'
                  }

                  return (
                    <td
                      key={col}
                      className={`px-2 py-1 border border-gray-200 dark:border-gray-600 font-mono transition-colors ${cellBg} ${
                        isCurrentCol ? 'ring-2 ring-sky-400 ring-inset' : ''
                      } ${wasEvicted ? 'line-through text-red-400' : 'text-gray-900 dark:text-white'}`}
                    >
                      {val !== null ? val : '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Hit/Fault row */}
            <tr>
              <td className="px-2 py-1 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold sticky left-0 z-10">
                결과
              </td>
              {pages.map((_, col) => {
                if (col > currentStep) {
                  return <td key={col} className="px-2 py-1 border border-gray-200 dark:border-gray-700" />
                }
                const step = result.steps[col]
                return (
                  <td
                    key={col}
                    className={`px-2 py-1 border border-gray-200 dark:border-gray-600 font-bold ${
                      step.isHit
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    } ${col === currentStep ? 'ring-2 ring-sky-400 ring-inset' : ''}`}
                  >
                    {step.isHit ? 'H' : 'F'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {/* Step explanation */}
      {currentStep >= 0 && currentStep < result.steps.length && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-1.5">
          Step {currentStep + 1}: {result.steps[currentStep].reason}
        </div>
      )}
    </div>
  )
}

// ── Main Component ──
export default function MemoryManagementVisualizer() {
  const [pageStr, setPageStr] = useState(PRESETS[0].pages)
  const [frameCount, setFrameCount] = useState(3)
  const [algorithm, setAlgorithm] = useState<Algorithm>('FIFO')
  const [compareMode, setCompareMode] = useState(false)
  const [results, setResults] = useState<Record<Algorithm, SimResult> | null>(null)
  const [currentStep, setCurrentStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(500)
  const [guideOpen, setGuideOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pagesRef = useRef<number[]>([])

  const parsePages = useCallback((str: string): number[] => {
    return str.trim().split(/[\s,;]+/).map(Number).filter(n => !isNaN(n))
  }, [])

  const runSimulation = useCallback(() => {
    const pages = parsePages(pageStr)
    if (pages.length === 0) return
    pagesRef.current = pages

    if (compareMode) {
      const r: Record<Algorithm, SimResult> = {
        FIFO: simulate('FIFO', pages, frameCount),
        LRU: simulate('LRU', pages, frameCount),
        LFU: simulate('LFU', pages, frameCount),
        Optimal: simulate('Optimal', pages, frameCount),
      }
      setResults(r)
    } else {
      setResults({ [algorithm]: simulate(algorithm, pages, frameCount) } as Record<Algorithm, SimResult>)
    }
    setCurrentStep(-1)
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [pageStr, frameCount, algorithm, compareMode, parsePages])

  // Animation
  useEffect(() => {
    if (!isPlaying || !results) return
    const pages = pagesRef.current
    if (currentStep >= pages.length - 1) {
      setIsPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep(prev => prev + 1)
    }, speed)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, results, speed])

  const handlePlay = () => {
    if (!results) {
      runSimulation()
      setTimeout(() => {
        setIsPlaying(true)
        setCurrentStep(0)
      }, 50)
      return
    }
    if (currentStep >= pagesRef.current.length - 1) {
      setCurrentStep(0)
    }
    setIsPlaying(true)
    if (currentStep < 0) setCurrentStep(0)
  }

  const handlePause = () => setIsPlaying(false)

  const handleStep = () => {
    if (!results) {
      runSimulation()
      setTimeout(() => setCurrentStep(0), 50)
      return
    }
    setIsPlaying(false)
    setCurrentStep(prev => Math.min(prev + 1, pagesRef.current.length - 1))
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const pages = parsePages(pageStr)
  const algosToShow: Algorithm[] = compareMode ? ['FIFO', 'LRU', 'LFU', 'Optimal'] : [algorithm]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">메모리 관리 시각화</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          페이지 교체 알고리즘(FIFO, LRU, LFU, Optimal)을 프레임 테이블로 시각화하고 비교합니다
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Page reference string */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">페이지 참조열 (공백/쉼표 구분)</label>
            <input
              type="text"
              value={pageStr}
              onChange={e => setPageStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1"
            />
          </div>

          {/* Frame count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">프레임 수</label>
            <select
              value={frameCount}
              onChange={e => setFrameCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}개</option>)}
            </select>
          </div>

          {/* Algorithm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">알고리즘</label>
            <select
              value={algorithm}
              onChange={e => { setAlgorithm(e.target.value as Algorithm); setCompareMode(false) }}
              disabled={compareMode}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {(['FIFO', 'LRU', 'LFU', 'Optimal'] as Algorithm[]).map(a => (
                <option key={a} value={a}>{ALGO_NAMES[a]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Presets */}
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">프리셋</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => { setPageStr(p.pages); setResults(null); setCurrentStep(-1) }}
                title={p.desc}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setCompareMode(false); runSimulation() }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors text-sm"
          >
            실행
          </button>
          <button
            onClick={() => { setCompareMode(true); setTimeout(runSimulation, 0) }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-emerald-700 hover:to-teal-700 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            4개 비교
          </button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Playback */}
          {isPlaying ? (
            <button onClick={handlePause} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="일시정지">
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handlePlay} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="재생">
              <Play className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleStep} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="한 단계">
            <SkipForward className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="초기화">
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed slider */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400">속도</span>
            <input
              type="range"
              min={100}
              max={1500}
              step={100}
              value={1600 - speed}
              onChange={e => setSpeed(1600 - Number(e.target.value))}
              className="w-20 accent-blue-600"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{speed}ms</span>
          </div>
        </div>

        {/* Step indicator */}
        {results && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step: {currentStep < 0 ? '대기' : `${currentStep + 1} / ${pages.length}`}
            </span>
            <input
              type="range"
              min={0}
              max={pages.length - 1}
              value={Math.max(0, currentStep)}
              onChange={e => { setIsPlaying(false); setCurrentStep(Number(e.target.value)) }}
              className="flex-1 accent-blue-600"
            />
          </div>
        )}
      </div>

      {/* Frame tables */}
      {results && (
        <div className={compareMode ? 'grid lg:grid-cols-2 gap-4' : ''}>
          {algosToShow.map(algo => {
            const r = results[algo]
            if (!r) return null
            return (
              <div key={algo} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-hidden">
                <FrameTable
                  pages={pages}
                  result={r}
                  currentStep={currentStep}
                  label={ALGO_NAMES[algo]}
                  color={ALGO_COLORS[algo]}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Comparison summary */}
      {results && compareMode && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            알고리즘 비교 요약
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">알고리즘</th>
                  <th className="text-center py-2 px-3 text-gray-600 dark:text-gray-400">페이지 폴트</th>
                  <th className="text-center py-2 px-3 text-gray-600 dark:text-gray-400">페이지 히트</th>
                  <th className="text-center py-2 px-3 text-gray-600 dark:text-gray-400">히트율</th>
                  <th className="py-2 px-3 text-gray-600 dark:text-gray-400 w-1/3">히트율 바</th>
                </tr>
              </thead>
              <tbody>
                {(['FIFO', 'LRU', 'LFU', 'Optimal'] as Algorithm[]).map(algo => {
                  const r = results[algo]
                  if (!r) return null
                  const hitRate = (r.hits / pages.length) * 100
                  const best = Math.min(...Object.values(results).map(v => v.faults))
                  const isBest = r.faults === best
                  return (
                    <tr key={algo} className={`border-b border-gray-100 dark:border-gray-700 ${isBest ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                        {ALGO_NAMES[algo]}
                        {isBest && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">최소 폴트</span>}
                      </td>
                      <td className="text-center py-2 px-3 text-red-600 dark:text-red-400 font-mono font-bold">{r.faults}</td>
                      <td className="text-center py-2 px-3 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{r.hits}</td>
                      <td className="text-center py-2 px-3 text-gray-900 dark:text-white font-mono">{hitRate.toFixed(1)}%</td>
                      <td className="py-2 px-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isBest ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${hitRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single algorithm stats */}
      {results && !compareMode && results[algorithm] && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">통계</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{pages.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">총 참조</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{results[algorithm].faults}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">페이지 폴트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results[algorithm].hits}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">페이지 히트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {((results[algorithm].hits / pages.length) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">히트율</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(results[algorithm].hits / pages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">가이드</span>
          </div>
          {guideOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {guideOpen && (
          <div className="px-5 pb-5 space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {/* Section 1 */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">페이지 교체란?</h3>
              <p>
                운영체제는 프로세스의 가상 주소 공간을 페이지 단위로 나누고, 물리 메모리(RAM)의 프레임에 매핑합니다.
                프로세스가 참조하는 페이지가 메모리에 없으면 <strong>페이지 폴트</strong>가 발생하고,
                디스크에서 해당 페이지를 읽어와야 합니다. 프레임이 모두 차 있으면 기존 페이지 중 하나를 내보내야(교체)
                하는데, 이때 어떤 페이지를 내보낼지 결정하는 것이 <strong>페이지 교체 알고리즘</strong>입니다.
                폴트 횟수를 최소화하는 것이 목표입니다.
              </p>
            </div>

            {/* Section 2: Algorithm comparison */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">알고리즘 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-left">알고리즘</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-left">교체 기준</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-left">장점</th>
                      <th className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 text-left">단점</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 font-medium">FIFO</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">가장 먼저 들어온 페이지</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">구현 간단 (큐)</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">Belady 모순 발생 가능</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 font-medium">LRU</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">가장 오래 전 사용된 페이지</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">시간 지역성 활용, 실용적</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">타임스탬프/스택 오버헤드</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 font-medium">LFU</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">사용 빈도 가장 낮은 페이지</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">빈도 지역성 활용</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">과거 빈도에 치우침, 초기 적응 느림</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5 font-medium">Optimal</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">미래에 가장 늦게 사용될 페이지</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">최소 폴트 보장 (이론적 하한)</td>
                      <td className="border border-gray-200 dark:border-gray-600 px-2 py-1.5">미래 예측 필요 → 실제 구현 불가</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Belady's Anomaly */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Belady의 모순 (Belady&apos;s Anomaly)</h3>
              <p className="mb-2">
                직관적으로 프레임 수를 늘리면 폴트가 줄어야 합니다. 하지만 <strong>FIFO</strong>에서는 프레임 수를 늘렸는데
                오히려 폴트가 <strong>증가</strong>하는 경우가 있습니다. 이를 Belady의 모순이라 합니다.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="font-mono text-xs mb-1">참조열: 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5</p>
                <p className="text-xs">
                  - 3프레임 FIFO: <strong className="text-red-600 dark:text-red-400">9회</strong> 폴트<br />
                  - 4프레임 FIFO: <strong className="text-red-600 dark:text-red-400">10회</strong> 폴트 (오히려 증가!)
                </p>
                <p className="text-xs mt-1.5">
                  LRU와 Optimal은 <strong>스택 알고리즘</strong>이므로 이 모순이 발생하지 않습니다.
                  위의 &quot;Belady&apos;s Anomaly&quot; 프리셋으로 직접 확인해 보세요!
                </p>
              </div>
            </div>

            {/* Section 4: FAQ */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">자주 묻는 질문</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q. 실제 운영체제에서는 어떤 알고리즘을 쓰나요?</p>
                  <p>대부분 LRU의 근사 알고리즘을 사용합니다. Linux는 Active/Inactive 리스트 기반의 이중 LRU를, Windows는 Working Set + Standby List를 사용합니다. 순수 LRU는 오버헤드가 커서 참조 비트(Clock 알고리즘)로 근사합니다.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q. Optimal 알고리즘은 왜 실제로 쓸 수 없나요?</p>
                  <p>미래에 어떤 페이지가 참조될지 미리 알아야 하기 때문입니다. 그러나 다른 알고리즘의 성능 상한(이론적 최적)으로 비교 기준에 활용됩니다.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Q. 히트율이 높을수록 좋은 건가요?</p>
                  <p>네. 히트율이 높으면 디스크 I/O가 줄어 프로세스 실행 속도가 빨라집니다. 일반적으로 90% 이상의 히트율이 기대되며, 참조의 지역성(locality)이 높을수록 히트율이 올라갑니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
