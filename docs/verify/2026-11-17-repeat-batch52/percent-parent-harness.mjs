import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

export const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
export const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children)
export function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/translations-percent.json', 'utf8'))
function messagesFor(language) { const messages = JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')); messages.percentCalculator.comparison = fragment[language].percentCalculator.comparison; Object.assign(messages.percentCalculator.errors, fragment[language].percentCalculator.errors); return messages }
export async function percentFixture({ url = 'https://toolhub.ai.kr/percent-calculator/', hydrated = true, settleInitial = true } = {}) {
  let language = 'ko', h, child, recovery, initialized = false
  const messages = messagesFor(language), copies = [], fallback = [], downloads = [], urls = new Map(), revoked = [], history = [], oldTimers = [], stored = []
  const io = { mode: 'success', legacy: false, selected: '', downloadThrow: false }
  class ObjectURL extends URL { static createObjectURL(blob) { const key = `blob:fixture-${urls.size}`; urls.set(key, blob); return key } static revokeObjectURL(url) { revoked.push(url) } }
  const navigator = { clipboard: { writeText(value) { const pending = deferred(); copies.push({ value, ...pending }); if (io.mode === 'throw') throw Error('sync denied'); if (io.mode === 'reject') return Promise.reject(Error('denied')); return io.mode === 'pending' ? pending.promise : Promise.resolve() } } }
  const document = { body: { appendChild() {} }, createElement(tag) { return { style: {}, value: '', readOnly: false, focus() {}, select() { io.selected = this.value }, setSelectionRange() {}, remove() {}, click() { if (io.downloadThrow) throw Error('download blocked'); downloads.push({ url: this.href, filename: this.download, blob: urls.get(this.href) }) }, tag } }, execCommand() { fallback.push(io.selected); if (io.legacy === 'throw') throw Error('legacy blocked'); return io.legacy } }
  const storage = { getItem() { return null }, setItem(...args) { stored.push(args) }, removeItem(...args) { stored.push(args) } }
  h = await componentHarness('src/components/PercentCalculator.tsx', { url, hydrated, messages, navigator, document, storagePort: storage, globals: { URL: ObjectURL },
    modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language }) }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' }, '@/components/PercentComparisonPanel': { __esModule: true, default: 'PercentComparisonPanel' }, '@/components/PercentCopyRecovery': { __esModule: true, default: 'PercentCopyRecovery' } },
    beforeEffects() { if (initialized) return; initialized = true; h.window.history.state = { __NA: true, custom: 'retain' }; const original = h.window.history.replaceState; h.window.history.replaceState = (state, title, next) => { history.push({ state, next }); h.window.history.state = state; original(state, title, next) } },
  })
  const timer = h.context.setTimeout
  h.context.setTimeout = (callback, delay) => { oldTimers.push({ callback, delay }); return timer(callback, delay) }
  const settle = async () => {
    for (let n = 0; n < 5; n++) { await Promise.resolve(); await Promise.resolve(); h.render() }
    const node = h.find(n => n.type === 'PercentComparisonPanel')
    if (!child) child = await componentHarness('src/components/PercentComparisonPanel.tsx', { props: node.props, messages })
    child.setProps(node.props); child.render()
    const failed = h.all().find(n => n.type === 'PercentCopyRecovery')
    if (failed) { if (!recovery || recovery.key !== failed.key) { recovery?.h.cleanup(); recovery = { key: failed.key, h: await componentHarness('src/components/PercentCopyRecovery.tsx', { props: failed.props, messages }) } }; recovery.h.setProps(failed.props); recovery.h.render() }
    else { recovery?.h.cleanup(); recovery = null }
  }
  h.render(); if (settleInitial) await settle()
  const node = id => h.find(n => n.props.id === 'pc-' + id)
  const attr = (name, value = '') => h.find(n => n.props['data-percent-' + name] === value)
  const panelAttr = (name, value = '') => child.find(n => n.props['data-percent-comparison-' + name] === value)
  return { h, io, navigator, messages, copies, fallback, downloads, urls, revoked, history, oldTimers, stored, node, attr, panelAttr, settle,
    get child() { return child }, get recovery() { return recovery?.h ?? null },
    get items() { return h.find(n => n.type === 'PercentComparisonPanel').props.items },
    section: id => attr('card', id), result: id => text(attr('result', id)),
    async field(id, value) { const field = node(id); field.props.onChange(typeof field.type === 'function' ? value : { target: { value } }); await settle() },
    async click(name, value = '') { attr(name, value).props.onClick(); await settle() },
    async panel(name, value = '') { panelAttr(name, value).props.onClick(); await settle() },
    async locale(value) { language = value; Object.assign(messages, messagesFor(language)); await settle() },
    async mountHydrated() { h.setHydrated(true); await settle() },
    cleanup() { recovery?.h.cleanup(); child?.cleanup(); h.cleanup() },
  }
}
