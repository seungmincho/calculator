import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createLineDiffClient } from '../../../src/lib/diff/client.ts'
import * as protocol from '../../../src/lib/diff/protocol.ts'
import * as merge from '../../../src/utils/lineMerge.ts'
import { compareTextLines } from '../../../src/utils/lineDiff.ts'

const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch47/translations-line-merge.json', 'utf8'))
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export async function fixture({ locale = 'ko', raw = null, url = 'https://toolhub.ai.kr/diff-viewer/?keep=1#result' } = {}) {
  const io = { locale, mode: 'success', fallback: false, legacy: [], copies: [], downloads: [], revoked: [], raw, removed: 0 }, workers = [], blobs = new Map()
  let sequence = 0, h
  const localized = name => { const value = JSON.parse(fs.readFileSync(`messages/${name}.json`, 'utf8')); Object.assign(value.diffViewer, fragment[name].diffViewer); return value }
  const messages = localized(locale)
  class PortURL extends URL {
    static createObjectURL(blob) { const id = `blob:merge-${++sequence}`; blobs.set(id, blob); return id }
    static revokeObjectURL(id) { io.revoked.push(id); blobs.delete(id) }
  }
  const storage = { getItem() { return io.raw }, setItem(_key, value) { io.raw = value }, removeItem() { io.raw = null; io.removed++ } }
  h = await componentHarness('src/components/TextDiffWorkspace.tsx', { url, messages, globals: { URL: PortURL }, window: { sessionStorage: storage }, storagePort: storage,
    modules: {
      '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: io.locale }) }, '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
      '@/components/LineMergePanel': { __esModule: true, default: 'LineMergePanel' }, '@/components/DiffCopyRecovery': { __esModule: true, default: 'DiffCopyRecovery' }, '@/utils/lineMerge': merge, '@/lib/diff/protocol': protocol,
      '@/lib/diff/client': { createLineDiffClient: () => createLineDiffClient({ createWorker() { const worker = { onmessage: null, onerror: null, onmessageerror: null, posted: null, terminated: 0, postMessage(value) { this.posted = value }, terminate() { this.terminated++ } }; workers.push(worker); return worker } }) },
    },
    navigator: { clipboard: { writeText(text) { const pending = deferred(); io.copies.push({ text, ...pending }); return io.mode === 'pending' ? pending.promise : io.mode === 'failed' ? Promise.reject(new Error('denied')) : Promise.resolve() } } },
    document: { body: { appendChild() {} }, createElement(tag) { if (tag === 'textarea') return { value: '', style: {}, readOnly: false, focus() { h.document.activeElement = this }, select() {}, setSelectionRange() {}, remove() {} }; assert.equal(tag, 'a'); return { href: '', download: '', click() { io.downloads.push({ filename: this.download, blob: blobs.get(this.href) }) }, remove() {} } }, execCommand() { io.legacy.push(h.document.activeElement?.value); return io.fallback } },
  }); h.render()
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); h.render() }
  const attr = (name, value = '') => h.find(node => node.props[name] === value)
  const panel = () => h.find(node => node.type === 'LineMergePanel').props
  const edit = (side, value) => { attr('id', `diff-${side}`).props.onChange({ target: { value } }); h.render() }
  const label = key => key.split('.').reduce((value, part) => value[part], messages.diffViewer)
  const button = key => h.button(label(key))
  const click = key => { const node = button(key); assert.ok(!node.props.disabled); node.props.onClick(); h.render() }
  const start = () => click(workers.at(-1)?.terminated === 0 ? 'workspace.compareAgain' : 'actions.compare')
  const succeed = async (value, worker = workers.at(-1)) => { const request = worker.posted; worker.onmessage?.({ data: { id: request.id, ok: true, result: value ?? compareTextLines(request.left, request.right) } }); await settle() }
  const compare = async (left, right) => { edit('left', left); edit('right', right); start(); await succeed() }
  const output = async (target, action = 'copy') => { if (target === 'merged') { const props = panel(); props[action === 'copy' ? 'onCopy' : 'onDownload'](props.output) } else attr('data-diff-output', `${action}-comparison`).props.onClick(); await settle() }
  const localeTo = async value => { io.locale = value; Object.assign(messages, localized(value)); h.render(); await settle() }
  return { h, io, workers, attr, panel, edit, click, start, succeed, compare, output, settle, localeTo, label, cleanup() { h.cleanup() } }
}
