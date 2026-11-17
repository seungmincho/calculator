import { createWhiteNoiseAudio, type WhiteNoiseSourceFactory } from './audio.ts'
import type { WhiteNoisePorts } from './session.ts'

/** Constructing ports is silent. The existing noise-buffer factory is passed by the future parent. */
export function whiteNoiseBrowserPorts(makeSource: WhiteNoiseSourceFactory): WhiteNoisePorts {
  return {
    clock: () => ({ wallMs: Date.now(), monotonicMs: performance.now() }),
    createAudio: type => createWhiteNoiseAudio(new AudioContext(), type, makeSource),
    every(callback, ms) { const id = window.setInterval(callback, ms); return () => window.clearInterval(id) },
    after(callback, ms) { const id = window.setTimeout(callback, ms); return () => window.clearTimeout(id) },
    onReturn(callback) {
      const visible = () => { if (document.visibilityState === 'visible') callback() }
      document.addEventListener('visibilitychange', visible); window.addEventListener('pageshow', callback)
      return () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', callback) }
    },
  }
}
