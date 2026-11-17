import {
  initialScreenRecordingState, reduceScreenRecording, selectScreenRecordingMime, screenRecordingExtension,
  isScreenRecordingConfig, SCREEN_RECORDING_QUALITY,
  type ScreenRecordingAction, type ScreenRecordingActualAudio, type ScreenRecordingConfig,
  type ScreenRecordingFailure, type ScreenRecordingState,
} from '../../utils/screenRecording.ts'
import { createScreenRecordingOwner } from './ownership.ts'

type Owner = ReturnType<typeof createScreenRecordingOwner>
export interface ScreenRecordingPorts {
  supported: () => boolean
  supportsMime: (mime: string) => boolean
  getDisplay: (config: ScreenRecordingConfig) => Promise<MediaStream>
  getMicrophone: () => Promise<MediaStream>
  compose: (display: MediaStream, mic: MediaStream | null, config: ScreenRecordingConfig, owner: Owner) => Promise<{ stream: MediaStream; audio: ScreenRecordingActualAudio }>
  createRecorder: (stream: MediaStream, mime: string, bitrate: number) => MediaRecorder
  now: () => number
  wallNow: () => number
  every: (callback: () => void, ms: number) => () => void
  after: (callback: () => void, ms: number) => () => void
  createUrl: (blob: Blob) => string
  revokeUrl: (url: string) => void
}
type Attempt = { id: number; config: ScreenRecordingConfig; owner: Owner; mime: string; display: MediaStream | null; mic: MediaStream | null; recorder: MediaRecorder | null; chunks: Blob[]; starting: boolean; micDenied: boolean }
const liveTracks = (tracks: MediaStreamTrack[]) => tracks.filter(track => track.readyState === 'live')

/** One mounted session, one active attempt, and one separately owned successful result. */
export function createScreenRecordingSession(ports: ScreenRecordingPorts, onChange: (state: ScreenRecordingState) => void) {
  let state = initialScreenRecordingState(), sequence = 0, disposed = false
  let attempt: Attempt | null = null
  const current = (item: Attempt) => !disposed && attempt === item && !item.owner.released
  const dispatch = (action: ScreenRecordingAction) => {
    const next = reduceScreenRecording(state, action)
    if (next !== state) { state = next; if (!disposed) onChange(state) }
  }
  const revoke = (url: string) => { try { ports.revokeUrl(url) } catch { /* Do not discard a valid result because cleanup failed. */ } }
  const release = (item: Attempt) => {
    if (attempt === item) attempt = null
    item.owner.release(); item.chunks.length = 0
  }
  const fail = (item: Attempt, error: ScreenRecordingFailure) => {
    if (!current(item)) return
    release(item); dispatch({ type: 'fail', generation: item.id, error })
  }
  const finish = (item: Attempt) => {
    if (!current(item)) return
    if (state.phase === 'recording' || state.phase === 'paused') dispatch({ type: 'stop', generation: item.id, now: ports.now() })
    if (!current(item) || state.phase !== 'stopping') { fail(item, 'recording'); return }
    let url: string | null = null
    try {
      const mime = item.recorder?.mimeType || item.chunks.find(chunk => chunk.type)?.type || ''
      const extension = screenRecordingExtension(mime)
      if (!extension || item.chunks.some(chunk => chunk.type && screenRecordingExtension(chunk.type) !== extension)) { fail(item, 'format'); return }
      const blob = new Blob(item.chunks, { type: mime })
      if (!blob.size) { fail(item, 'empty'); return }
      const createdAt = ports.wallNow()
      const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19)
      url = ports.createUrl(blob)
      if (!current(item)) { revoke(url); return }
      const previous = state.result
      const result = { id: item.id, blob, url, name: `screen-recording-${timestamp}.${extension}`, mime, elapsedMs: state.elapsedMs, createdAt, config: item.config, audio: state.audio }
      dispatch({ type: 'complete', generation: item.id, result })
      if (state.result?.id !== item.id) { revoke(url); fail(item, 'resultFailed'); return }
      release(item)
      if (previous) revoke(previous.url)
    } catch {
      if (url && state.result?.url !== url) revoke(url)
      fail(item, 'resultFailed')
    }
  }
  const stop = () => {
    const item = attempt
    if (!item || !current(item) || !['recording', 'paused'].includes(state.phase)) return
    dispatch({ type: 'stop', generation: item.id, now: ports.now() })
    if (!current(item)) return
    try {
      item.owner.cleanup(ports.after(() => fail(item, 'stopTimeout'), 10_000))
      if (item.recorder?.state !== 'inactive') item.recorder?.stop()
      // An already-inactive recorder may still have its data/stop events queued.
    } catch { fail(item, 'recording') }
  }
  const initialize = async (item: Attempt) => {
    if (!current(item) || item.starting || !item.display) return
    item.starting = true
    try {
      if (!liveTracks(item.display.getVideoTracks()).length) { fail(item, 'displayEnded'); return }
      const composed = await ports.compose(item.display, item.mic, item.config, item.owner)
      item.owner.stream(composed.stream)
      if (!current(item)) return
      if (!liveTracks(item.display.getVideoTracks()).length) { fail(item, 'displayEnded'); return }
      const record = ports.createRecorder(composed.stream, item.mime, SCREEN_RECORDING_QUALITY[item.config.quality].bitrate)
      if (!item.owner.recorder(record) || !current(item)) return
      item.recorder = record
      record.ondataavailable = event => { if (current(item) && event.data.size > 0) item.chunks.push(event.data) }
      record.onerror = () => fail(item, 'recording')
      record.onstop = () => finish(item)
      record.start(1000)
      if (!current(item)) return
      if (record.state !== 'recording') { fail(item, 'initialization'); return }
      dispatch({ type: 'started', generation: item.id, now: ports.now(), audio: composed.audio, micDenied: item.micDenied })
      if (current(item)) item.owner.cleanup(ports.every(() => { if (current(item)) dispatch({ type: 'tick', generation: item.id, now: ports.now() }) }, 250))
    } catch { fail(item, 'initialization') }
  }
  const prepare = async (item: Attempt) => {
    try {
      const display = await ports.getDisplay(item.config)
      if (!item.owner.stream(display) || !current(item)) return
      item.display = display
      const videos = display.getVideoTracks()
      if (!liveTracks(videos).length) { fail(item, 'displayEnded'); return }
      const ended = () => {
        if (!current(item)) return
        if (state.phase === 'recording' || state.phase === 'paused') stop()
        else if (state.phase !== 'stopping') fail(item, 'displayEnded')
      }
      // Attach before microphone permission or composition can await anything.
      for (const video of videos) {
        video.addEventListener('ended', ended)
        item.owner.cleanup(() => video.removeEventListener('ended', ended))
      }
      if (!liveTracks(videos).length) { ended(); return }
      if (item.config.audio === 'mic' || item.config.audio === 'both') {
        try {
          const mic = await ports.getMicrophone()
          if (!item.owner.stream(mic) || !current(item)) return
          if (!liveTracks(mic.getAudioTracks()).length) throw new Error('microphoneUnavailable')
          item.mic = mic
        } catch {
          if (!current(item)) return
          item.micDenied = true
          dispatch({ type: 'audioChoice', generation: item.id, audio: { system: item.config.audio === 'both' && !!liveTracks(display.getAudioTracks()).length, mic: false } })
          return
        }
      }
      await initialize(item)
    } catch (error) {
      fail(item, error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError' ? 'permissionDenied' : 'initialization')
    }
  }
  return {
    getSnapshot: () => state,
    start(config: ScreenRecordingConfig) {
      if (disposed || attempt || state.phase !== 'idle' || !isScreenRecordingConfig(config)) return
      const item: Attempt = { id: ++sequence, config: { ...config }, owner: createScreenRecordingOwner(), mime: '', display: null, mic: null, recorder: null, chunks: [], starting: false, micDenied: false }
      attempt = item; dispatch({ type: 'prepare', generation: item.id, config: item.config })
      if (!current(item)) return
      try {
        item.mime = ports.supported() ? selectScreenRecordingMime(ports.supportsMime) ?? '' : ''
        if (!item.mime) { fail(item, 'unsupported'); return }
        void prepare(item)
      } catch { fail(item, 'unsupported') }
    },
    cancelPreparation() {
      const item = attempt
      if (!item || !['preparing', 'audioChoice'].includes(state.phase)) return
      release(item); dispatch({ type: 'cancel', generation: item.id })
    },
    continueWithoutMic() { if (attempt && state.phase === 'audioChoice') void initialize(attempt) },
    pause() {
      const item = attempt
      if (!item || !current(item) || state.phase !== 'recording') return
      try { item.recorder?.pause(); if (current(item)) dispatch({ type: 'pause', generation: item.id, now: ports.now() }) } catch { fail(item, 'recording') }
    },
    resume() {
      const item = attempt
      if (!item || !current(item) || state.phase !== 'paused') return
      try { item.recorder?.resume(); if (current(item)) dispatch({ type: 'resume', generation: item.id, now: ports.now() }) } catch { fail(item, 'recording') }
    },
    stop,
    deleteResult(id: number) {
      if (disposed || state.result?.id !== id) return
      const previous = state.result
      dispatch({ type: 'deleteResult' }); revoke(previous.url)
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (attempt) release(attempt)
      if (state.result) revoke(state.result.url)
      state = initialScreenRecordingState()
    },
  }
}
