// Synthetic microphone only. Native codecs, streams, analyser and MediaRecorder remain in use.
export async function installSpeakingPorts(context) {
  await context.addInitScript(() => {
    const NativeAudio = window.AudioContext, NativeRecorder = window.MediaRecorder
    window.__micMode = 'native-synthetic'; window.__micRequests = []; window.__recorders = []; window.__productAudio = []
    window.__holdRecorderStop = false; window.__clockOffset = 0; window.__visibility = null
    const now = performance.now.bind(performance)
    Object.defineProperty(performance, 'now', { value: () => now() + window.__clockOffset, configurable: true })
    const nativeHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get
    const nativeVisibility = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')?.get
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__visibility === null ? nativeHidden.call(document) : window.__visibility === 'hidden' })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__visibility ?? nativeVisibility.call(document) })
    const createSynthetic = async record => {
      const context = new NativeAudio(), oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination()
      oscillator.frequency.value = 440; gain.gain.value = 0.08; oscillator.connect(gain).connect(destination); oscillator.start(); await context.resume()
      record.context = context; record.stream = destination.stream; record.approvedAt = performance.now(); record.trackStops = 0
      for (const track of destination.stream.getTracks()) {
        const stop = track.stop.bind(track)
        track.stop = () => { record.trackStops++; stop(); try { oscillator.stop() } catch { /* Already ended. */ } void context.close().catch(() => {}) }
      }
      return record.stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: options => {
      const record = { options, requestedAt: performance.now(), stream: null, context: null, trackStops: 0, approvedAt: null }
      window.__micRequests.push(record)
      if (window.__micMode === 'reject') return Promise.reject(new DOMException('Synthetic denied permission', 'NotAllowedError'))
      if (window.__micMode === 'hold') return new Promise((resolve, reject) => { record.resolve = async () => resolve(await createSynthetic(record)); record.reject = reject })
      return createSynthetic(record)
    } })
    window.AudioContext = class ObservedAudioContext extends NativeAudio {
      constructor(...args) { super(...args); window.__productAudio.push(this) }
    }
    window.MediaRecorder = class ObservedMediaRecorder extends NativeRecorder {
      constructor(stream, options) {
        super(stream, options)
        this.record = { instance: this, stream, createdAt: performance.now(), startedAt: null, stoppedAt: null, starts: 0, chunks: [], savedStop: null, savedError: null, savedData: null }
        window.__recorders.push(this.record)
        this.addEventListener('dataavailable', event => this.record.chunks.push({ size: event.data.size, type: event.data.type }))
      }
      start(timeslice) { this.record.startedAt = performance.now(); this.record.starts++; this.record.timeslice = timeslice; return super.start(timeslice) }
      stop() { this.record.stoppedAt = performance.now(); return super.stop() }
      set ondataavailable(callback) { if (callback) this.record.savedData = callback; super.ondataavailable = callback }
      get ondataavailable() { return super.ondataavailable }
      set onerror(callback) { if (callback) this.record.savedError = callback; super.onerror = callback }
      get onerror() { return super.onerror }
      set onstop(callback) {
        if (callback) this.record.savedStop = callback
        super.onstop = callback ? event => { if (window.__holdRecorderStop) this.record.releaseStop = () => callback(event); else callback(event) } : null
      }
      get onstop() { return super.onstop }
    }
    const interval = window.setInterval.bind(window), clear = window.clearInterval.bind(window)
    window.__speakingIntervals = []
    window.setInterval = (callback, delay, ...args) => {
      if (delay !== 100 || typeof callback !== 'function') return interval(callback, delay, ...args)
      const record = { callback: () => callback(...args), canceled: false }; record.id = interval(record.callback, delay); window.__speakingIntervals.push(record); return record.id
    }
    window.clearInterval = id => { const record = window.__speakingIntervals.findLast(item => item.id === id); if (record) record.canceled = true; return clear(id) }
  })
}

export async function inspectAudioBytes(page, bytes) {
  return page.evaluate(async values => {
    const context = new OfflineAudioContext(1, 1, 48000), decoded = await context.decodeAudioData(Uint8Array.from(values).buffer)
    const channel = decoded.getChannelData(0), sum = channel.reduce((total, value) => total + value * value, 0)
    return { duration: decoded.duration, sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, rms: Math.sqrt(sum / channel.length) }
  }, Array.from(bytes))
}
