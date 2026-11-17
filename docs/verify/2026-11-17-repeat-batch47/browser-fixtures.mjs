// Browser-only ports. Every normal comparison still uses the product's native module Worker.
export async function installDiffPorts(context) {
  await context.addInitScript(() => {
    const NativeWorker = window.Worker
    window.__workerMode = 'native'; window.__workers = []; window.__workerPending = []
    window.Worker = class ObservedWorker {
      constructor(url, options) {
        this.native = new NativeWorker(url, options); this.onmessage = this.onerror = this.onmessageerror = null
        this.record = { url: String(url), posted: false, received: false, terminated: 0, mode: null }
        window.__workers.push(this.record)
        this.native.onmessage = event => {
          this.record.received = true
          const callback = this.onmessage
          if (!callback) return
          if (this.record.mode === 'hold') { window.__workerPending.push(() => callback(event)); return }
          if (this.record.mode === 'tamper' && event.data.ok) {
            const data = structuredClone(event.data); data.result.lines[0].content += ' [wrong source]'
            callback({ data }); return
          }
          callback(event)
        }
        this.native.onerror = event => this.onerror?.(event)
        this.native.onmessageerror = event => this.onmessageerror?.(event)
      }
      postMessage(request) { this.record.posted = true; this.record.mode = window.__workerMode; this.native.postMessage(request) }
      terminate() { this.record.terminated++; this.native.terminate() }
    }
    window.__heartbeat = []
    const timeout = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window)
    window.__receiverQueue = []
    window.setTimeout = (callback, delay, ...args) => {
      if (typeof callback !== 'function' || !String(callback).includes('receiveWritingDiffTransfer') || sessionStorage.getItem('__holdMergeReceiver') !== '1') return timeout(callback, delay, ...args)
      const item = { callback: () => callback(...args), active: true, id: timeout(() => {}, delay) }
      window.__receiverQueue.push(item); return item.id
    }
    window.clearTimeout = id => { const item = window.__receiverQueue.find(item => item.id === id); if (item) item.active = false; return clear(id) }
    window.__releaseReceiver = () => { const item = window.__receiverQueue.findLast(item => item.active); if (item) { item.active = false; item.callback() } }
    let previous = performance.now()
    setInterval(() => { const now = performance.now(); window.__heartbeat.push(now - previous); previous = now }, 16)
  })
}

export function separatedChanges(count = 8) {
  const left = [], right = []
  for (let i = 0; i < count; i++) { left.push(`unique anchor ${i}`, `old ${i}`); right.push(`unique anchor ${i}`, `new ${i}`) }
  left.push('last anchor'); right.push('last anchor')
  return { left: left.join('\n'), right: right.join('\n') }
}

export function largeMergeSources() {
  return { left: 'a'.repeat(1048575) + '\n', right: '\n' + 'b'.repeat(1048575), expected: 'a'.repeat(1048575) + '\n\n' + 'b'.repeat(1048575) }
}
