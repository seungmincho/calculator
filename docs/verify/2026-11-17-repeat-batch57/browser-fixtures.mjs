// Browser-only controlled Tesseract protocol. Actual installed createWorker,
// image preparation, canvas.toBlob and FileReader still execute. No OCR/model runs.
export async function installOcrWorkerPort(context) {
  await context.addInitScript(() => {
    const NativeWorker = window.Worker
    window.__ocrWorkers = []; window.__ocrPackets = []; window.__ocrResponses = []; window.__ocrDeliveryThrows = []
    window.__ocrHoldActions = []; window.__ocrPlans = []; window.__ocrDefaultText = '첫 번째 합성 원고\n두 번째 줄'
    class ControlledOcrWorker extends EventTarget {
      constructor(url, options) {
        super()
        // Only the Tesseract classic worker is replaced; unrelated module workers remain real.
        if (options?.type === 'module') return new NativeWorker(url, options)
        this.url = String(url); this.index = window.__ocrWorkers.length; this.terminated = 0
        window.__ocrWorkers.push(this)
      }
      postMessage(packet) {
        const record = { worker: this.index, packet, delivered: false, held: window.__ocrHoldActions.includes(packet.action) }; window.__ocrPackets.push(record)
        if (packet.action === 'recognize') record.plan = window.__ocrPlans.shift() ?? { text: window.__ocrDefaultText }
        if (record.plan?.hold) record.held = true
        if (!record.held) queueMicrotask(() => window.__ocrDeliver(record))
      }
      terminate() { this.terminated++ }
    }
    window.__ocrDeliver = (record, override) => {
      if (record.delivered) return
      record.delivered = true
      const worker = window.__ocrWorkers[record.worker], packet = record.packet, plan = override ?? record.plan ?? {}
      const data = packet.action === 'recognize' ? { text: plan.text ?? '', confidence: plan.confidence ?? 93, blocks: plan.blocks === null ? null : [{ paragraphs: [{ lines: [{ words: [{ text: '합성', confidence: 44, bbox: { x0: 4, y0: 4, x1: 40, y1: 30 } }] }] }] }] } : {}
      const response = { workerId: packet.workerId, jobId: packet.jobId, action: packet.action, status: plan.fail ? 'reject' : 'resolve', data: plan.fail ? 'Synthetic OCR recognition failure' : data }
      window.__ocrResponses.push({ worker: record.worker, action: packet.action, jobId: packet.jobId, status: response.status, afterTerminate: worker.terminated > 0 })
      // Tesseract rejects its request and then throws when no errorHandler is set.
      // Capture that intentional protocol-port throw, not a product DOM exception.
      try { worker.onmessage?.({ data: response }) } catch (cause) { window.__ocrDeliveryThrows.push(String(cause)) }
    }
    window.__ocrRelease = (action = 'recognize', override) => { const record = window.__ocrPackets.find(item => !item.delivered && item.packet.action === action); if (record) window.__ocrDeliver(record, override) }
    window.__ocrProgress = (recordIndex, progress = 0.9) => { const record = window.__ocrPackets[recordIndex], worker = window.__ocrWorkers[record.worker]; worker.onmessage?.({ data: { workerId: record.packet.workerId, jobId: record.packet.jobId, action: record.packet.action, status: 'progress', data: { status: 'recognizing text', progress } } }) }
    window.Worker = ControlledOcrWorker
    const createUrl = URL.createObjectURL.bind(URL)
    window.__ocrObjectUrls = []
    URL.createObjectURL = blob => { const url = createUrl(blob); window.__ocrObjectUrls.push({ url, file: blob instanceof File, type: blob.type }); return url }
    window.__ocrSpeechCalls = []
    if (window.speechSynthesis) window.speechSynthesis.speak = utterance => { window.__ocrSpeechCalls.push(utterance.text) }
    const decode = HTMLImageElement.prototype.decode
    window.__ocrImagePlans = []; window.__ocrImageReads = []
    HTMLImageElement.prototype.decode = async function () {
      const plan = window.__ocrImagePlans.shift() ?? {}, task = { url: this.src, plan, delivered: false }; window.__ocrImageReads.push(task)
      await decode.call(this); task.width = this.naturalWidth; task.height = this.naturalHeight
      if (plan.hold) await new Promise(resolve => { task.release = resolve })
      task.delivered = true
      if (plan.fail) throw new DOMException('Synthetic late preview decode error', 'EncodingError')
    }
    window.__ocrReleaseImages = () => { for (const task of window.__ocrImageReads) if (task.release) { task.release(); delete task.release } }
  })
}
