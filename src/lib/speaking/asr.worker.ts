import { env, pipeline } from '@huggingface/transformers'
import { SPEECH_MODEL } from './core'

env.allowLocalModels = false
env.useBrowserCache = true
// SharedArrayBuffer is not required on the statically hosted site.
env.backends.onnx.wasm!.numThreads = 1
env.backends.onnx.wasm!.proxy = false

let recognizer: Awaited<ReturnType<typeof createRecognizer>> | null = null
function createRecognizer() {
  return pipeline('automatic-speech-recognition', SPEECH_MODEL, { device: 'wasm', dtype: 'q8',
    progress_callback: progress => {
      if (progress.status === 'progress') self.postMessage({ type: 'progress', progress: progress.progress / 100 })
      else if (progress.status === 'ready') self.postMessage({ type: 'transcribing' })
    },
  })
}
self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    recognizer ??= await createRecognizer()
    self.postMessage({ type: 'transcribing' })
    const result = await recognizer(event.data.audio, { language: 'korean', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: false })
    self.postMessage({ type: 'result', text: Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text })
  } catch {
    self.postMessage({ type: 'error' })
  }
}
