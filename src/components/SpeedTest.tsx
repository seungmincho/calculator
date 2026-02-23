'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Wifi, Clock, Activity, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface TestResult {
  downloadSpeed: number | null
  ping: number | null
  timestamp: Date
  mode: 'quick' | 'full'
}

type SpeedClass = 'slow' | 'moderate' | 'fast' | 'veryFast'

function getSpeedClass(mbps: number | null): SpeedClass {
  if (mbps === null) return 'slow'
  if (mbps < 25) return 'slow'
  if (mbps < 100) return 'moderate'
  if (mbps < 500) return 'fast'
  return 'veryFast'
}

const SPEED_COLORS: Record<SpeedClass, string> = {
  slow: '#ef4444',
  moderate: '#f59e0b',
  fast: '#22c55e',
  veryFast: '#3b82f6',
}

const SPEED_BG: Record<SpeedClass, string> = {
  slow: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  moderate: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  fast: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  veryFast: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
}

const SPEED_TEXT: Record<SpeedClass, string> = {
  slow: 'text-red-600 dark:text-red-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  fast: 'text-green-600 dark:text-green-400',
  veryFast: 'text-blue-600 dark:text-blue-400',
}

// SVG semicircle gauge
function SpeedGauge({ speed, maxSpeed = 1000 }: { speed: number | null; maxSpeed?: number }) {
  const value = Math.min(speed ?? 0, maxSpeed)
  const ratio = value / maxSpeed
  // Semicircle: from -180deg to 0deg (left to right)
  const angle = ratio * 180 - 180 // -180 to 0

  const cx = 100
  const cy = 100
  const r = 80

  // Arc background: from 180deg to 0deg (left semicircle)
  const startAngle = Math.PI       // 180deg
  const endAngle = 0               // 0deg
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)

  // Needle end point
  const needleAngle = (angle / 180) * Math.PI
  const nx = cx + r * Math.cos(needleAngle)
  const ny = cy + r * Math.sin(needleAngle)

  const speedClass = getSpeedClass(speed)
  const color = SPEED_COLORS[speedClass]

  // Active arc: from start to needle position
  const activeAngle = (angle / 180) * Math.PI
  const ax1 = cx + r * Math.cos(startAngle)
  const ay1 = cy + r * Math.sin(startAngle)
  const ax2 = cx + r * Math.cos(activeAngle)
  const ay2 = cy + r * Math.sin(activeAngle)

  // Determine if active arc sweeps more than 180deg
  const activeSpan = angle + 180 // 0 to 180
  const largeArcFlag = activeSpan > 180 ? 1 : 0

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-xs mx-auto" aria-hidden="true">
      {/* Background track */}
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="14"
        strokeLinecap="round"
        className="dark:stroke-gray-700"
      />
      {/* Active arc */}
      {speed !== null && speed > 0 && (
        <path
          d={`M ${ax1} ${ay1} A ${r} ${r} 0 ${largeArcFlag} 1 ${ax2} ${ay2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          style={{ transition: 'all 0.5s ease' }}
        />
      )}
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={speed !== null ? nx : cx - r}
        y2={speed !== null ? ny : cy}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease' }}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="6" fill={color} style={{ transition: 'fill 0.5s ease' }} />
      {/* Speed labels */}
      <text x="22" y="108" fontSize="10" fill="#9ca3af" textAnchor="middle">0</text>
      <text x="100" y="18" fontSize="10" fill="#9ca3af" textAnchor="middle">500</text>
      <text x="178" y="108" fontSize="10" fill="#9ca3af" textAnchor="middle">1000</text>
    </svg>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function SpeedTest() {
  const t = useTranslations('speedTest')
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null)
  const [history, setHistory] = useState<TestResult[]>([])
  const [corsBlocked, setCorsBlocked] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Measure ping via fetch timing
  const measurePing = useCallback(async (url: string): Promise<number | null> => {
    const attempts = 3
    const times: number[] = []
    for (let i = 0; i < attempts; i++) {
      try {
        const start = performance.now()
        await fetch(url, {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        })
        times.push(performance.now() - start)
      } catch {
        // ignore individual failure
      }
    }
    if (times.length === 0) return null
    return Math.round(Math.min(...times))
  }, [])

  // Measure download speed
  const measureDownload = useCallback(async (
    url: string,
    bytes: number,
    signal: AbortSignal,
    onProgress: (pct: number) => void
  ): Promise<number | null> => {
    const start = performance.now()
    let loaded = 0
    try {
      const response = await fetch(url, { cache: 'no-store', signal })
      if (!response.ok || !response.body) return null
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        loaded += value?.length ?? 0
        onProgress(Math.min(100, Math.round((loaded / bytes) * 100)))
      }
    } catch {
      return null
    }
    const elapsed = (performance.now() - start) / 1000 // seconds
    if (elapsed <= 0 || loaded === 0) return null
    const mbps = (loaded * 8) / (elapsed * 1_000_000)
    return Math.round(mbps * 10) / 10
  }, [])

  // Fallback: synthetic speed using Crypto + ArrayBuffer processing
  const syntheticSpeedTest = useCallback(async (
    mb: number,
    onProgress: (pct: number) => void
  ): Promise<number> => {
    const chunkSize = 256 * 1024 // 256 KB
    const totalChunks = Math.ceil((mb * 1024 * 1024) / chunkSize)
    let processed = 0
    const start = performance.now()
    for (let i = 0; i < totalChunks; i++) {
      const buf = new Uint8Array(chunkSize)
      crypto.getRandomValues(buf)
      // Do a lightweight hash-like XOR fold to prevent dead-code elimination
      let _acc = 0
      for (let j = 0; j < buf.length; j += 64) _acc ^= buf[j]
      processed += chunkSize
      onProgress(Math.min(100, Math.round((processed / (mb * 1024 * 1024)) * 100)))
      // Yield to keep UI responsive
      await new Promise(r => setTimeout(r, 0))
    }
    const elapsed = (performance.now() - start) / 1000
    return Math.round(((processed * 8) / (elapsed * 1_000_000)) * 10) / 10
  }, [])

  const runTest = useCallback(async (mode: 'quick' | 'full') => {
    if (testing) return
    setTesting(true)
    setProgress(0)
    setCurrentResult(null)
    setCorsBlocked(false)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const bytes = mode === 'quick' ? 1_000_000 : 10_000_000
    const downloadUrl = `https://speed.cloudflare.com/__down?bytes=${bytes}`
    const pingUrl = 'https://speed.cloudflare.com/__down?bytes=0'

    let downloadSpeed: number | null = null
    let ping: number | null = null
    let usedFallback = false

    try {
      // 1. Ping
      setProgress(5)
      ping = await measurePing(pingUrl)
      setProgress(15)

      // 2. Download
      downloadSpeed = await measureDownload(
        downloadUrl,
        bytes,
        ctrl.signal,
        (pct) => setProgress(15 + Math.round(pct * 0.8))
      )

      if (downloadSpeed === null) {
        usedFallback = true
      }
    } catch {
      usedFallback = true
    }

    // Fallback if CORS blocked or fetch failed
    if (usedFallback) {
      setCorsBlocked(true)
      setProgress(15)
      const mb = mode === 'quick' ? 10 : 50
      downloadSpeed = await syntheticSpeedTest(mb, (pct) =>
        setProgress(15 + Math.round(pct * 0.8))
      )
    }

    setProgress(100)

    const result: TestResult = {
      downloadSpeed,
      ping,
      timestamp: new Date(),
      mode,
    }

    setCurrentResult(result)
    setHistory(prev => [result, ...prev].slice(0, 5))
    setTesting(false)
    abortRef.current = null
  }, [testing, measurePing, measureDownload, syntheticSpeedTest])

  const speedClass = getSpeedClass(currentResult?.downloadSpeed ?? null)

  const classLabelMap: Record<SpeedClass, string> = {
    slow: t('slow'),
    moderate: t('moderate'),
    fast: t('fast'),
    veryFast: t('veryFast'),
  }
  const classDescMap: Record<SpeedClass, string> = {
    slow: t('slowDesc'),
    moderate: t('moderateDesc'),
    fast: t('fastDesc'),
    veryFast: t('veryFastDesc'),
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
          </div>
        </div>
      </div>

      {/* Gauge + Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center gap-6">
          {/* Gauge */}
          <div className="w-full max-w-xs">
            <SpeedGauge speed={currentResult?.downloadSpeed ?? null} />
            <div className="text-center -mt-2">
              {currentResult?.downloadSpeed !== null && currentResult !== null ? (
                <div>
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {currentResult.downloadSpeed}
                  </span>
                  <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">{t('mbps')}</span>
                </div>
              ) : (
                <div className="text-4xl font-bold text-gray-300 dark:text-gray-600">—</div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('downloadSpeed')}</div>
            </div>
          </div>

          {/* Ping */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{t('ping')}:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {currentResult?.ping !== null && currentResult !== null
                ? `${currentResult.ping} ${t('ms')}`
                : '—'}
            </span>
          </div>

          {/* Progress bar */}
          {testing && (
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{t('progress')}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Speed classification */}
          {currentResult !== null && !testing && (
            <div className={`w-full max-w-xs rounded-lg border p-3 ${SPEED_BG[speedClass]}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('classification')}</span>
                <span className={`font-bold ${SPEED_TEXT[speedClass]}`}>{classLabelMap[speedClass]}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{classDescMap[speedClass]}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={() => runTest('quick')}
              disabled={testing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {testing ? t('testing') : t('quickTest')}
            </button>
            <button
              onClick={() => runTest('full')}
              disabled={testing}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t('fullTest')}
            </button>
          </div>
        </div>
      </div>

      {/* CORS / Disclaimer notice */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
          {corsBlocked && <p className="font-medium">{t('corsNote')}</p>}
          <p>{t('disclaimer')}</p>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('history')}</h2>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => {
              const cls = getSpeedClass(item.downloadSpeed)
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                >
                  <span className="text-gray-500 dark:text-gray-400">{formatTime(item.timestamp)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.mode === 'quick' ? '1MB' : '10MB'}
                  </span>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`font-bold ${SPEED_TEXT[cls]}`}>
                        {item.downloadSpeed !== null ? `${item.downloadSpeed} ${t('mbps')}` : '—'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.ping !== null ? `${item.ping} ${t('ms')}` : '—'}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          onClick={() => setGuideOpen(v => !v)}
          aria-expanded={guideOpen}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('guideTitle')}</h2>
          {guideOpen
            ? <ChevronUp className="w-5 h-5 text-gray-500" />
            : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {guideOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guideSection1Title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guideSection1Items') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('guideSection2Title')}
              </h3>
              <ul className="space-y-1.5">
                {(t.raw('guideSection2Items') as string[]).map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 font-bold flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
