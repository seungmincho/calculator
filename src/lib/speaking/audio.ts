import { MAX_SECONDS } from './core'

export async function decodeSpeakingAudio(blob: Blob, limits: { maxSeconds?: number; maxBytes?: number } = {}): Promise<{ audio: Float32Array; seconds: number }> {
  if (blob.size > (limits.maxBytes ?? 15 * 1024 * 1024)) throw new Error('fileTooLarge')
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    if (!Number.isFinite(decoded.duration) || decoded.duration < .5) throw new Error('audioTooShort')
    if (decoded.duration > (limits.maxSeconds ?? MAX_SECONDS) + .5) throw new Error('audioTooLong')
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return { audio: rendered.getChannelData(0).slice(), seconds: decoded.duration }
  } finally { await context.close() }
}

export function downloadSpeakingFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
