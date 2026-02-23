'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  BookOpen,
  Check,
  X,
} from 'lucide-react'

// ── Types ──

interface RecordingMeta {
  id: string
  name: string
  duration: number // seconds
  timestamp: number
  fileSize: number // bytes
}

interface Recording extends RecordingMeta {
  blobUrl: string
  blob: Blob
}

type RecordingState = 'idle' | 'recording' | 'paused'

// ── Helpers ──

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${h}:${min}`
}

// ── Component ──

export default function VoiceMemo() {
  const t = useTranslations('voiceMemo')

  // ── State ──
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [recordingCount, setRecordingCount] = useState(0)

  // ── Refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({})
  const playbackRafRef = useRef<number>(0)

  // ── Browser support check ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false)
    }
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      // Revoke blob URLs
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
    }
  }, [])

  // ── Waveform visualization ──
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!analyserRef.current) return
      rafRef.current = requestAnimationFrame(draw)

      analyserRef.current.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height
      const isDark = document.documentElement.classList.contains('dark')

      ctx.fillStyle = isDark ? '#1f2937' : '#f9fafb'
      ctx.fillRect(0, 0, w, h)

      const barCount = 64
      const step = Math.floor(bufferLength / barCount)
      const barWidth = (w / barCount) - 1
      const gradient = ctx.createLinearGradient(0, h, 0, 0)
      gradient.addColorStop(0, '#3b82f6')
      gradient.addColorStop(0.5, '#6366f1')
      gradient.addColorStop(1, '#ef4444')

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step]
        const barHeight = (value / 255) * h * 0.9
        const x = i * (barWidth + 1)
        ctx.fillStyle = gradient
        ctx.fillRect(x, h - barHeight, barWidth, barHeight)
      }
    }

    draw()
  }, [])

  // ── Timer management ──
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const now = Date.now()
      setElapsedTime(Math.floor((now - startTimeRef.current + pausedTimeRef.current) / 1000))
    }, 200)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Recording actions ──
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context for visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      analyserRef.current = analyser

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus'
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // let browser decide
          }
        }
      }

      const options: MediaRecorderOptions = {}
      if (mimeType) options.mimeType = mimeType

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const finalMime = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMime })
        const blobUrl = URL.createObjectURL(blob)
        const newCount = recordingCount + 1
        setRecordingCount(newCount)

        const newRecording: Recording = {
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: `${t('defaultName')} ${newCount}`,
          duration: elapsedTime,
          timestamp: Date.now(),
          fileSize: blob.size,
          blobUrl,
          blob,
        }

        setRecordings(prev => [newRecording, ...prev])
      }

      mediaRecorder.start(250) // collect data every 250ms
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setElapsedTime(0)
      setRecordingState('recording')
      startTimer()
      drawWaveform()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(t('micPermissionDenied'))
      } else {
        setError(t('micError'))
      }
    }
  }, [t, recordingCount, elapsedTime, startTimer, drawWaveform])

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.pause()
      stopTimer()
      pausedTimeRef.current += Date.now() - startTimeRef.current
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setRecordingState('paused')
    }
  }, [stopTimer])

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'paused') {
      recorder.resume()
      startTimeRef.current = Date.now()
      startTimer()
      drawWaveform()
      setRecordingState('recording')
    }
  }, [startTimer, drawWaveform])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      recorder.stop()
    }
    stopTimer()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setRecordingState('idle')
  }, [stopTimer])

  // ── Playback ──
  const togglePlayback = useCallback((rec: Recording) => {
    // If currently playing this recording, pause it
    if (playingId === rec.id) {
      const audio = audioElementsRef.current[rec.id]
      if (audio) {
        audio.pause()
      }
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current)
      setPlayingId(null)
      return
    }

    // Stop any other playing audio
    if (playingId) {
      const prevAudio = audioElementsRef.current[playingId]
      if (prevAudio) {
        prevAudio.pause()
        prevAudio.currentTime = 0
      }
    }
    if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current)

    // Play selected recording
    let audio = audioElementsRef.current[rec.id]
    if (!audio) {
      audio = new Audio(rec.blobUrl)
      audioElementsRef.current[rec.id] = audio
    }

    audio.onended = () => {
      setPlayingId(null)
      setPlaybackProgress(prev => ({ ...prev, [rec.id]: 0 }))
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current)
    }

    audio.play()
    setPlayingId(rec.id)

    // Update progress
    const updateProgress = () => {
      if (audio && !audio.paused && audio.duration) {
        setPlaybackProgress(prev => ({
          ...prev,
          [rec.id]: (audio.currentTime / audio.duration) * 100,
        }))
        playbackRafRef.current = requestAnimationFrame(updateProgress)
      }
    }
    updateProgress()
  }, [playingId])

  const seekPlayback = useCallback((rec: Recording, e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioElementsRef.current[rec.id]
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    audio.currentTime = percent * audio.duration
    setPlaybackProgress(prev => ({ ...prev, [rec.id]: percent * 100 }))
  }, [])

  // ── File operations ──
  const downloadRecording = useCallback((rec: Recording) => {
    const ext = rec.blob.type.includes('ogg') ? 'ogg' : 'webm'
    const a = document.createElement('a')
    a.href = rec.blobUrl
    a.download = `${rec.name}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const deleteRecording = useCallback((id: string) => {
    // Stop playback if playing
    if (playingId === id) {
      const audio = audioElementsRef.current[id]
      if (audio) {
        audio.pause()
        audio.src = ''
      }
      setPlayingId(null)
    }
    // Clean up
    const audio = audioElementsRef.current[id]
    if (audio) {
      audio.pause()
      audio.src = ''
      delete audioElementsRef.current[id]
    }
    setRecordings(prev => {
      const rec = prev.find(r => r.id === id)
      if (rec) URL.revokeObjectURL(rec.blobUrl)
      return prev.filter(r => r.id !== id)
    })
    setDeleteConfirmId(null)
  }, [playingId])

  // ── Rename ──
  const startRename = useCallback((rec: Recording) => {
    setEditingId(rec.id)
    setEditName(rec.name)
  }, [])

  const confirmRename = useCallback(() => {
    if (!editingId || !editName.trim()) return
    setRecordings(prev =>
      prev.map(r => (r.id === editingId ? { ...r, name: editName.trim() } : r))
    )
    setEditingId(null)
    setEditName('')
  }, [editingId, editName])

  const cancelRename = useCallback(() => {
    setEditingId(null)
    setEditName('')
  }, [])

  // ── Unsupported browser ──
  if (!isSupported) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mic className="w-6 h-6 text-red-500" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">{t('notSupported')}</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{t('notSupportedDesc')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Mic className="w-6 h-6 text-red-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Recording controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
        {/* Waveform canvas */}
        {recordingState !== 'idle' && (
          <div className="mb-6">
            <canvas
              ref={canvasRef}
              width={600}
              height={80}
              className="w-full h-20 rounded-lg bg-gray-50 dark:bg-gray-900"
            />
          </div>
        )}

        {/* Timer */}
        <div className="text-center mb-6">
          <p className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${
            recordingState === 'recording'
              ? 'text-red-600 dark:text-red-400'
              : recordingState === 'paused'
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
          }`}>
            {formatTime(elapsedTime)}
          </p>
          {recordingState !== 'idle' && (
            <p className={`text-sm font-medium mt-2 ${
              recordingState === 'recording'
                ? 'text-red-500 dark:text-red-400'
                : 'text-yellow-500 dark:text-yellow-400'
            }`}>
              {recordingState === 'recording' ? t('recording') : t('paused')}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          {recordingState === 'idle' ? (
            <button
              onClick={startRecording}
              className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800"
              aria-label={t('record')}
            >
              <Mic className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </button>
          ) : (
            <>
              {/* Pause / Resume */}
              {recordingState === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="w-14 h-14 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-800 flex items-center justify-center"
                  aria-label={t('pause')}
                >
                  <Pause className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 flex items-center justify-center"
                  aria-label={t('resume')}
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}

              {/* Record button (pulsing) */}
              <div className="relative">
                {recordingState === 'recording' && (
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                )}
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 flex items-center justify-center"
                  aria-label={t('stop')}
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              </div>

              {/* Spacer for symmetry */}
              <div className="w-14 h-14" />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Recordings list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('recordingName')} ({recordings.length})
        </h2>

        {recordings.length === 0 ? (
          <div className="text-center py-12">
            <MicOff className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500">{t('noRecordings')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map(rec => {
              const isPlaying = playingId === rec.id
              const progress = playbackProgress[rec.id] || 0
              const isEditing = editingId === rec.id
              const isDeleting = deleteConfirmId === rec.id

              return (
                <div
                  key={rec.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  {/* Top row: name + meta */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmRename()
                              if (e.key === 'Escape') cancelRename()
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                          <button
                            onClick={confirmRename}
                            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                            aria-label={t('rename')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelRename}
                            className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {rec.name}
                          </p>
                          <button
                            onClick={() => startRename(rec)}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded shrink-0"
                            aria-label={t('rename')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span>{formatTime(rec.duration)}</span>
                        <span>{formatFileSize(rec.fileSize)}</span>
                        <span>{formatTimestamp(rec.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-3 cursor-pointer"
                    onClick={e => seekPlayback(rec, e)}
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePlayback(rec)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        isPlaying
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          {t('pause')}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          {t('play')}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => downloadRecording(rec)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('download')}
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-red-600 dark:text-red-400">{t('deleteConfirm')}</span>
                        <button
                          onClick={() => deleteRecording(rec.id)}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rec.id)}
                        className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        aria-label={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Guide */}
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
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '\u2212' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.howto.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.howto.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.formats.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.formats.items') as string[]).map((item, i) => (
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

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">{t('disclaimer')}</p>
      </div>
    </div>
  )
}
