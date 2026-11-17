import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import { feedbackPrompt, groundedFeedbackSchema, FEEDBACK_MODEL, parseFeedback, type SpeakingMode } from './core'

export type SpeakingProgress = { stage: 'speechLoading' | 'transcribing' | 'modelLoading' | 'thinking'; progress?: number }
type Progress = (value: SpeakingProgress) => void

/** Only model files leave/enter the network. Speech and prompts are worker messages. */
export class SpeakingAIClient {
  private llmWorker: Worker | null = null
  private speechWorker: Worker | null = null
  private engine: WebWorkerMLCEngine | null = null
  private model = ''
  private rejectCurrent: ((reason: Error) => void) | null = null
  private generation = 0

  releaseSpeech() {
    this.speechWorker?.terminate()
    this.speechWorker = null
  }

  releaseCoaching() {
    this.llmWorker?.terminate()
    this.llmWorker = null
    this.engine = null
    this.model = ''
  }

  cancel(reason = 'cancelled') {
    this.generation++
    this.rejectCurrent?.(new Error(reason))
    this.rejectCurrent = null
    this.releaseSpeech()
    this.releaseCoaching()
  }

  private async operation<T>(run: (checkActive: () => void) => Promise<T>) {
    const generation = this.generation
    const checkActive = () => { if (generation !== this.generation) throw new Error('cancelled') }
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancelled = new Promise<never>((_, reject) => {
      this.rejectCurrent = reject
      timer = setTimeout(() => this.cancel('modelTimeout'), 8 * 60 * 1000)
    })
    try { return await Promise.race([run(checkActive), cancelled]) }
    finally { clearTimeout(timer); if (generation === this.generation) this.rejectCurrent = null }
  }

  transcribe(audio: Float32Array, onProgress: Progress): Promise<string> {
    this.releaseCoaching()
    return this.operation<string>(() => new Promise((resolve, reject) => {
      this.speechWorker ??= new Worker(new URL('./asr.worker.ts', import.meta.url), { type: 'module' })
      onProgress({ stage: 'speechLoading', progress: 0 })
      this.speechWorker.onmessage = (event: MessageEvent<{ type: string; progress?: number; text?: string }>) => {
        if (event.data.type === 'result') resolve(event.data.text?.trim() ?? '')
        else if (event.data.type === 'error') { this.speechWorker?.terminate(); this.speechWorker = null; reject(new Error('speechFailed')) }
        else onProgress({ stage: event.data.type === 'transcribing' ? 'transcribing' : 'speechLoading', progress: event.data.progress })
      }
      this.speechWorker.onerror = () => { this.speechWorker?.terminate(); this.speechWorker = null; reject(new Error('speechFailed')) }
      this.speechWorker.postMessage({ audio }, [audio.buffer])
    })).finally(() => this.releaseSpeech())
  }

  feedback(mode: SpeakingMode, transcript: string, onProgress: Progress) {
    this.releaseSpeech()
    return this.operation(async checkActive => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: { has(feature: string): boolean } } | null> } }).gpu
      if (!gpu) throw new Error('noWebGPU')
      const adapter = await gpu.requestAdapter()
      checkActive()
      if (!adapter) throw new Error('noWebGPU')
      const model = adapter.features.has('shader-f16') ? FEEDBACK_MODEL : FEEDBACK_MODEL.replace('q4f16', 'q4f32')
      if (!this.engine || this.model !== model) {
        this.llmWorker?.terminate()
        this.engine = null
        const { CreateWebWorkerMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm')
        checkActive()
        this.llmWorker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
        onProgress({ stage: 'modelLoading', progress: 0 })
        const engine = await CreateWebWorkerMLCEngine(this.llmWorker, model, {
          appConfig: { ...prebuiltAppConfig, cacheBackend: 'cache' },
          initProgressCallback: info => onProgress({ stage: 'modelLoading', progress: info.progress }),
          logLevel: 'ERROR',
        }, { context_window_size: 4096 })
        checkActive()
        this.engine = engine
        this.model = model
      }
      onProgress({ stage: 'thinking' })
      await this.engine.resetChat()
      checkActive()
      const result = await this.engine.chat.completions.create({
        messages: feedbackPrompt(mode, transcript), temperature: 0, max_tokens: 1024,
        response_format: { type: 'json_object', schema: JSON.stringify(groundedFeedbackSchema(transcript, mode)) },
        extra_body: { enable_thinking: false },
      })
      if (result.choices[0]?.finish_reason === 'length') throw new Error('invalidFeedback')
      return parseFeedback(result.choices[0]?.message.content ?? '', transcript, model)
    }).finally(() => this.releaseCoaching())
  }
}

/** Called only by the explicit remove-download button; never removes practice records. */
export async function deleteCoachingDownload() {
  const { prebuiltAppConfig } = await import('@mlc-ai/web-llm')
  const ids = new Set([FEEDBACK_MODEL, FEEDBACK_MODEL.replace('q4f16', 'q4f32')])
  const models = prebuiltAppConfig.model_list.filter(model => ids.has(model.model_id))
  const prefixes = models.map(model => model.model.replace(/\/$/, '') + '/')
  const wasmUrls = new Set(models.map(model => model.model_lib))
  // The library deletion helper fetches a manifest even for an empty/partial
  // cache. Enumerating stored requests also works offline and removes partials.
  for (const name of await caches.keys()) {
    if (!['webllm/model', 'webllm/config', 'webllm/wasm'].includes(name)) continue
    const cache = await caches.open(name)
    for (const request of await cache.keys()) {
      if (prefixes.some(prefix => request.url.startsWith(prefix)) || wasmUrls.has(request.url)) await cache.delete(request)
    }
  }
}
