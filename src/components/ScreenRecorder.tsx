'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Monitor,
  Video,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Settings,
} from 'lucide-react'

// ── Types ──

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'
type Quality = 'high' | 'medium' | 'low'
type AudioOption = 'system' | 'mic' | 'both' | 'none'

interface RecordingConfig {
  quality: Quality
  fps: 30 | 60
  audio: AudioOption
}

const QUALITY_MAP: Record<Quality, { width: number; height: number; bitrate: number }> = {
  high: { width: 1920, height: 1080, bitrate: 8_000_000 },
  medium: { width: 1280, height: 720, bitrate: 4_000_000 },
  low: { width: 854, height: 480, bitrate: 1_500_000 },
}

// ── Helpers ──

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return 'video/webm'
}

// ── Component ──

export default function ScreenRecorder() {
  const t = useTranslations('screenRecorder')

  // ── State ──
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [config, setConfig] = useState<RecordingConfig>({
    quality: 'high',
    fps: 30,
    audio: 'none',
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)

  // ── Refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // ── Browser support check ──
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function'
    ) {
      setIsSupported(false)
    }
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopAllStreams()
      clearTimer()
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Timer ──
  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
  }, [])

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // ── Stream cleanup ──
  function stopAllStreams() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
  }

  // ── Merge audio streams via AudioContext ──
  function mergeAudioStreams(
    displayStream: MediaStream,
    micStream: MediaStream
  ): MediaStream {
    const ctx = new AudioContext()
    const dest = ctx.createMediaStreamDestination()

    const displayAudioTracks = displayStream.getAudioTracks()
    if (displayAudioTracks.length > 0) {
      const displaySource = ctx.createMediaStreamSource(
        new MediaStream(displayAudioTracks)
      )
      displaySource.connect(dest)
    }

    const micSource = ctx.createMediaStreamSource(micStream)
    micSource.connect(dest)

    const combinedStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])

    return combinedStream
  }

  // ── Start recording ──
  const startRecording = useCallback(async () => {
    setError(null)
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl(null)
    }

    const q = QUALITY_MAP[config.quality]
    const includeSystemAudio = config.audio === 'system' || config.audio === 'both'
    const includeMic = config.audio === 'mic' || config.audio === 'both'

    try {
      // Request display media
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: config.fps,
          width: { ideal: q.width },
          height: { ideal: q.height },
        },
        audio: includeSystemAudio,
      })

      streamRef.current = displayStream

      let finalStream = displayStream

      // Optionally add microphone
      if (includeMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          })
          micStreamRef.current = micStream
          finalStream = mergeAudioStreams(displayStream, micStream)
        } catch {
          // Mic unavailable, continue with display stream only
        }
      }

      // Listen for user stopping share via browser UI
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecording()
      })

      // Create MediaRecorder
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: q.bitrate,
      })

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setRecordedUrl(url)
        setFileSize(blob.size)
        setRecordingState('stopped')
        clearTimer()
        stopAllStreams()
      }

      recorder.onerror = () => {
        setError(t('recordingError'))
        setRecordingState('idle')
        clearTimer()
        stopAllStreams()
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // collect data every second
      setElapsedSeconds(0)
      setRecordingState('recording')
      startTimer()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(t('permissionDenied'))
      } else {
        setError(t('recordingError'))
      }
      stopAllStreams()
    }
  }, [config, recordedUrl, startTimer, t])

  // ── Pause / Resume ──
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      clearTimer()
    }
  }, [recordingState])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      startTimer()
    }
  }, [recordingState, startTimer])

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    clearTimer()
  }, [])

  // ── Download ──
  const downloadRecording = useCallback(() => {
    if (!recordedUrl) return
    const a = document.createElement('a')
    a.href = recordedUrl
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `screen-recording-${timestamp}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [recordedUrl])

  // ── New recording ──
  const newRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl(null)
    setFileSize(0)
    setElapsedSeconds(0)
    setError(null)
    setRecordingState('idle')
    chunksRef.current = []
  }, [recordedUrl])

  // ── Not supported ──
  if (!isSupported) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('notSupported')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{t('notSupportedDesc')}</p>
        </div>
      </div>
    )
  }

  const isIdle = recordingState === 'idle'
  const isRecording = recordingState === 'recording'
  const isPaused = recordingState === 'paused'
  const isStopped = recordingState === 'stopped'
  const isActive = isRecording || isPaused

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              {t('permissionDeniedDesc')}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('settings')}
            </h2>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('quality')}
              </label>
              <select
                value={config.quality}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, quality: e.target.value as Quality }))
                }
                disabled={isActive}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="high">{t('qualityHigh')} (1080p)</option>
                <option value="medium">{t('qualityMedium')} (720p)</option>
                <option value="low">{t('qualityLow')} (480p)</option>
              </select>
            </div>

            {/* Frame rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('frameRate')}
              </label>
              <select
                value={config.fps}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    fps: Number(e.target.value) as 30 | 60,
                  }))
                }
                disabled={isActive}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value={30}>{t('fps30')}</option>
                <option value={60}>{t('fps60')}</option>
              </select>
            </div>

            {/* Audio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  {config.audio !== 'none' ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                  {t('audio')}
                </span>
              </label>
              <select
                value={config.audio}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    audio: e.target.value as AudioOption,
                  }))
                }
                disabled={isActive}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="none">{t('audioNone')}</option>
                <option value="system">{t('audioSystem')}</option>
                <option value="mic">{t('audioMic')}</option>
                <option value="both">{t('audioBoth')}</option>
              </select>
            </div>

            {/* Status info while recording */}
            {isActive && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {QUALITY_MAP[config.quality].width}x{QUALITY_MAP[config.quality].height} @ {config.fps}fps
                  </span>
                </div>
                {config.audio !== 'none' && (
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {config.audio === 'system' && t('audioSystem')}
                      {config.audio === 'mic' && t('audioMic')}
                      {config.audio === 'both' && t('audioBoth')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Idle state */}
            {isIdle && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Video className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('readyToRecord')}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
                    {t('readyToRecordDesc')}
                  </p>
                </div>
                <button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 group"
                  aria-label={t('startRecording')}
                >
                  <div className="w-8 h-8 bg-white rounded-sm group-hover:scale-90 transition-transform" />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('startRecording')}
                </span>
              </div>
            )}

            {/* Recording / Paused state */}
            {isActive && (
              <div className="flex flex-col items-center justify-center py-12 space-y-8">
                {/* Status indicator */}
                <div className="flex items-center gap-3">
                  {isRecording && (
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
                    </span>
                  )}
                  {isPaused && (
                    <span className="relative flex h-4 w-4">
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500" />
                    </span>
                  )}
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isRecording ? t('recording') : t('paused')}
                  </span>
                </div>

                {/* Timer */}
                <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                  {formatTime(elapsedSeconds)}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                  {/* Pause / Resume */}
                  {isRecording ? (
                    <button
                      onClick={pauseRecording}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
                      aria-label={t('pauseRecording')}
                      title={t('pauseRecording')}
                    >
                      <Pause className="w-7 h-7" />
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
                      aria-label={t('resumeRecording')}
                      title={t('resumeRecording')}
                    >
                      <Play className="w-7 h-7" />
                    </button>
                  )}

                  {/* Stop */}
                  <button
                    onClick={stopRecording}
                    className="bg-gray-600 hover:bg-gray-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
                    aria-label={t('stopRecording')}
                    title={t('stopRecording')}
                  >
                    <Square className="w-7 h-7" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isRecording ? t('pauseRecording') : t('resumeRecording')} | {t('stopRecording')}
                </p>
              </div>
            )}

            {/* Stopped state — preview */}
            {isStopped && recordedUrl && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    {t('preview')}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('fileSize')}: {formatFileSize(fileSize)}
                  </span>
                </div>

                {/* Video player */}
                <div className="rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    src={recordedUrl}
                    controls
                    className="w-full max-h-[480px] object-contain"
                  />
                </div>

                {/* Duration & info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span>{t('recordingTime')}: {formatTime(elapsedSeconds)}</span>
                  <span>WebM (VP9)</span>
                  <span>{QUALITY_MAP[config.quality].width}x{QUALITY_MAP[config.quality].height}</span>
                  <span>{config.fps}fps</span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadRecording}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {t('download')}
                  </button>
                  <button
                    onClick={newRecording}
                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-6 py-3 font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    {t('newRecording')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={guideOpen}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 dark:text-gray-500 text-xl">
            {guideOpen ? '−' : '+'}
          </span>
        </button>

        {guideOpen && (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {/* How to use */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-500" />
                {t('guide.howto.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.howto.items') as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Formats */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-green-500" />
                {t('guide.formats.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.formats.items') as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-green-500 mt-1">&#8226;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                {t('guide.tips.title')}
              </h3>
              <ul className="space-y-2">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-1">&#8226;</span>
                    {item}
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
