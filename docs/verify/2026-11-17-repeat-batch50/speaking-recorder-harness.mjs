import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const turn = () => new Promise(resolve => setImmediate(resolve))
export const find = (h, key, value) => h.find(node => value === undefined ? Object.hasOwn(node.props, key) : node.props[key] === value)
export async function recorderFixture({ parent = false, locale = 'ko', records = [] } = {}) {
  const permissions = [], recorders = [], streams = [], contexts = [], completed = [], saves = [], downloads = [], timerCallbacks = [], timers = new Map()
  const clock = { now: 0 }, failures = { recorder: false, start: false, audio: false, analyser: false, stop: false, close: false }
  let timerId = 0, models = 0, decodes = 0, currentLocale = locale
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/webm' }
    constructor(media, options) { if (failures.recorder) throw Error('recorder denied'); this.media = media; this.mimeType = options?.mimeType ?? ''; this.state = 'inactive'; this.starts = []; this.stops = 0; recorders.push(this) }
    start(slice) { if (failures.start) throw Error('start denied'); this.started = clock.now; this.state = 'recording'; this.starts.push(slice) }
    stop() { this.stops++; if (failures.stop) throw Error('stop denied'); this.state = 'inactive' }
  }
  class Audio {
    constructor() { if (failures.audio) throw Error('audio denied'); this.closed = 0; contexts.push(this) }
    createAnalyser() { if (failures.analyser) throw Error('analyser denied'); return { fftSize: 256, getByteTimeDomainData(data) { data.fill(128) } } }
    createMediaStreamSource() { return { connect() {} } }
    async close() { this.closed++; if (failures.close) throw Error('close denied') }
  }
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch50/translations-speaking-preparation.json', 'utf8'))
  const catalogs = Object.fromEntries(['ko', 'en'].map(lang => { const catalog = JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')); Object.assign(catalog.speakingPractice, patch[lang].speakingPractice); return [lang, catalog] }))
  const translated = namespace => {
    const lookup = key => key.split('.').reduce((item, part) => item?.[part], catalogs[currentLocale][namespace])
    const t = (key, variables = {}) => { const value = lookup(key); if (typeof value !== 'string') throw Error(`Missing ${namespace}.${key}`); return value.replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? `{${name}}`)) }
    t.raw = lookup; return t
  }
  const modules = parent ? {
    '@/lib/i18n': { useTranslations: translated },
    '@/components/MobileResultLink': { __esModule: true, default: 'MobilePort' },
    '@/lib/speaking/client': { SpeakingAIClient: class { constructor() { models++ } cancel() {} }, deleteCoachingDownload: async () => {} },
    '@/lib/speaking/audio': { decodeSpeakingAudio: async () => { decodes++; throw Error('Unexpected audio decode') }, downloadSpeakingFile: (blob, name) => downloads.push({ blob, name }) },
    '@/lib/speaking/storage': {
      listSpeakingSessions: async () => ({ records: records.map(session => ({ session, basis: { kind: 'legacy', updatedAt: session.updatedAt } })), totalCount: records.length, unreadableCount: 0, unsupportedCount: 0 }),
      saveSpeakingSession: (session, basis) => { const pending = defer(); saves.push({ ...pending, session: structuredClone(session), basis: structuredClone(basis) }); return pending.promise },
      deleteSpeakingSession: async () => {},
    },
  } : {}
  const h = await componentHarness(parent ? 'src/components/SpeakingPractice.tsx' : 'src/hooks/useSpeakingRecorder.ts', {
    ...(parent ? {} : { exportName: 'useSpeakingRecorder', props: (blob, seconds) => completed.push({ blob, seconds }) }),
    window: { confirm: () => true }, navigator: { mediaDevices: { getUserMedia() { const pending = defer(); permissions.push(pending); return pending.promise } } }, modules,
    globals: { MediaRecorder: Recorder, AudioContext: Audio, DOMException, crypto: { randomUUID }, performance: { now: () => clock.now },
      setInterval(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); timerCallbacks.push(callback); return id },
      clearInterval(id) { timers.delete(id) },
    },
  })
  const sync = async () => { for (let i = 0; i < 3; i++) { await turn(); h.render() } }
  h.render(); await sync()
  const media = () => { const track = { stopped: 0, stop() { this.stopped++ } }, stream = { track, getTracks: () => [track] }; streams.push(stream); return stream }
  const grant = async (index = permissions.length - 1) => { const stream = media(); permissions[index].resolve(stream); await sync(); return stream }
  const tick = async now => { clock.now = now; for (const { callback } of [...timers.values()]) callback(); await sync() }
  const click = async (key, value) => { find(h, key, value).props.onClick(); await sync() }
  const finish = async (rec = recorders.at(-1), elapsed = 1000, bytes = 'synthetic') => {
    clock.now = rec.started + elapsed
    if (parent) find(h, 'data-speaking-record').props.onClick(); else h.render().stop()
    rec.ondataavailable?.({ data: new Blob(bytes ? [bytes] : [], { type: rec.mimeType }) }); rec.onstop?.(); await sync()
  }
  return { h, clock, permissions, recorders, streams, contexts, completed, saves, downloads, timers, timerCallbacks, failures, media, grant, tick, sync, click, finish,
    get models() { return models }, get decodes() { return decodes },
    state: () => h.render(), locale: async value => { currentLocale = value; await sync() }, close: () => h.cleanup(),
  }
}
