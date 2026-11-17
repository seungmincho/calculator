import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixture, deferred, flush } from './regex-parent-harness.mjs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

let groups = 0
async function check(label, fn) { if (process.argv[2] && !label.includes(process.argv[2])) return; await fn(); groups++; console.log(`PASS ${label}`) }

await check('initial URL, Strict replay, explicit empty flags, unknown query/hash/state and external restore', async () => {
  const f = await fixture({ url: 'https://toolhub.ai.kr/regex-extractor/?operation=replace&pattern=%255Cd%252B&input=A12&replacement=%24%26!&flags=&foreign=1&foreign=2#keep' })
  try {
    const original = f.h.window.location.href; f.h.window.history.state = { marker: 7 }
    const writes = [], replace = f.h.window.history.replaceState
    f.h.window.history.replaceState = (state, title, url) => { writes.push({ state, url }); replace(state, title, url) }
    assert.equal(f.workspace().ready, false); assert.equal(f.h.window.location.href, original)
    f.h.replayEffects(); f.start(); assert.equal(writes.length, 1)
    assert.deepEqual(writes[0].state, { marker: 7 }); assert.equal(f.workspace().draft.flags, '')
    await f.run(); assert.equal(f.workspace().completed.result.outputText, 'A12!')
    f.edit({ inputText: 'B3' }); assert.deepEqual(f.h.window.location.searchParams.getAll('foreign'), ['1', '2']); assert.equal(f.h.window.location.hash, '#keep')
    const revision = f.workspace().revision; f.h.window.history.replaceState(null, '', '#other'); f.h.window.dispatch('popstate'); f.h.render(); assert.equal(f.workspace().revision, revision)
    f.h.window.history.replaceState(null, '', '?pattern=%25ZZ&input=late&flags=&foreign=z#next'); f.h.window.dispatch('popstate'); f.h.render()
    assert.equal(f.workspace().draft.pattern, '%ZZ'); assert.ok(f.workspace().warnings.includes('malformedEncoding'))
  } finally { f.h.cleanup() }
})
await check('real client settles only newest request; explicit cancel and hidden/pagehide never auto-resume', async () => {
  const f = await fixture(); f.start()
  try {
    f.edit({ pattern: '\\d+', inputText: 'old1', operation: 'extract' }); f.h.tick(300)
    const old = f.workers.at(-1), oldMessage = old.onmessage, oldRequest = old.request
    f.edit({ inputText: 'new2' }); assert.equal(old.terminated, 1); f.h.tick(300); await f.complete()
    oldMessage({ data: { ...oldRequest, ok: false, error: 'invalidRegex' } }); await flush(f.h); assert.equal(f.workspace().completed.result.outputText, '2')
    f.edit({ inputText: 'new3' }); f.workspace().cancel(); f.h.render(); f.h.tick(300); assert.equal(f.workspace().status, 'canceled'); assert.equal(f.workers.length, 2)
    f.workspace().retry(); f.h.render(); const hiddenWorker = f.workers.at(-1)
    f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange'); f.h.render(); assert.equal(hiddenWorker.terminated, 1)
    f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); f.h.tick(300); assert.equal(f.workspace().status, 'canceled'); assert.equal(f.workers.length, 3)
    f.workspace().retry(); f.h.render(); f.h.window.dispatch('pagehide'); f.h.render(); assert.equal(f.workers.at(-1).terminated, 1); assert.equal(f.workspace().completed.result.outputText, '2')
  } finally { f.h.cleanup() }
})
await check('smart handlers dedupe supersedes queued regex, capitalization and literal multi-delimiter', async () => {
  const f = await fixture(); f.start()
  try {
    f.edit({ pattern: '\\d+', operation: 'extract', inputText: 'a1\na1\nb2' }); f.h.tick(300); const old = f.workers.at(-1)
    const smart = label => { f.h.button(`smartModes.${label}.title`).props.onClick(); f.h.render(); f.h.button('smartMode.apply').props.onClick(); f.h.render() }
    smart('removeDuplicates'); assert.equal(old.terminated, 1); await f.run(); assert.equal(f.workspace().completed.result.outputText, 'a1\nb2'); assert.equal(f.workspace().draft.transform, 'dedupe')
    f.edit({ inputText: 'hello world' }); smart('capitalizeWords'); await f.run(); assert.equal(f.workspace().completed.result.outputText, 'Hello World')
    f.edit({ inputText: '[[a]b]] [[c]]' }); f.h.button('smartModes.extractBetween.title').props.onClick(); f.h.render()
    f.h.find(n => n.type === 'input' && n.props['aria-label'] === 'smartModes.extractBetween.title').props.onChange({ target: { value: '[[ ]]' } }); f.h.render(); f.h.button('smartMode.apply').props.onClick(); f.h.render(); await f.run()
    assert.equal(f.workspace().completed.result.outputText, '[[a]b]]\n[[c]]')
    f.edit({ replacement: 'plain' }); assert.equal(f.workspace().draft.transform, 'none')
  } finally { f.h.cleanup() }
})
await check('last success survives invalid regex/empty pattern; empty output and full count/history snapshots', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ operation: 'extract', pattern: '\\d', inputText: '0123456789' }); assert.equal(f.workspace().completed.result.matchCount, 10); assert.equal(f.workspace().completed.result.details.length, 5)
    f.h.find(n => n.props?.onSave).props.onSave(); f.h.render(); assert.equal(f.saves[0].result.matchCount, 10); assert.equal(f.saves[0].inputs.matchCount, 10)
    f.edit({ pattern: '[' }); await f.run(); assert.equal(f.workspace().error, 'invalidRegex'); assert.equal(f.workspace().current, false); assert.equal(f.workspace().completed.result.matchCount, 10)
    f.h.find(n => n.props?.onSave).props.onSave(); assert.equal(f.saves.length, 1)
    f.edit({ pattern: '' }); assert.equal(f.workspace().status, 'idle'); assert.equal(f.workspace().completed.result.matchCount, 10)
    await f.run({ pattern: 'z', inputText: 'abc' }); assert.equal(f.workspace().current, true); assert.equal(f.workspace().completed.result.outputText, '')
    f.save(false); f.h.find(n => n.props?.onSave).props.onSave(); f.h.render(); assert.equal(f.h.find(n => n.props?.onSave).props.saveStatus, 'saveFailed')
  } finally { f.h.cleanup() }
})
await check('long URL removes every owned key; smaller input restores exact share snapshot and old history flags/replacement', async () => {
  const f = await fixture({ histories: [{ id: 'old', inputs: { operation: 'replace', pattern: 'a', flags: '', replacement: '%' }, result: { inputText: 'aa', matches: [1,2] } }] }); f.start()
  try {
    f.edit({ pattern: 'a', inputText: 'a'.repeat(17_000) }); assert.equal(f.workspace().url.kind, 'tooLong')
    for (const key of ['operation','pattern','flags','replacement','input','transform']) assert.equal(f.h.window.location.searchParams.has(key), false)
    assert.equal(f.h.window.location.hash, '#keep'); assert.deepEqual(f.h.window.location.searchParams.getAll('foreign'), ['one','two'])
    f.h.find(n => n.type === 'History').props.onLoadHistory('old'); f.h.render(); await f.run(); assert.equal(f.workspace().completed.result.outputText, '%a'); assert.equal(f.workspace().draft.flags, ''); assert.equal(f.workspace().url.kind, 'ready')
    assert.equal(f.h.find(n => n.type === 'History').props.formatResult({ matchCount: 23, matches: [1] }), 'execution.historyMatches')
  } finally { f.h.cleanup() }
})
await check('latest FileReader selection/edit wins; limits and failures preserve input; same input file reset', async () => {
  const f = await fixture(); f.start()
  try {
    f.edit({ inputText: 'keep' }); f.workspace().upload({ size: 10 }); f.h.render(); const first = f.files.at(-1), oldLoad = first.onload
    f.workspace().upload({ size: 20 }); f.h.render(); const second = f.files.at(-1); assert.equal(first.aborted, true)
    first.result = 'old'; oldLoad(); f.h.render(); assert.equal(f.workspace().draft.inputText, 'keep')
    second.result = 'latest'; second.onload(); f.h.render(); assert.equal(f.workspace().draft.inputText, 'latest')
    f.workspace().upload({ size: 20 }); const third = f.files.at(-1); f.edit({ inputText: 'typed' }); third.result = 'late'; third.onload(); f.h.render(); assert.equal(f.workspace().draft.inputText, 'typed')
    f.workspace().upload({ size: 4 * 1024 * 1024 + 1 }); f.h.render(); assert.equal(f.workspace().fileError, 'fileTooLarge')
    f.workspace().upload({ size: 20 }); const huge = f.files.at(-1); huge.result = 'x'.repeat(1_000_001); huge.onload(); f.h.render(); assert.equal(f.workspace().fileError, 'inputTooLarge'); assert.equal(f.workspace().draft.inputText, 'typed')
    const input = f.h.find(n => n.props?.['data-regex-file'] !== undefined), target = { files: [{ size: 3 }], value: 'same.txt' }; input.props.onChange({ target }); assert.equal(target.value, '')
    f.h.cleanup(); const unmounted = f.files.at(-1); unmounted.result = 'unmounted'; unmounted.onload()
  } finally { f.h.cleanup() }
})
await check('copy/link ownership, failed legacy recovery, selection throw, input/locale ABA and result completion', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: '\\d', operation: 'extract', inputText: 'a1' })
    const pending = deferred(); f.native(() => pending.promise); f.workspace().copyOutput(); f.h.render()
    f.native(async () => undefined); f.workspace().copyLink(); await flush(f.h); assert.equal(f.workspace().feedback.status, 'copied')
    pending.reject(new Error('old')); await flush(f.h); assert.equal(f.legacy.length, 0); assert.ok(f.copies.at(-1).startsWith('https://'))
    f.edit({ inputText: 'a2' }); f.edit({ inputText: 'a1' }); assert.equal(f.workspace().feedback, null)
    await f.run(); f.native(async () => { throw new Error('denied') }); f.fallback(false); f.workspace().copyOutput(); await flush(f.h); assert.equal(f.workspace().feedback.status, 'failed'); assert.equal(f.workspace().feedback.text, '1')
    f.workspace().select({ focus() { throw new Error('selection') } }); f.h.render(); assert.equal(f.workspace().feedback.status, 'selectionFailed')
    f.locale('en'); f.locale('ko'); assert.equal(f.workspace().feedback, null)
    const oldCopy = deferred(); f.native(() => oldCopy.promise); f.workspace().copyOutput(); f.edit({ inputText: 'a3' }); await f.run(); oldCopy.resolve(); await flush(f.h); assert.equal(f.workspace().feedback, null)
  } finally { f.h.cleanup() }
})
await check('TXT contains full previous snapshot; URL revoked and no stale save', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: 'x+', operation: 'extract', inputText: 'x'.repeat(60_000) }); f.edit({ inputText: 'current' }); f.workspace().download(); f.h.render()
    assert.equal(await f.downloaded.blobs[0].text(), 'x'.repeat(60_000)); assert.equal(f.downloaded[0].filename, 'regex-extract-result.txt'); assert.equal(f.workspace().current, false)
    f.h.tick(1000); assert.equal(f.revoked.length, 1)
  } finally { f.h.cleanup() }
})
await check('actual result panel KO/EN preview/empty/previous/copy recovery text and tokens', async () => {
  const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch39/translations-regex.json','utf8'))
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: 'x+', operation: 'extract', inputText: 'x'.repeat(60_000) }); f.edit({ inputText: 'new' })
    for (const locale of ['ko','en']) {
      const canonical = JSON.parse(fs.readFileSync(`messages/${locale}.json`,'utf8'))
      canonical.regexExtractor.execution = fragment[locale].regexExtractor.execution
      const child = await componentHarness('src/components/RegexResultPanel.tsx', { messages: canonical, props: { workspace: f.workspace(), onSave() {}, saveStatus: null } })
      try { child.render(); assert.equal(child.find(n => n.props?.['data-regex-output'] !== undefined).props.value.length, 50_000); assert.ok(child.find(n => n.props?.['data-regex-previous'] !== undefined)); assert.equal(child.find(n => n.props?.['data-regex-action'] === 'link').props.disabled, true) } finally { child.cleanup() }
    }
  } finally { f.h.cleanup() }
})
await check('history.replaceState failure blocks both rendered and captured link action, next edit recovers', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: 'a', inputText: 'a' }); const oldLink = f.workspace().copyLink
    const replace = f.h.window.history.replaceState; f.h.window.history.replaceState = () => { throw new Error('blocked') }
    await f.run({ inputText: 'aa' }); assert.equal(f.workspace().url.kind, 'writeFailed'); oldLink(); await flush(f.h); assert.equal(f.copies.length, 0)
    f.h.window.history.replaceState = replace; await f.run({ inputText: 'aaa' }); assert.equal(f.workspace().url.kind, 'ready'); f.workspace().copyLink(); await flush(f.h); assert.ok(f.copies.at(-1).includes('input=aaa'))
  } finally { f.h.cleanup() }
})
await check('previous-result copy started during computation cannot report success beside a new completion', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: '\\d', operation: 'extract', inputText: '1' }); f.edit({ inputText: '2' }); f.h.tick(300)
    const waiting = deferred(); f.native(() => waiting.promise); f.workspace().copyOutput(); await f.complete(); waiting.resolve(); await flush(f.h)
    assert.equal(f.workspace().completed.result.outputText, '2'); assert.equal(f.workspace().feedback, null)
  } finally { f.h.cleanup() }
})
await check('large manual recovery is explicitly opened and retains the complete text', async () => {
  const f = await fixture(); f.start()
  try {
    await f.run({ pattern: 'x+', operation: 'extract', inputText: 'x'.repeat(60_000) }); f.native(async () => { throw new Error('denied') }); f.fallback(false); f.workspace().copyOutput(); await flush(f.h)
    const child = await componentHarness('src/components/RegexResultPanel.tsx', { props: { workspace: f.workspace(), onSave() {}, saveStatus: null } })
    try {
      child.render(); assert.equal(child.all().some(n => n.props?.id === 'regex-copy-manual'), false)
      child.button('execution.actions.openManual').props.onClick(); child.render(); assert.equal(child.find(n => n.props?.id === 'regex-copy-manual').props.value.length, 60_000)
    } finally { child.cleanup() }
  } finally { f.h.cleanup() }
})
await check('boundary fixes preserve early edits, run literal spaces, and cancel pending files on stop/hide/pagehide', async () => {
  const f = await fixture({ url: 'https://toolhub.ai.kr/regex-extractor/?pattern=%255Cd%252B&input=url-old&flags=g&foreign=keep#hash' })
  try {
    const field = f.h.find(n => n.props?.id === 'regex-input'); assert.notEqual(field.props.disabled, true)
    const original = f.h.window.location.href; field.props.onChange({ target: { value: 'typed-before-restore 7' } }); f.h.render()
    assert.equal(f.h.window.location.href, original); assert.equal(f.workspace().ready, false)
    f.start(); assert.equal(f.workspace().draft.inputText, 'typed-before-restore 7'); assert.equal(f.workspace().draft.pattern, '\\d+'); await f.run(); assert.equal(f.workspace().completed.result.outputText, 'typed-before-restore 7')
    await f.run({ pattern: ' ', operation: 'extract', inputText: 'a b' }); assert.equal(f.workspace().completed.result.outputText, ' ')
    for (const action of ['cancel','visibilitychange','pagehide']) {
      f.workspace().upload({ size: 12 }); f.h.render(); const file = f.files.at(-1), count = f.workers.length
      const child = await componentHarness('src/components/RegexResultPanel.tsx', { props: { workspace: f.workspace(), onSave() {}, saveStatus: null } })
      try { child.render(); assert.equal(child.find(n => n.props?.['data-regex-action'] === 'cancel').props.disabled, false) } finally { child.cleanup() }
      if (action === 'cancel') f.workspace().cancel()
      else if (action === 'visibilitychange') { f.h.document.visibilityState = 'hidden'; f.h.document.dispatch(action) }
      else f.h.window.dispatch(action)
      f.h.render(); assert.equal(file.aborted, true); assert.equal(f.workspace().reading, false)
      file.result = 'file late'; file.onload(); f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); f.h.tick(300)
      assert.equal(f.workspace().draft.inputText, 'a b'); assert.equal(f.workers.length, count); assert.equal(f.workspace().status, 'canceled'); assert.equal(f.workspace().completed.result.outputText, ' ')
    }
    f.workspace().retry(); f.h.render(); await f.complete(); assert.equal(f.workspace().status, 'complete')
  } finally { f.h.cleanup() }
})
console.log(`Regex parent: ${groups} groups passed`)
