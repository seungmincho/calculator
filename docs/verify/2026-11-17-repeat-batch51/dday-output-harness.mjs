import fs from 'node:fs'
import { webcrypto } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

export const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const merge = (a, b) => { for (const [key, value] of Object.entries(b)) { if (value && typeof value === 'object' && !Array.isArray(value)) merge(a[key] ??= {}, value); else a[key] = value } return a }
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
const flush = () => new Promise(resolve => setImmediate(resolve))
export async function ddayHost({ saved = [], url = 'https://toolhub.ai.kr/dday-calculator/?mode=dday&date=2028-02-29&title=TEST-A', locale = 'ko' } = {}) {
  const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch51/translations-dday.json', 'utf8')), messages = {}
  const io = { locale, clipboard: 'resolve', fallback: false, hash: 'resolve', image: 'resolve', urlFail: false, clickFail: false, selectionFail: false }
  const loadMessages = () => Object.assign(messages, merge(JSON.parse(fs.readFileSync(`messages/${io.locale}.json`, 'utf8')), fragments[io.locale])); loadMessages()
  const storage = new Map([['dday-saved', typeof saved === 'string' ? saved : JSON.stringify(saved)]]), writes = [], copies = [], legacy = [], hashJobs = [], copyJobs = [], imageJobs = [], files = [], urls = [], revoked = [], selections = []
  let field, cal = null, share = null, recovery = null, live = true
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-17T00:00:00Z'])) } static now() { return Date.parse('2026-11-17T00:00:00Z') } }
  class FilePort extends Blob { constructor(parts, name, options) { super(parts, options); this.name = name } }
  class UrlPort extends URL { static createObjectURL(blob) { if (io.urlFail) throw new Error('blocked URL'); const url = `blob:dday-${urls.length}`; urls.push({ url, blob }); return url } static revokeObjectURL(url) { revoked.push(url) } }
  const globals = { Date: ClockDate, URL: UrlPort, File: FilePort, crypto: { subtle: { digest(...args) { if (io.hash === 'wait') { const gate = deferred(); hashJobs.push(gate); return gate.promise.then(() => webcrypto.subtle.digest(...args)) } return webcrypto.subtle.digest(...args) } } } }
  const document = { activeElement: null, body: { appendChild() {}, removeChild() {} }, createElement(tag) {
    if (tag === 'textarea') { field = { value: '', style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }; return field }
    const anchor = { click() { if (io.clickFail) throw new Error('blocked click'); files.push({ name: anchor.download, href: anchor.href }) }, remove() {} }; return anchor
  }, execCommand() { legacy.push(field.value); if (io.fallback === 'throw') throw new Error('fallback blocked'); return io.fallback } }
  const navigator = { clipboard: { writeText(text) { copies.push(text); if (io.clipboard === 'wait') { const job = deferred(); copyJobs.push(job); return job.promise } return io.clipboard === 'reject' ? Promise.reject(new Error('clipboard rejected')) : Promise.resolve() } } }
  const contextModule = { '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) } }
  const common = { messages, document, navigator, globals }
  const h = await componentHarness('src/components/DdayCalculator.tsx', { ...common, url,
    storagePort: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes.push([key, value]); storage.set(key, value) } },
    modules: { ...contextModule, '@/components/DdayCalendarExport': { __esModule: true, default: 'CalendarExport' }, '@/components/DdayCopyRecovery': { __esModule: true, default: 'CopyRecovery' }, '@/components/GuideSection': { __esModule: true, default: 'Guide' }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' } } })
  const sharedTranslation = namespace => { const t = (key, vars = {}) => key.split('.').reduce((value, part) => value[part], messages[namespace]).replace(/\{(\w+)\}/g, (_all, name) => vars[name] ?? `{${name}}`); return t }
  async function sync() {
    if (!live) return
    h.render()
    for (const name of ['CalendarExport', 'ShareResult', 'CopyRecovery']) {
      const props = h.all().find(node => node.type === name)?.props, previous = name === 'CalendarExport' ? cal : name === 'ShareResult' ? share : recovery
      if (!props) { previous?.cleanup(); if (name === 'CalendarExport') cal = null; else if (name === 'ShareResult') share = null; else recovery = null; continue }
      if (previous) { previous.setProps(props); continue }
      let instance
      if (name === 'CalendarExport') instance = await componentHarness('src/components/DdayCalendarExport.tsx', { ...common, props, modules: contextModule })
      else if (name === 'ShareResult') instance = await componentHarness('src/components/ShareResult.tsx', { ...common, props, modules: { '@/lib/i18n/shared': { useTranslations: sharedTranslation }, '@/utils/shareCard': { renderShareCard: async () => { if (io.image === 'wait') { const gate = deferred(); imageJobs.push(gate); await gate.promise } return new Blob(['controlled PNG'], { type: 'image/png' }) } } } })
      else instance = await componentHarness('src/components/DdayCopyRecovery.tsx', { ...common, props, beforeEffects(tree) { for (const node of all(tree)) if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() { if (io.selectionFail) throw new Error('selection blocked') }, setSelectionRange(start, end) { selections.push([start, end]) } } } })
      instance.render(); if (name === 'CalendarExport') cal = instance; else if (name === 'ShareResult') share = instance; else recovery = instance
    }
  }
  const settle = async (passes = 6) => { for (let i = 0; i < passes; i++) { await flush(); await sync() } }
  await settle()
  const node = (host, attr, value = '') => host.find(n => n.props[attr] === value)
  return { h, io, storage, writes, copies, legacy, hashJobs, copyJobs, imageJobs, files, urls, revoked, selections, settle,
    get cal() { return cal }, get share() { return share }, get recovery() { return recovery }, node,
    async copy() { node(h, 'data-dday-copy').props.onClick(); await settle() },
    async edit(id, value) { h.find(n => n.props.id === id).props.onChange({ target: { value } }); await settle() },
    async mode(value) { h.all().filter(n => n.props.role === 'tab')[['dday', 'anniv', 'diff', 'add'].indexOf(value)].props.onClick(); await settle() },
    async export() { node(cal, 'data-dday-calendar-download').props.onClick(); await settle() },
    async shareAction(action) { h.find(n => Object.hasOwn(n.props, 'data-dday-share')).props.onClickCapture(); node(share, 'data-share-action', action).props.onClick(); await settle() },
    async language(value) { io.locale = value; loadMessages(); await settle() },
    cleanup() { live = false; h.cleanup(); cal?.cleanup(); share?.cleanup(); recovery?.cleanup() },
  }
}
