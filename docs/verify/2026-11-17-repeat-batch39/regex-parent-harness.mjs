import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createRegexClient } from '../../../src/lib/regex/client.ts'
import { executeRegexJob } from '../../../src/utils/regexEngine.ts'
import * as protocol from '../../../src/lib/regex/protocol.ts'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export const flush = async h => { for (let i = 0; i < 10; i++) await Promise.resolve(); h.render() }
export async function fixture(options = {}) {
  // Mock only hooks that the actual integration modules export.
  assert.match(readFileSync('src/lib/i18n.ts', 'utf8'), /export function useTranslations\b/)
  assert.match(readFileSync('src/contexts/LanguageContext.tsx', 'utf8'), /export const useOptionalLanguage\b/)
  const workers = [], files = [], copies = [], saves = [], downloaded = [], revoked = [], legacy = []
  let locale = 'ko', saveOk = true, native = async () => undefined, fallback = true
  const tr = key => key
  tr.raw = () => []
  class Field { style = {}; value = ''; isConnected = true; focus() {} select() {} setSelectionRange() {} remove() {} click() { downloaded.push({ href: this.href, filename: this.download }) } }
  class Reader { result = null; abort() { this.aborted = true } readAsText(file) { this.file = file; files.push(this) } }
  class ObjectURL extends URL { static createObjectURL(blob) { const href = `blob:regex-${downloaded.length}`; downloaded.blobs ??= []; downloaded.blobs.push(blob); return href } static revokeObjectURL(value) { revoked.push(value) } }
  const history = { histories: options.histories ?? [], saveCalculation(inputs, result) { saves.push({ inputs, result }); return saveOk }, removeHistory() {}, clearHistories() {}, loadFromHistory(id) { return history.histories.find(entry => entry.id === id)?.inputs ?? null } }
  const h = await componentHarness('src/components/RegexExtractor.tsx', {
    url: options.url ?? 'https://toolhub.ai.kr/regex-extractor/?foreign=one&foreign=two#keep',
    navigator: { clipboard: { writeText(text) { copies.push(text); return native(text) } } },
    document: { activeElement: new Field(), body: { appendChild() {} }, createElement: () => new Field(), execCommand() { legacy.push(true); return fallback } },
    globals: { FileReader: Reader, HTMLElement: Field, URL: ObjectURL },
    modules: {
      '@/lib/i18n': { useTranslations: () => tr },
      '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: locale, isInitialized: true, changeLanguage() {} }) },
      '@/hooks/useCalculationHistory': { useCalculationHistory: () => history },
      '@/lib/regex/protocol': protocol,
      './CalculationHistory': { __esModule: true, default: 'History' },
      './MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
      '@/lib/regex/client': { createRegexClient: () => createRegexClient({ timeoutMs: 60_000, createWorker() { const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage(request) { this.request = request }, terminate() { this.terminated = (this.terminated ?? 0) + 1 } }; workers.push(worker); return worker } }) },
    },
  })
  const workspace = () => h.find(node => node.props?.workspace).props.workspace
  const edit = (patch, preserve = false) => { workspace().edit(patch, preserve); h.render() }
  const complete = async (worker = workers.at(-1)) => {
    const { id, revision, job } = worker.request
    try { worker.onmessage?.({ data: { id, revision, ok: true, result: executeRegexJob(job) } }) } catch (cause) { worker.onmessage?.({ data: { id, revision, ok: false, error: cause.code } }) }
    await flush(h)
  }
  const run = async patch => { if (patch) edit(patch); h.tick(300); await complete() }
  h.render()
  return { h, workspace, edit, complete, run, workers, files, copies, saves, downloaded, revoked, legacy, history,
    start() { h.tick(0) }, locale(value) { locale = value; h.render() }, save(value) { saveOk = value }, native(value) { native = value }, fallback(value) { fallback = value },
  }
}
