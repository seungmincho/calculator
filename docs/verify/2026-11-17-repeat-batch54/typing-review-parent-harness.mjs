import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as review from '../../../src/utils/typingReview.ts'

export const HISTORY_KEY = 'typing-test-history-v2', DAILY_KEY = 'typing-test-daily-v1'
const EPOCH = Date.parse('2026-11-17T03:00:00Z')
const charts = Object.fromEntries(['LineChart', 'Line', 'XAxis', 'YAxis', 'CartesianGrid', 'Tooltip', 'ResponsiveContainer'].map(name => [name, `chart:${name}`]))
export async function parentFixture({ query = 'mode=short&lang=en&i=0', historyLength = 1, reviewPort = review } = {}) {
  const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch54/translations-typing-review.json', 'utf8'))
  const loadMessages = locale => { const value = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')); Object.assign(value.typingTest, fragments[locale].typingTest); return value }
  const messages = loadMessages('ko'), stored = new Map([[HISTORY_KEY, JSON.stringify(Array.from({ length: historyLength }, (_, i) => ({ ts: EPOCH - i * 1000, lang: 'ko', mode: 'short', speed: 100, acc: 100 })))], [DAILY_KEY, '{}']])
  const writes = [], timers = [], focuses = [], initial = JSON.stringify([...stored]); let now = 1000, serial = 0, standardReview = null, customReview = null
  class ClockDate extends Date { constructor(value) { super(value === undefined ? EPOCH + now : value) } static now() { return EPOCH + now } }
  const globals = { Date: ClockDate, performance: { now: () => now }, setInterval(callback, ms) { const item = { id: ++serial, callback, ms, active: true }; timers.push(item); return item.id }, clearInterval(id) { const item = timers.find(timer => timer.id === id); if (item) item.active = false } }
  const storagePort = { getItem: key => stored.get(key) ?? null, setItem(key, value) { stored.set(key, value); writes.push([key, value]) } }
  const beforeEffects = source => tree => { const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; if (node.type === 'textarea' && node.props.ref) node.props.ref.current = { focus() { focuses.push(source) } }; walk(node.props?.children) }; walk(tree) }
  const modules = { '@/utils/typingReview': reviewPort, '@/components/TypingMistakePractice': { __esModule: true, default: 'ReviewBoundary' }, '@/components/CustomTypingWorkspace': { __esModule: true, default: 'CustomBoundary' }, recharts: charts }
  const p = await componentHarness('src/components/TypingTest.tsx', { messages, globals, storagePort, modules, beforeEffects: beforeEffects('standard'), url: `https://toolhub.ai.kr/typing-test/?${query}#kept` })
  p.render(); p.tick(0)
  const customProps = () => p.find(node => node.type === 'CustomBoundary').props
  const c = await componentHarness('src/components/CustomTypingWorkspace.tsx', { props: customProps(), messages, globals, storagePort, modules, beforeEffects: beforeEffects('custom') }); c.render()
  const bind = async (host, existing, origin) => {
    const props = host.all().find(node => node.type === 'ReviewBoundary')?.props
    if (!props) { existing?.cleanup(); return null }
    if (existing) { existing.setProps(props); return existing }
    const instance = await componentHarness('src/components/TypingMistakePractice.tsx', { props, messages, globals, storagePort, modules: { '@/utils/typingReview': review }, beforeEffects: beforeEffects(origin) }); instance.render(); return instance
  }
  const sync = async () => { p.render(); c.setProps(customProps()); standardReview = await bind(p, standardReview, 'standard-review'); customReview = await bind(c, customReview, 'custom-review') }
  const has = (node, key) => Object.hasOwn(node.props ?? {}, key)
  const attr = (host, key) => host.find(node => has(node, key))
  const standard = () => attr(p, 'data-standard-input'), custom = key => attr(c, 'data-custom-' + key)
  await sync()
  return { p, c, messages, stored, writes, initial, timers, focuses, sync, standard, custom,
    get standardReview() { return standardReview }, get customReview() { return customReview },
    snapshot(origin = 'standard') { return (origin === 'custom' ? c : p).find(node => node.type === 'ReviewBoundary').props.snapshot },
    async mode(mode) { p.find(node => node.props['data-typing-mode'] === mode).props.onClick(); await sync() },
    async input(value, composing = false) { standard().props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); await sync() },
    async end(value) { standard().props.onCompositionEnd({ currentTarget: { value } }); await sync() },
    target() { return p.find(node => node.type === 'div' && node.props.lang && node.props.className?.includes('cursor-text')).props.children.map(node => node.props.children).join('') },
    async draft(value) { custom('draft').props.onChange({ target: { value } }); await sync() },
    async apply() { custom('apply').props.onClick(); await sync() },
    async customType(value, composing = false) { custom('input').props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); await sync() },
    async customEnd(value) { custom('input').props.onCompositionEnd({ currentTarget: { value } }); await sync() },
    async advance(ms) { now += ms; timers.filter(timer => timer.active).forEach(timer => timer.callback()); await sync() },
    async locale(locale) { Object.assign(messages, loadMessages(locale)); await sync() },
    reviewAttr(origin, key) { return attr(origin === 'custom' ? customReview : standardReview, 'data-typing-review-' + key) },
    async choose(origin, index = 0) { const host = origin === 'custom' ? customReview : standardReview, snapshot = (origin === 'custom' ? c : p).find(node => node.type === 'ReviewBoundary').props.snapshot; host.find(node => node.type === 'input' && node.props.value === snapshot.fragments[index].id).props.onChange({ target: { checked: true } }); host.render(); await sync() },
    async reviewClick(origin, key) { const host = origin === 'custom' ? customReview : standardReview; attr(host, 'data-typing-review-' + key).props.onClick(); host.render(); await sync() },
    async reviewType(origin, value, composing = false) { const host = origin === 'custom' ? customReview : standardReview; attr(host, 'data-typing-review-input').props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); host.render(); await sync() },
    cleanup() { standardReview?.cleanup(); customReview?.cleanup(); c.cleanup(); p.cleanup() },
  }
}
