import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

export const flatten = value => typeof value === 'string' || typeof value === 'number' ? String(value) : !value ? '' : Array.isArray(value) ? value.map(flatten).join('') : flatten(value.props?.children)
export const find = (h, key, value) => h.find(node => value === undefined ? Object.hasOwn(node.props, key) : node.props[key] === value)
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const turn = () => new Promise(resolve => setImmediate(resolve))
function merge(base, patch) { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }

export async function percentParent({ url = 'https://toolhub.ai.kr/percent-calculator/', hydrated = true, restore = true } = {}) {
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/translations-percent.json', 'utf8'))
  const messages = Object.fromEntries(['ko', 'en'].map(locale => [locale, merge(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch[locale])]))
  let locale = 'ko', activeElement = null, timeoutId = 0, blobId = 0, recovery = null, clipboard = 'success', legacy = false, clickFails = false, selectionFails = false
  const copies = [], fallbacks = [], downloads = [], microtasks = [], timeouts = new Map(), oldTimeouts = [], created = new Map(), revoked = [], historyWrites = [], storageWrites = []
  const focusElement = value => { activeElement = value }
  class Element {
    constructor(tag) { this.tag = tag; this.style = {}; this.value = ''; this.selectionStart = 0; this.selectionEnd = 0 }
    focus() { focusElement(this) }
    select() { if (selectionFails) throw Error('cannot select'); this.selectionStart = 0; this.selectionEnd = this.value.length }
    setSelectionRange(start, end) { if (selectionFails) throw Error('cannot select'); this.selectionStart = start; this.selectionEnd = end }
    remove() {}
    click() { if (clickFails) throw Error('blocked download'); downloads.push({ filename: this.download, blob: created.get(this.href), href: this.href }) }
  }
  class BrowserURL extends URL {
    static createObjectURL(blob) { const value = `blob:percent-independent-${++blobId}`; created.set(value, blob); return value }
    static revokeObjectURL(value) { revoked.push(value) }
  }
  const translated = namespace => {
    const raw = key => key.split('.').reduce((value, part) => value?.[part], messages[locale][namespace])
    const t = (key, vars = {}) => { const text = raw(key); if (typeof text !== 'string') throw Error(`missing ${locale}:${namespace}.${key}`); return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) }
    t.raw = raw; return t
  }
  const modules = { '@/lib/i18n': { useTranslations: translated }, '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: locale }) }, '@/components/GuideSection': { __esModule: true, default: 'GuidePort' } }
  const document = { createElement: tag => new Element(tag), body: { appendChild() {} }, execCommand(command) { if (command !== 'copy') throw Error('unexpected command'); fallbacks.push(activeElement?.value); return legacy } }
  Object.defineProperty(document, 'activeElement', { get: () => activeElement, enumerable: true })
  const common = { modules, document, navigator: { clipboard: { writeText(text) { const job = deferred(); copies.push({ ...job, text }); if (clipboard === 'success') job.resolve(); if (clipboard === 'reject') job.reject(Error('native blocked')); return job.promise } } },
    globals: { URL: BrowserURL, HTMLElement: Element, queueMicrotask: callback => microtasks.push(callback),
      setTimeout(callback, delay) { const id = ++timeoutId; timeouts.set(id, { callback, delay }); oldTimeouts.push({ callback, delay }); return id }, clearTimeout: id => timeouts.delete(id),
    }, storagePort: { getItem: () => null, setItem: (...args) => storageWrites.push(args), removeItem: (...args) => storageWrites.push(args) },
  }
  const p = await componentHarness('src/components/PercentCalculator.tsx', { ...common, url, hydrated })
  const historyState = { retained: { source: 52 } }
  p.window.history.state = historyState
  const replace = p.window.history.replaceState
  p.window.history.replaceState = (state, title, next) => { historyWrites.push({ state, url: String(next) }); p.window.history.state = state; replace(state, title, next) }
  p.render()
  const panelProps = () => p.find(node => typeof node.type === 'function' && node.type.name === 'PercentComparisonPanel').props
  const panel = await componentHarness('src/components/PercentComparisonPanel.tsx', { ...common, props: panelProps() })
  panel.render()
  async function sync() {
    await turn(); p.render(); panel.setProps(panelProps())
    const next = p.all().find(node => typeof node.type === 'function' && node.type.name === 'PercentCopyRecovery')
    if (!next) { recovery?.h.cleanup(); recovery = null; return }
    if (recovery?.key !== next.key) {
      recovery?.h.cleanup()
      const field = new Element('textarea')
      const h = await componentHarness('src/components/PercentCopyRecovery.tsx', { ...common, props: next.props,
        beforeEffects(tree) {
          const walk = node => { if (!node) return; if (Array.isArray(node)) return node.forEach(walk); if (!node.props) return; if (Object.hasOwn(node.props, 'data-percent-recovery-text')) { field.value = node.props.value; node.props.ref.current = field }; walk(node.props.children) }
          walk(tree)
        },
      })
      recovery = { key: next.key, h, field }; h.render()
    } else recovery.h.setProps(next.props)
  }
  const drain = async () => { for (let round = 0; round < 8; round++) { const pending = microtasks.splice(0); pending.forEach(callback => callback()); await sync(); if (!microtasks.length) break } }
  if (restore) await drain()
  return { p, panel, copies, fallbacks, downloads, created, revoked, historyWrites, historyState, storageWrites, oldTimeouts, timeouts, sync, drain,
    field: id => find(p, 'id', `pc-${id}`),
    async edit(id, value) { const field = find(p, 'id', `pc-${id}`); field.props.onChange(typeof field.type === 'function' ? value : { target: { value } }); await sync() },
    async click(key, value, child = false) { find(child ? panel : p, key, value).props.onClick(); await sync() },
    result: kind => flatten(find(p, 'data-percent-result', kind).props.children[1]),
    items: () => panelProps().items,
    recovery: () => recovery,
    clipboard(value) { clipboard = value }, legacy(value) { legacy = value }, clickFails(value) { clickFails = value }, selectionFails(value) { selectionFails = value },
    async locale(value) { locale = value; await sync() },
    async translationTitle(value) { messages[locale].percentCalculator.comparison.title = value; await sync() },
    async tick(delay) { for (const [id, timer] of [...timeouts]) if (timer.delay === delay) { timeouts.delete(id); timer.callback() }; await sync() },
    close() { recovery?.h.cleanup(); panel.cleanup(); p.cleanup() },
  }
}
