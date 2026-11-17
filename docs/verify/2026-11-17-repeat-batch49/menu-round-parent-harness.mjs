import fs from 'node:fs'
import { webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const all = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(all) : [n, ...all(n.props?.children)]
export const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
export const plain = value => JSON.parse(JSON.stringify(value))
export async function menuHost(options = {}) {
  const source = options.source ?? ['피자', '국수', '피자', '김밥'], storage = new Map(Object.entries(options.storage ?? {})), storageWrites = [], frames = [], jobs = [], copies = [], legacy = [], files = [], images = [], focuses = []
  let now = Date.UTC(2026, 10, 17, 3), sequence = 0, randomValue = .2, fraction = 0, randomCalls = 0, locale = 'ko', copyPort = async () => {}, legacyResult = false
  const messages = {}, patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch49/translations-menu-round.json', 'utf8'))
  const loadMessages = () => { Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))); Object.assign(messages.decisionTools, patch[locale].decisionTools) }; loadMessages()
  const math = Object.create(Math); math.random = () => { randomCalls++; return randomValue }
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
  const schedule = (callback, ms, interval = false) => { const item = { id: ++sequence, callback, ms, interval, active: true }; jobs.push(item); return item.id }
  const cancel = id => { const item = [...jobs, ...frames].find(job => job.id === id); if (item) item.active = false }
  const ctx = new Proxy({}, { get: (_, name) => name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : name === 'fillText' ? value => images.push(value) : () => {}, set: () => true })
  const h = await componentHarness('src/components/DecisionTools.tsx', {
    props: { initialTab: 'roulette', single: true, defaultPreset: '저녁메뉴', menuMode: true, ...options.props },
    messages, url: options.url ?? 'https://toolhub.ai.kr/menu-roulette/?roulette=' + encodeURIComponent(source.join(',')) + '&utm=x&utm=y#fixture',
    storagePort: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storageWrites.push([key, value]); storage.set(key, value) } },
    navigator: { clipboard: { writeText: value => { copies.push(value); return copyPort(value) } } },
    document: { activeElement: null, body: { appendChild() {} }, execCommand: () => { legacy.push('copy'); return legacyResult }, createElement(tag) {
      if (tag === 'textarea') return { style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }
      if (tag === 'canvas') return { getContext: () => ctx, toDataURL: () => 'data:image/png;base64,synthetic' }
      const anchor = { click() { files.push({ name: anchor.download, href: anchor.href }) }, remove() {} }; return anchor
    } },
    globals: { Date: ClockDate, Math: math, performance: { now: () => now }, crypto: webcrypto, HTMLElement: class {}, AbortController,
      requestAnimationFrame(callback) { const item = { id: ++sequence, callback, active: true }; frames.push(item); return item.id }, cancelAnimationFrame: cancel,
      setTimeout: (callback, ms) => schedule(callback, ms), clearTimeout: cancel, setInterval: (callback, ms) => schedule(callback, ms, true), clearInterval: cancel },
    modules: { '@/components/MealHistoryPanel': { __esModule: true, default: 'MealHistoryPanel' }, '@/components/MealPlanPanel': { __esModule: true, default: 'MealPlanPanel' }, '@/components/MenuRoundExclusions': { __esModule: true, default: 'MenuRoundExclusions' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } },
    beforeEffects(tree) { for (const node of all(tree)) if (node.type === 'button' && node.props.ref) node.props.ref.current = { disabled: !!node.props.disabled, focus() { focuses.push(node.props.id ?? Object.keys(node.props).find(k => k.startsWith('data-'))) } } },
  })
  const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); h.render() } }
  const child = name => h.find(n => n.type === name).props
  const root = () => h.all()[0].props
  const by = (key, value) => h.find(n => Object.hasOwn(n.props, key) && (value === undefined || n.props[key] === value))
  h.render(); await settle()
  const click = async (key, value) => { by(key, value).props.onClick(); await settle() }
  return { h, root, by, child, storage, storageWrites, frames, jobs, copies, legacy, files, images, focuses, settle, click,
    round: () => child('MenuRoundExclusions').state,
    async spinTo(index) {
      const count = options.props?.menuMode === false ? source.length : child('MenuRoundExclusions').state.items.length
      randomValue = ((.75 - fraction - (index + .5) / count) % 1 + 1) % 1
      const nextFraction = (fraction + randomValue) % 1
      by('id', 'roulette-spin').props.onClick(); await settle(); const frame = frames.at(-1)
      if (!frame?.active) throw new Error('No new animation frame')
      now += 4200; frame.active = false; frame.callback(now); fraction = nextFraction; await settle(); return frame
    },
    async start() { by('id', 'roulette-spin').props.onClick(); await settle(); return frames.at(-1) },
    async finish(frame) { now += 4200; frame.active = false; frame.callback(now); fraction = (fraction + randomValue) % 1; await settle() },
    async fire(job) { if (!job.interval) job.active = false; job.callback(now); await settle() },
    async tick(ms) { for (const job of [...jobs].filter(job => job.active && job.ms === ms)) { if (!job.interval) job.active = false; job.callback() } await settle() },
    async language(value) { locale = value; loadMessages(); await settle() }, label: key => key.split('.').reduce((v, k) => v[k], messages.decisionTools),
    async preset(name) { h.button(messages.decisionTools.presets[name]).props.onClick(); await settle() },
    clock(value) { now = value }, randomCalls: () => randomCalls,
    copy(value) { copyPort = value }, fallback(value) { legacyResult = value }, cleanup: () => h.cleanup(),
  }
}
