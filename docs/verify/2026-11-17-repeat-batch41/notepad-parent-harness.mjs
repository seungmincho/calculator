import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { webcrypto } from 'node:crypto'

// Actual parent, workspace hook and all persistence/import/draft/handoff code stay bundled.
// Extend only the generic React host; browser layout and native locks remain verifier work.
const path = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
let source = fs.readFileSync(path, 'utf8')
const anchor = '    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },'
if (!source.includes(anchor)) throw new Error('Shared host anchor changed')
source = source.replace('    useMemo(factory, deps)', '    useDeferredValue(value) { return value },\n    useMemo(factory, deps)')
source = source.replace(anchor, `    replayEffects() {
      for (const [index] of effects) hooks[index].cleanup?.()
      for (const [index, pending] of effects) hooks[index].cleanup = pending.effect()
      return render()
    },\n` + anchor)
const m = { exports: {} }
vm.runInThisContext('(function(require,module,exports){\n' + source + '\n})')(createRequire(path), m, m.exports)
const { componentHarness, all } = m.exports

export const NOTES = 'toolhub-notepad-notes', SETTINGS = 'toolhub-notepad-settings'
export const note = (id = 'a', content = '합성 원고\n둘째 줄', patch = {}) => ({ id, title: id, content, createdAt: 1, updatedAt: 2, ...patch })
export const plain = value => JSON.parse(JSON.stringify(value))
export const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
export async function settle(h) { for (let i = 0; i < 12; i++) await Promise.resolve(); h.render() }

export async function notepadHost(options = {}) {
  const values = options.values ?? new Map([[NOTES, JSON.stringify(options.notes ?? [note()])]])
  const writes = [], downloads = [], revoked = [], urls = new Map(), targets = [], timerCallbacks = []
  let serial = 0, locale = 'ko', quotaKey = null, readKey = null, unknownKey = null, afterWrite = false, blockPopup = false
  const focused = { current: null }
  const storage = {
    getItem(key) { if (key === readKey || (key === unknownKey && afterWrite)) throw new Error('read blocked'); return values.get(key) ?? null },
    setItem(key, raw) { if (key === quotaKey) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); writes.push([key, raw]); values.set(key, raw); afterWrite = true },
  }
  const pending = [], lockNames = []
  let hold = false
  const navigator = { userAgent: 'Windows', locks: { request(key, config, action) {
    lockNames.push(key)
    if (!hold) return Promise.resolve().then(() => { config.signal?.throwIfAborted(); return action() })
    return new Promise((resolve, reject) => pending.push({ config, action, resolve, reject }))
  } } }
  const release = () => { const item = pending.shift(); if (!item) throw new Error('No pending lock'); try { item.config.signal?.throwIfAborted(); item.resolve(item.action()) } catch (error) { item.reject(error) } }
  class Field {
    constructor() { this.value = ''; this.isConnected = true; this.selectionStart = 0; this.selectionEnd = 0 }
    focus() { focused.current = this }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end }
    setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); this.selectionStart = this.selectionEnd = start + text.length }
    closest(selector) { return selector === '[data-keep-escape]' && this.editor ? this : null }
    click() { if (this.download) downloads.push({ name: this.download, blob: urls.get(this.href) }) }
    remove() {}
  }
  const editor = new Field(), find = new Field(), file = new Field(), focus = new Field(); editor.editor = true
  class OwnedURL extends URL {
    static createObjectURL(blob) { const id = 'blob:notepad-' + ++serial; urls.set(id, blob); return id }
    static revokeObjectURL(id) { revoked.push(id); urls.delete(id) }
  }
  const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch41/translations-notepad.json', 'utf8'))
  const messages = Object.fromEntries(['ko', 'en'].map(lang => [lang, { ...JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')).notepad, ...fragments[lang].notepad }]))
  const translations = Object.fromEntries(['ko', 'en'].map(lang => {
    const get = key => key.split('.').reduce((value, k) => value?.[k], messages[lang])
    const t = (key, vars = {}) => { const value = get(key); if (typeof value !== 'string') throw new Error('Missing: ' + key); return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) }; t.raw = get; return [lang, t]
  }))
  const h = await componentHarness('src/components/Notepad.tsx', {
    storagePort: storage, navigator,
    modules: { '@/lib/i18n': { useTranslations: namespace => { if (namespace !== 'notepad') throw new Error(namespace); return translations[locale] } } },
    globals: { AbortController, crypto: webcrypto, URL: OwnedURL, HTMLElement: Field, Element: Field },
    document: { body: { appendChild() {} }, createElement: () => new Field(), execCommand: () => false },
    window: { open() { if (blockPopup) return null; const stored = new Map(); const target = { stored, opener: {}, sessionStorage: { setItem: (k, v) => stored.set(k, v), getItem: k => stored.get(k) ?? null }, location: { replace(url) { target.url = url } }, close() { target.closed = true } }; targets.push(target); return target } },
    beforeEffects(tree) {
      for (const node of all(tree)) {
        const p = node.props
        if (!p?.ref) continue
        const host = Object.hasOwn(p, 'data-notepad-content') ? editor : Object.hasOwn(p, 'data-notepad-file') ? file : node.type === 'input' ? find : focus
        p.ref.current = host; if (p.value !== undefined) host.value = p.value
      }
    },
  })
  const nativeSet = h.context.setTimeout
  h.context.setTimeout = (callback, ms) => { timerCallbacks.push({ callback, ms }); return nativeSet(callback, ms) }
  const by = (name, value) => h.find(node => Object.hasOwn(node.props, 'data-notepad-' + name) && (value === undefined || node.props['data-notepad-' + name] === value))
  const recovery = () => h.find(node => node.props.view?.notes && node.props.onKeepBoth).props
  const input = (name, value) => { by(name).props.onChange({ target: { value } }); h.render() }
  const click = (name, value) => { const result = by(name, value).props.onClick(); h.render(); return result }
  h.render()
  return Object.assign(h, { values, writes, downloads, revoked, urls, targets, timerCallbacks, by, recovery, input, click, editor, file, focus, findField: find,
    view: () => recovery().view, boot: () => h.tick(0), release, pending, lockNames,
    faults(patch) { if ('quotaKey' in patch) quotaKey = patch.quotaKey; if ('readKey' in patch) readKey = patch.readKey; if ('unknownKey' in patch) unknownKey = patch.unknownKey; if ('afterWrite' in patch) afterWrite = patch.afterWrite; if ('blockPopup' in patch) blockPopup = patch.blockPopup },
    hold(value = true) { hold = value }, getFocus: () => focused.current,
    locale(value) { locale = value; h.render() }, t: key => translations[locale](key),
    import(files) { file.value = 'selected'; const result = by('file').props.onChange({ target: { files } }); h.render(); return result },
    external(raw, key = NOTES) { if (raw === null) values.delete(key); else values.set(key, raw); h.window.dispatch('storage', { key }); h.render() },
  })
}
