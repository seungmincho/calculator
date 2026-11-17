'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/voiceMemo'
import { glassCard, glassInset } from '@/lib/glass'
import { deleteVoiceMemo, listVoiceMemos, saveVoiceMemo, type VoiceMemoRecord } from '@/lib/voiceMemoStorage'
import { SpeakingAIClient, type SpeakingProgress } from '@/lib/speaking/client'
import { decodeSpeakingAudio, downloadSpeakingFile } from '@/lib/speaking/audio'
import { openMeetingHandoff } from '@/utils/meetingHandoff'
import VoiceMemoTranscriptExport from '@/components/VoiceMemoTranscriptExport'
import { VOICE_TRANSCRIPT_EXPORT_LIMIT } from '@/utils/voiceMemoExport'
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
  Check,
  X,
} from 'lucide-react'

// ── Types ──

interface Recording extends VoiceMemoRecord {
  blobUrl: string
  saved: boolean
  persisted: boolean
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
  const [requesting, setRequesting] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [progress, setProgress] = useState<SpeakingProgress | { stage: 'decoding'; progress?: number } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [handoffError, setHandoffError] = useState<{ id: string; key: string } | null>(null)
  const [transcriptExportIds, setTranscriptExportIds] = useState<string[]>([])
  const busy = recordingState !== 'idle' || requesting || !!workingId || !!savingId
  const visibleRecordings = recordings.filter(rec => `${rec.name}\n${rec.transcript}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))

  // ── Refs ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const clockRunning = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({})
  const playbackRafRef = useRef<number>(0)
  const alive = useRef(true)
  const requestToken = useRef(0)
  const job = useRef(0)
  const ai = useRef<SpeakingAIClient | null>(null)
  const currentRecordings = useRef(recordings)
  currentRecordings.current = recordings

  // ── Browser support check ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setIsSupported(false)
    }
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    alive.current = true
    let active = true
    const requests = requestToken, jobs = job, audioElements = audioElementsRef.current
    void listVoiceMemos().then(records => {
      if (!active) return
      setRecordings(records.map(rec => ({ ...rec, blobUrl: URL.createObjectURL(rec.blob), saved: true, persisted: true })))
      setRecordingCount(records.length)
    }).catch(() => { if (active) setError(t('enhance.storageFailed')) })
      .finally(() => { if (active) setLoadingHistory(false) })
    return () => {
      active = false
      alive.current = false
      requests.current++
      jobs.current++
      ai.current?.cancel()
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
      }
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
      Object.values(audioElements).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      currentRecordings.current.forEach(rec => URL.revokeObjectURL(rec.blobUrl))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!recordings.some(rec => !rec.saved) && recordingState === 'idle') return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [recordings, recordingState])

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
      ctx.clearRect(0, 0, w, h)

      const barCount = 64
      const step = Math.floor(bufferLength / barCount)
      const barWidth = (w / barCount) - 1
      const color = getComputedStyle(canvas).color

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step]
        const barHeight = (value / 255) * h * 0.9
        const x = i * (barWidth + 1)
        ctx.fillStyle = color
        ctx.fillRect(x, h - barHeight, barWidth, barHeight)
      }
    }

    draw()
  }, [])

  useEffect(() => {
    if (recordingState !== 'recording') return
    drawWaveform()
    return () => cancelAnimationFrame(rafRef.current)
  }, [recordingState, drawWaveform])

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
    if (busy || loadingHistory || !isSupported) return
    const request = ++requestToken.current
    setRequesting(true)
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!alive.current || request !== requestToken.current) { stream.getTracks().forEach(track => track.stop()); return }
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
        mimeType = 'audio/mp4'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus'
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
        if (!alive.current) return
        if (clockRunning.current) pausedTimeRef.current += Date.now() - startTimeRef.current
        clockRunning.current = false
        stopTimer()
        cancelAnimationFrame(rafRef.current)
        void audioContextRef.current?.close().catch(() => {})
        audioContextRef.current = null
        analyserRef.current = null
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setElapsedTime(Math.floor(pausedTimeRef.current / 1000))
        setRecordingState('idle')
        const finalMime = mediaRecorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMime })
        if (!blob.size) { setError(t('micError')); return }
        const blobUrl = URL.createObjectURL(blob)
        const newCount = recordingCount + 1
        setRecordingCount(newCount)

        const newRecording: Recording = {
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: `${t('defaultName')} ${newCount}`,
          duration: pausedTimeRef.current / 1000,
          timestamp: Date.now(),
          fileSize: blob.size,
          blobUrl,
          blob,
          transcript: '', saved: false, persisted: false,
        }

        setRecordings(prev => [newRecording, ...prev])
      }

      mediaRecorder.start(250) // collect data every 250ms
      startTimeRef.current = Date.now()
      clockRunning.current = true
      pausedTimeRef.current = 0
      setElapsedTime(0)
      setRecordingState('recording')
      startTimer()
    } catch (err) {
      streamRef.current?.getTracks().forEach(track => track.stop())
      void audioContextRef.current?.close().catch(() => {})
      if (!alive.current || request !== requestToken.current) return
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(t('micPermissionDenied'))
      } else {
        setError(t('micError'))
      }
    } finally { if (alive.current && request === requestToken.current) setRequesting(false) }
  }, [t, recordingCount, startTimer, stopTimer, busy, loadingHistory, isSupported])

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.pause()
      stopTimer()
      pausedTimeRef.current += Date.now() - startTimeRef.current
      clockRunning.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setRecordingState('paused')
    }
  }, [stopTimer])

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'paused') {
      recorder.resume()
      startTimeRef.current = Date.now()
      clockRunning.current = true
      startTimer()
      setRecordingState('recording')
    }
  }, [startTimer])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      if (recorder.state === 'recording') pausedTimeRef.current += Date.now() - startTimeRef.current
      clockRunning.current = false
      setElapsedTime(Math.floor(pausedTimeRef.current / 1000))
      recorder.stop()
    }
  }, [])

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

    void audio.play().catch(() => { setPlayingId(null); setError(t('enhance.playFailed')) })
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
  }, [playingId, t])

  /** ratio: 0~1. 마우스 클릭 위치 또는 키보드 화살표(±5%) */
  const seekPlayback = useCallback((rec: Recording, ratio: number) => {
    const audio = audioElementsRef.current[rec.id]
    if (!audio || !audio.duration) return
    const percent = Math.min(1, Math.max(0, ratio))
    audio.currentTime = percent * audio.duration
    setPlaybackProgress(prev => ({ ...prev, [rec.id]: percent * 100 }))
  }, [])

  // ── File operations ──
  const downloadRecording = useCallback((rec: Recording) => {
    const ext = /mp4|m4a/.test(rec.blob.type) ? 'm4a' : rec.blob.type.includes('wav') ? 'wav' : /mpeg|mp3/.test(rec.blob.type) ? 'mp3' : rec.blob.type.includes('ogg') ? 'ogg' : 'webm'
    const a = document.createElement('a')
    a.href = rec.blobUrl
    a.download = `${rec.name}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const deleteRecording = useCallback(async (id: string) => {
    try { if (currentRecordings.current.find(rec => rec.id === id)?.persisted) await deleteVoiceMemo(id) }
    catch { setError(t('enhance.storageFailed')); return }
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
  }, [playingId, t])

  // ── Rename ──
  const startRename = useCallback((rec: Recording) => {
    setEditingId(rec.id)
    setEditName(rec.name)
  }, [])

  const confirmRename = useCallback(() => {
    if (!editingId || !editName.trim()) return
    setRecordings(prev =>
      prev.map(r => (r.id === editingId ? { ...r, name: editName.trim().slice(0, 120), saved: false } : r))
    )
    setEditingId(null)
    setEditName('')
  }, [editingId, editName])

  const cancelRename = useCallback(() => {
    setEditingId(null)
    setEditName('')
  }, [])

  const saveRecording = async (rec: Recording) => {
    if (busy) return
    setSavingId(rec.id); setError(null)
    try {
      await saveVoiceMemo({ id: rec.id, name: rec.name, blob: rec.blob, duration: rec.duration, timestamp: rec.timestamp, fileSize: rec.fileSize, transcript: rec.transcript })
      if (alive.current) setRecordings(prev => prev.map(item => item.id === rec.id ? { ...item, saved: true, persisted: true } : item))
    } catch (cause) { if (alive.current) setError(t(cause instanceof Error && cause.message === 'storageFull' ? 'enhance.storageFull' : 'enhance.storageFailed')) }
    finally { if (alive.current) setSavingId(null) }
  }

  const transcribeRecording = async (rec: Recording) => {
    if (busy) return
    const task = ++job.current
    setWorkingId(rec.id); setError(null); setProgress({ stage: 'decoding' })
    try {
      const { audio } = await decodeSpeakingAudio(rec.blob, { maxSeconds: 180 })
      if (task !== job.current) return
      if (audio.reduce((sum, value) => sum + value * value, 0) / audio.length < 1e-7) throw new Error('noSpeech')
      ai.current ??= new SpeakingAIClient()
      const transcript = await ai.current.transcribe(audio, next => { if (task === job.current) setProgress(next) })
      if (task !== job.current) return
      if (!transcript.trim()) throw new Error('noSpeech')
      setRecordings(prev => prev.map(item => item.id === rec.id ? { ...item, transcript: transcript.slice(0, 12000), saved: false } : item))
      setExpandedId(rec.id)
    } catch (cause) {
      if (task === job.current) setError(t(cause instanceof Error && ['audioTooLong', 'fileTooLarge', 'noSpeech'].includes(cause.message) ? `enhance.${cause.message}` : 'enhance.transcribeFailed'))
    } finally { if (task === job.current) { setWorkingId(null); setProgress(null) } }
  }

  const importRecording = async (file?: File) => {
    if (!file || busy || loadingHistory) return
    setWorkingId('import'); setProgress({ stage: 'decoding' }); setError(null)
    const task = ++job.current
    try {
      const { seconds } = await decodeSpeakingAudio(file, { maxSeconds: 180 })
      if (task !== job.current) return
      const id = crypto.randomUUID()
      setRecordings(prev => [{ id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 120) || t('defaultName'), duration: seconds, timestamp: Date.now(), fileSize: file.size, blob: file, blobUrl: URL.createObjectURL(file), transcript: '', saved: false, persisted: false }, ...prev])
      setExpandedId(id); setSearch('')
    } catch (cause) { if (task === job.current) setError(t(cause instanceof Error && ['audioTooLong', 'fileTooLarge'].includes(cause.message) ? `enhance.${cause.message}` : 'enhance.importFailed')) }
    finally { if (task === job.current) { setWorkingId(null); setProgress(null) } }
  }

  const cancelProcessing = () => { job.current++; ai.current?.cancel(); setWorkingId(null); setProgress(null) }
  const exportTranscript = (rec: Recording) => downloadSpeakingFile(new Blob(['\uFEFF' + rec.name + '\n\n' + rec.transcript], { type: 'text/plain;charset=utf-8' }), `${rec.name}.txt`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          {t('title')}
        </h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
        <p className="text-xs text-sub mt-2">{t('enhance.privacy')}</p>
      </div>

      {(error || progress) && <div className="sticky top-16 z-20 ui-card p-4 space-y-3">
        {error && <p role="alert" className="text-sm text-body">{error}</p>}
        {progress && <><p role="status" className="text-sm text-body">{t(`enhance.stages.${progress.stage}`)}</p><progress aria-label={t('enhance.progress')} max={1} value={progress.progress} className="w-full accent-primary" /><button onClick={cancelProcessing} className="ui-btn-soft min-h-11 px-4 py-2">{t('enhance.cancel')}</button></>}
      </div>}

      {/* Recording controls */}
      <div className={`${glassCard} ${glassInset} p-6 sm:p-8`}>
        {/* Waveform canvas */}
        {recordingState !== 'idle' && (
          <div className="mb-6">
            <canvas
              ref={canvasRef}
              width={600}
              height={80}
              className="w-full h-20 rounded-lg bg-subtle text-primary"
            />
          </div>
        )}

        {/* Timer */}
        <div className="text-center mb-6">
          <p className={`text-5xl sm:text-6xl font-mono font-bold tabular-nums ${
            recordingState === 'recording'
              ? 'text-primary'
              : recordingState === 'paused'
                ? 'text-sub'
                : 'text-fg'
          }`}>
            {formatTime(elapsedTime)}
          </p>
          {recordingState !== 'idle' && (
            <p className={`text-sm font-medium mt-2 ${
              recordingState === 'recording'
                ? 'text-primary'
                : 'text-sub'
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
              disabled={busy || loadingHistory || !isSupported}
              className="relative w-20 h-20 rounded-full bg-primary text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
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
                  className="w-14 h-14 rounded-full bg-soft text-body focus-visible:outline-2 focus-visible:outline-primary flex items-center justify-center"
                  aria-label={t('pause')}
                >
                  <Pause className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="w-14 h-14 rounded-full bg-primary text-white focus-visible:outline-2 focus-visible:outline-primary flex items-center justify-center"
                  aria-label={t('resume')}
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}

              {/* Record button (pulsing) */}
              <div className="relative">
                {recordingState === 'recording' && (
                  <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping opacity-30" />
                )}
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-primary text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary flex items-center justify-center"
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
        {recordingState === 'idle' && <p className="text-center text-sm text-sub mt-3">{t(requesting ? 'enhance.requesting' : 'record')}</p>}
        {requesting && <button onClick={() => { requestToken.current++; setRequesting(false) }} className="ui-btn-soft min-h-11 px-4 py-2 mt-2">{t('enhance.cancel')}</button>}
        {!isSupported && <p className="text-sm text-sub mt-3">{t('notSupportedDesc')}</p>}
        <label className={`ui-btn-soft inline-flex items-center min-h-11 px-4 py-2 mt-4 cursor-pointer ${busy || loadingHistory ? 'opacity-40' : ''}`}>
          {t('enhance.import')}<input type="file" accept="audio/*" aria-label={t('enhance.import')} disabled={busy || loadingHistory} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importRecording(file) }} />
        </label>
        <p className="text-xs text-muted mt-2">{t('enhance.downloadHint')}</p>
      </div>

      {/* Recordings list */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-lg font-semibold text-fg mb-4">
          {t('recordingName')} ({recordings.length})
        </h2>
        <label htmlFor="voice-memo-search" className="block text-sm text-body mb-2">{t('enhance.search')}</label>
        <input id="voice-memo-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('enhance.searchHint')} className="ui-field px-3 py-3 text-base w-full mb-4" />
        {loadingHistory && <p role="status" className="text-sm text-muted">{t('enhance.loading')}</p>}
        <VoiceMemoTranscriptExport items={recordings.map(rec => ({ id: rec.id, name: rec.name, timestamp: rec.timestamp, duration: rec.duration, transcript: rec.transcript }))} visibleIds={visibleRecordings.map(rec => rec.id)} selectedIds={transcriptExportIds} onSelectionChange={setTranscriptExportIds} disabled={busy || loadingHistory} />

        {recordings.length === 0 ? (
          <div className="text-center py-12">
            <MicOff className="w-12 h-12 text-fg mx-auto mb-3" />
            <p className="text-faint">{t('noRecordings')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecordings.length === 0 && <p className="text-sm text-muted">{t('enhance.noMatch')}</p>}
            {visibleRecordings.map(rec => {
              const isPlaying = playingId === rec.id
              const progress = playbackProgress[rec.id] || 0
              const isEditing = editingId === rec.id
              const isDeleting = deleteConfirmId === rec.id

              return (
                <div
                  key={rec.id}
                  data-testid="voice-memo-item"
                  className="border border-line rounded-lg p-4 hover:bg-subtle transition-colors"
                >
                  {/* Top row: name + meta */}
                  <label className="mb-2 flex min-h-11 items-center gap-3 text-sm text-body">
                    <input type="checkbox" checked={transcriptExportIds.includes(rec.id)} disabled={busy || !rec.transcript.trim() || (transcriptExportIds.length >= VOICE_TRANSCRIPT_EXPORT_LIMIT && !transcriptExportIds.includes(rec.id))} onChange={event => setTranscriptExportIds(prev => event.target.checked ? [...prev, rec.id] : prev.filter(id => id !== rec.id))} className="h-5 w-5 shrink-0 accent-primary" />
                    <span className="min-w-0 break-words">{t('transcriptExport.selectMemo', { name: rec.name })}</span>
                  </label>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            maxLength={120}
                            disabled={busy}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmRename()
                              if (e.key === 'Escape') cancelRename()
                            }}
                            className="ui-field min-w-0 flex-1 px-2 py-2 text-base"
                            autoFocus
                          />
                          <button
                            onClick={confirmRename}
                            className="ui-btn-soft min-h-11 min-w-11 flex items-center justify-center"
                            aria-label={t('rename')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelRename}
                            aria-label={t('enhance.cancel')}
                            className="ui-btn-soft min-h-11 min-w-11 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-fg truncate">
                            {rec.name}
                          </p>
                          <button
                            onClick={() => startRename(rec)}
                            disabled={busy}
                            className="ui-btn-soft min-h-11 min-w-11 flex items-center justify-center shrink-0"
                            aria-label={t('rename')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                        <span>{formatTime(rec.duration)}</span>
                        <span>{formatFileSize(rec.fileSize)}</span>
                        <span>{formatTimestamp(rec.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <input type="range" min={0} max={100} step={0.5} value={progress} onChange={event => seekPlayback(rec, Number(event.target.value) / 100)} aria-label={rec.name} className="w-full h-11 accent-primary" />

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => togglePlayback(rec)}
                      className={`min-h-11 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        isPlaying
                          ? 'bg-primary-soft text-primary'
                          : 'bg-soft text-body hover:bg-subtle'
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
                      className="min-h-11 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-soft text-body hover:bg-subtle transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('download')}
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-primary">{t('deleteConfirm')}</span>
                        <button
                          onClick={() => void deleteRecording(rec.id)}
                          disabled={busy}
                          aria-label={t('enhance.confirmDelete')}
                          className="min-h-11 min-w-11 flex items-center justify-center bg-primary text-white rounded-xl"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          aria-label={t('enhance.cancel')}
                          className="ui-btn-soft min-h-11 min-w-11 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rec.id)}
                        disabled={busy}
                        className="ui-btn-soft ml-auto min-h-11 min-w-11 flex items-center justify-center"
                        aria-label={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 border-t border-line pt-3">
                    <button onClick={() => void transcribeRecording(rec)} disabled={busy} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('enhance.transcribe')}</button>
                    <button onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)} aria-expanded={expandedId === rec.id} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('enhance.editText')}</button>
                    <button onClick={() => void saveRecording(rec)} disabled={busy || rec.saved} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t(savingId === rec.id ? 'enhance.saving' : rec.saved ? 'enhance.saved' : 'enhance.save')}</button>
                  </div>
                  <p role="status" className="text-xs text-muted mt-2">{t(rec.saved ? 'enhance.savedHint' : 'enhance.unsavedHint')}</p>
                  {!!rec.transcript.trim() && <div className="mt-3 space-y-2">
                    <button type="button" onClick={() => {
                      try { openMeetingHandoff(rec.name, rec.transcript); setHandoffError(null) }
                      catch (error) { setHandoffError({ id: rec.id, key: error instanceof Error && error.message === 'popupBlocked' ? 'meeting.popupBlocked' : 'meeting.failed' }) }
                    }} disabled={busy || !rec.transcript.trim()} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('meeting.open')}</button>
                    <p className="text-xs text-muted">{t('meeting.hint')}</p>
                    {handoffError?.id === rec.id && <p role="alert" className="text-sm text-body">{t(handoffError.key)}</p>}
                  </div>}
                  {expandedId === rec.id && <div className="mt-3 space-y-2">
                    <label htmlFor={`voice-text-${rec.id}`} className="block text-sm text-body">{t('enhance.transcript')}</label>
                    <textarea id={`voice-text-${rec.id}`} value={rec.transcript} disabled={busy} maxLength={12000} rows={5} className="ui-field w-full min-h-32 p-3 text-base leading-relaxed" onChange={event => setRecordings(prev => prev.map(item => item.id === rec.id ? { ...item, transcript: event.target.value, saved: false } : item))} />
                    <p className="text-xs text-muted">{t('enhance.transcriptHint')}</p>
                    <button onClick={() => exportTranscript(rec)} disabled={!rec.transcript.trim()} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('enhance.exportText')}</button>

                  </div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Guide */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '\u2212' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-body">
            <div>
              <h3 className="font-medium text-fg mb-2">{t('guide.howto.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.howto.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-fg mb-2">{t('guide.formats.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.formats.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-fg mb-2">{t('guide.tips.title')}</h3>
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
