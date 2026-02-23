'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Mic, MicOff, BookOpen, AlertCircle, Smartphone, RotateCcw } from 'lucide-react'

// ── 소음 수준 기준 (dB) ──
interface NoiseLevel {
  min: number
  max: number
  labelKey: string
  color: string
  bgColor: string
  examples: string
}

const NOISE_LEVELS: NoiseLevel[] = [
  { min: 0, max: 30, labelKey: 'levels.veryQuiet', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500', examples: 'levels.veryQuietEx' },
  { min: 30, max: 50, labelKey: 'levels.quiet', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-400', examples: 'levels.quietEx' },
  { min: 50, max: 60, labelKey: 'levels.moderate', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-400', examples: 'levels.moderateEx' },
  { min: 60, max: 70, labelKey: 'levels.loud', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-400', examples: 'levels.loudEx' },
  { min: 70, max: 85, labelKey: 'levels.veryLoud', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500', examples: 'levels.veryLoudEx' },
  { min: 85, max: 100, labelKey: 'levels.harmful', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500', examples: 'levels.harmfulEx' },
  { min: 100, max: 200, labelKey: 'levels.dangerous', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-700', examples: 'levels.dangerousEx' },
]

function getNoiseLevel(db: number): NoiseLevel {
  for (const level of NOISE_LEVELS) {
    if (db < level.max) return level
  }
  return NOISE_LEVELS[NOISE_LEVELS.length - 1]
}

export default function NoiseMeter() {
  const t = useTranslations('noiseMeter')
  const [isRecording, setIsRecording] = useState(false)
  const [currentDb, setCurrentDb] = useState(0)
  const [maxDb, setMaxDb] = useState(0)
  const [minDb, setMinDb] = useState(999)
  const [avgDb, setAvgDb] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [history, setHistory] = useState<number[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const samplesRef = useRef<number[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.3
      source.connect(analyser)
      analyserRef.current = analyser

      setIsRecording(true)
      setMaxDb(0)
      setMinDb(999)
      setAvgDb(0)
      samplesRef.current = []
      setHistory([])

      const dataArray = new Float32Array(analyser.fftSize)

      const measure = () => {
        if (!analyserRef.current) return

        analyserRef.current.getFloatTimeDomainData(dataArray)

        // RMS (Root Mean Square) 계산
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)

        // dB 변환 (보정값 포함 - 마이크마다 다를 수 있음)
        // 참조: 표준 마이크 기준 약 -30dBFS → ~60dB SPL
        const dbFS = rms > 0 ? 20 * Math.log10(rms) : -100
        const dbSPL = Math.max(0, Math.min(130, dbFS + 94)) // rough calibration offset

        setCurrentDb(Math.round(dbSPL))
        samplesRef.current.push(dbSPL)

        // 통계 업데이트 (매 10 샘플마다)
        if (samplesRef.current.length % 10 === 0) {
          const samples = samplesRef.current
          const max = Math.max(...samples)
          const min = Math.min(...samples.filter(s => s > 0))
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length

          setMaxDb(Math.round(max))
          setMinDb(Math.round(min > 900 ? 0 : min))
          setAvgDb(Math.round(avg))

          // 히스토리 (최근 60개 = 약 60초)
          setHistory(prev => {
            const next = [...prev, Math.round(dbSPL)]
            return next.length > 60 ? next.slice(-60) : next
          })
        }

        rafRef.current = requestAnimationFrame(measure)
      }

      measure()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(t('micPermissionDenied'))
      } else {
        setError(t('micError'))
      }
    }
  }, [t])

  const stopRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())

    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    setIsRecording(false)
  }, [])

  const resetStats = useCallback(() => {
    setMaxDb(0)
    setMinDb(999)
    setAvgDb(0)
    samplesRef.current = []
    setHistory([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    }
  }, [])

  const level = getNoiseLevel(currentDb)
  const gaugePercent = Math.min((currentDb / 130) * 100, 100)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('title')}
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full">
            <Smartphone className="w-3 h-3" />
            {t('mobileFriendly')}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 메인 측정 영역 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* dB 디스플레이 */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <p className={`text-8xl sm:text-9xl font-bold tabular-nums ${isRecording ? level.color : 'text-gray-300 dark:text-gray-600'}`}>
              {isRecording ? currentDb : '--'}
            </p>
            <p className="text-xl text-gray-500 dark:text-gray-400 -mt-2">dB</p>
          </div>
          {isRecording && (
            <p className={`text-sm font-medium mt-2 ${level.color}`}>{t(level.labelKey)}</p>
          )}
        </div>

        {/* 게이지 바 */}
        <div className="mb-6">
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className="h-full transition-all duration-150 ease-out rounded-full"
              style={{
                width: `${isRecording ? gaugePercent : 0}%`,
                background: `linear-gradient(90deg, #22c55e 0%, #eab308 40%, #f97316 60%, #ef4444 80%, #b91c1c 100%)`,
              }}
            />
            {/* 스케일 마커 */}
            {[30, 50, 70, 85, 100].map(mark => (
              <div
                key={mark}
                className="absolute top-0 h-full w-px bg-gray-300 dark:bg-gray-600"
                style={{ left: `${(mark / 130) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
            <span>0</span>
            <span>30</span>
            <span>50</span>
            <span>70</span>
            <span>85</span>
            <span>100</span>
            <span>130</span>
          </div>
        </div>

        {/* 시작/정지 버튼 */}
        <div className="flex justify-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium text-lg transition-colors shadow-lg"
            >
              <Mic className="w-5 h-5" />
              {t('start')}
            </button>
          ) : (
            <>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-lg transition-colors shadow-lg"
              >
                <MicOff className="w-5 h-5" />
                {t('stop')}
              </button>
              <button
                onClick={resetStats}
                className="flex items-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                aria-label={t('reset')}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      {isRecording && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('maxDb')}</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{maxDb}</p>
            <p className="text-xs text-gray-400">dB</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('avgDb')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgDb}</p>
            <p className="text-xs text-gray-400">dB</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('minDb')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{minDb > 900 ? 0 : minDb}</p>
            <p className="text-xs text-gray-400">dB</p>
          </div>
        </div>
      )}

      {/* 히스토리 그래프 (CSS only) */}
      {history.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('historyGraph')}</h3>
          <div className="flex items-end gap-px h-24">
            {history.map((db, i) => {
              const height = Math.max(2, (db / 130) * 100)
              const lvl = getNoiseLevel(db)
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${lvl.bgColor} transition-all duration-75`}
                  style={{ height: `${height}%` }}
                  title={`${db} dB`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{t('historyOld')}</span>
            <span>{t('historyNew')}</span>
          </div>
        </div>
      )}

      {/* 소음 수준 참고표 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('referenceTable')}</h3>
        <div className="space-y-2">
          {NOISE_LEVELS.map((lvl, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-2 px-3 rounded-lg ${isRecording && currentDb >= lvl.min && currentDb < lvl.max ? 'bg-gray-50 dark:bg-gray-700/50 ring-1 ring-blue-300 dark:ring-blue-600' : ''}`}
            >
              <div className={`w-3 h-3 rounded-full ${lvl.bgColor} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${lvl.color}`}>{t(lvl.labelKey)}</span>
                  <span className="text-xs text-gray-400 ml-2">{lvl.min}-{lvl.max === 200 ? '130+' : lvl.max} dB</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t(lvl.examples)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.how.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.how.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tips.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 주의사항 */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
