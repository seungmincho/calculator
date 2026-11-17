import { SCREEN_RECORDING_QUALITY } from '../../utils/screenRecording.ts'
import type { ScreenRecordingPorts } from './session.ts'

/** This adapter requests permission only when the session invokes its explicit start ports. */
export function screenRecordingBrowserPorts(): ScreenRecordingPorts {
  return {
    supported: () => typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function' && typeof MediaRecorder !== 'undefined',
    supportsMime: mime => MediaRecorder.isTypeSupported(mime),
    getDisplay(config) {
      const quality = SCREEN_RECORDING_QUALITY[config.quality]
      return navigator.mediaDevices.getDisplayMedia({ video: { frameRate: config.fps, width: { ideal: quality.width }, height: { ideal: quality.height } }, audio: config.audio === 'system' || config.audio === 'both' })
    },
    getMicrophone: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }),
    async compose(display, microphone, config, owner) {
      const system = config.audio === 'system' || config.audio === 'both' ? display.getAudioTracks().filter(track => track.readyState === 'live') : []
      const mic = microphone?.getAudioTracks().filter(track => track.readyState === 'live') ?? []
      const audio = { system: system.length > 0, mic: mic.length > 0 }
      if (system.length && mic.length) {
        const context = new AudioContext()
        if (!owner.context(context)) throw new Error('canceled')
        const destination = context.createMediaStreamDestination()
        owner.stream(destination.stream)
        for (const tracks of [system, mic]) {
          const source = context.createMediaStreamSource(new MediaStream(tracks))
          owner.cleanup(() => source.disconnect())
          source.connect(destination)
        }
        if (context.state === 'suspended') await context.resume()
        if (owner.released || context.state !== 'running') throw new Error('audioContextUnavailable')
        const stream = new MediaStream([...display.getVideoTracks(), ...destination.stream.getAudioTracks()])
        owner.stream(stream)
        return { stream, audio }
      }
      const stream = new MediaStream([...display.getVideoTracks(), ...system, ...mic])
      owner.stream(stream)
      return { stream, audio }
    },
    createRecorder: (stream, mimeType, videoBitsPerSecond) => new MediaRecorder(stream, { mimeType, videoBitsPerSecond }),
    now: () => performance.now(), wallNow: () => Date.now(),
    every(callback, ms) { const id = setInterval(callback, ms); return () => clearInterval(id) },
    after(callback, ms) { const id = setTimeout(callback, ms); return () => clearTimeout(id) },
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
  }
}
