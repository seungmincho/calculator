import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixture, deferred, flush } from './regex-parent-harness.mjs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

// Reuse only controlled host/ports. No author test file or assertions are imported.
let groups = 0
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7)
async function check(name, run) { if (only && !name.includes(only)) return; await run(); groups++; console.log(`PASS ${name}`) }
const close = f => f.h.cleanup()
const changeField = (f, id, value) => { f.h.find(n => n.props?.id === id).props.onChange({ target: { value } }); f.h.render() }
const captureTimers = h => {
  const callbacks = [], schedule = h.context.setTimeout
  h.context.setTimeout = (callback, delay) => { callbacks.push({ callback, delay }); return schedule(callback, delay) }
  return callbacks
}

await check('initial user input beats deferred URL restoration; normal restore keeps foreign URL and history state', async () => {
  const url = 'https://toolhub.ai.kr/regex-extractor/?operation=extract&pattern=%255Cd%252B&input=url-old&flags=g&utm=x&utm=y#anchor'
  const f = await fixture({ url })
  try {
    const writes = [], original = f.h.window.history.replaceState
    f.h.window.history.state = { framework: 41 }
    f.h.window.history.replaceState = (state, title, href) => { writes.push({ state, href }); original(state, title, href) }
    assert.equal(writes.length, 0); changeField(f, 'regex-input', 'typed-before-restore'); f.start()
    assert.equal(f.workspace().draft.inputText, 'typed-before-restore')
    assert.deepEqual(f.h.window.location.searchParams.getAll('utm'), ['x', 'y']); assert.equal(f.h.window.location.hash, '#anchor')
    assert.ok(writes.every(entry => entry.state.framework === 41))
  } finally { close(f) }
  const normal = await fixture({ url })
  try { normal.h.replayEffects(); normal.start(); assert.equal(normal.workspace().draft.inputText, 'url-old'); assert.equal(normal.workspace().draft.pattern, '\\d+'); normal.edit({ inputText: 'after boot' }); normal.h.tick(0); assert.equal(normal.workspace().draft.inputText, 'after boot') }
  finally { close(normal) }
})

await check('single-space pattern is executable in all three operations, with literal outputs', async () => {
  const f = await fixture(); f.start()
  try {
    const expected = { extract: ' \n ', replace: 'a_b\nc_d', grep: 'a b\nc d' }
    for (const operation of ['extract', 'replace', 'grep']) {
      f.edit({ operation, pattern: ' ', flags: 'g', replacement: '_', inputText: 'a b\nc d\nplain' })
      f.h.tick(300); assert.equal(f.workspace().status, 'running'); await f.complete()
      assert.equal(f.workspace().completed.result.outputText, operation === 'replace' ? `${expected.replace}\nplain` : expected[operation])
    }
  } finally { close(f) }
})

await check('owned debounce callbacks cannot cancel a newer Worker or restart canceled/hidden work', async () => {
  const f = await fixture(); f.start(); const timers = captureTimers(f.h)
  try {
    f.edit({ pattern: '\\d', operation: 'extract', inputText: 'A1' }); const old = timers.find(timer => timer.delay === 300).callback
    f.edit({ inputText: 'B2' }); f.h.tick(300); const current = f.workers.at(-1), count = f.workers.length
    for (let i = 0; i < 5; i++) old()
    assert.equal(f.workers.length, count); assert.equal(current.terminated, undefined); await f.complete(current); assert.equal(f.workspace().completed.result.outputText, '2')
    f.edit({ inputText: 'C3' }); const canceled = timers.filter(timer => timer.delay === 300).at(-1).callback; f.workspace().cancel(); f.h.render(); canceled(); assert.equal(f.workers.length, count)
    f.edit({ inputText: 'D4' }); const hidden = timers.filter(timer => timer.delay === 300).at(-1).callback
    f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange'); f.h.render(); f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); hidden(); f.h.render()
    assert.equal(f.workers.length, count); assert.equal(f.workspace().status, 'canceled'); assert.equal(f.workspace().completed.result.outputText, '2')
    f.workspace().retry(); f.h.render(); assert.equal(f.workers.length, count + 1); await f.complete(); assert.equal(f.workspace().completed.result.outputText, '4')
  } finally { close(f) }
})

await check('main cancel, hidden and pagehide abort pending file input without late restart', async () => {
  for (const stop of ['cancel', 'hidden', 'pagehide']) {
    const f = await fixture(); f.start()
    try {
      await f.run({ pattern: '\\d', operation: 'extract', inputText: 'saved7' }); const count = f.workers.length
      f.workspace().upload({ size: 8 }); f.h.render(); const reader = f.files.at(-1), late = reader.onload
      assert.equal(f.workspace().reading, true)
      if (stop === 'cancel') f.workspace().cancel()
      else if (stop === 'hidden') { f.h.document.visibilityState = 'hidden'; f.h.document.dispatch('visibilitychange') }
      else f.h.window.dispatch('pagehide')
      f.h.render(); assert.equal(reader.aborted, true); assert.equal(f.workspace().reading, false)
      reader.result = 'late file9'; late(); f.h.render(); f.h.document.visibilityState = 'visible'; f.h.document.dispatch('visibilitychange'); f.h.tick(300)
      assert.equal(f.workspace().draft.inputText, 'saved7'); assert.equal(f.workspace().completed.result.outputText, '7'); assert.equal(f.workspace().status, 'canceled'); assert.equal(f.workers.length, count)
    } finally { close(f) }
  }
})

await check('last success owns full copy and actual UTF8 TXT while failed draft cannot save or share', async () => {
  const f = await fixture(); f.start()
  try {
    const original = '합성 😀 line\n'.repeat(6500)
    await f.run({ pattern: '[\\s\\S]+', operation: 'extract', inputText: original }); const completed = f.workspace().completed
    f.edit({ pattern: '[' }); f.h.tick(300); await f.complete(); assert.equal(f.workspace().error, 'invalidRegex'); assert.equal(f.workspace().completed.id, completed.id)
    f.h.find(n => n.props?.onSave).props.onSave(); f.workspace().copyLink(); assert.equal(f.saves.length, 0); assert.equal(f.copies.length, 0)
    f.workspace().copyOutput(); await flush(f.h); assert.equal(f.copies[0], original)
    f.workspace().download(); f.h.render(); assert.equal(await f.downloaded.blobs[0].text(), original); assert.equal(f.downloaded[0].filename, 'regex-extract-result.txt')
    const urls = [...f.downloaded.map(entry => entry.href)]; close(f); assert.deepEqual(f.revoked, urls)
  } finally { close(f) }
})

await check('history schema keeps original inputs/replacement/transform and truthful result count', async () => {
  const histories = [{ id: 'legacy', inputs: { operation: 'replace', pattern: '(a)', flags: '', replacement: '$1!' }, result: { inputText: 'aba', matches: [1, 2] } }]
  const f = await fixture({ histories }); f.start()
  try {
    f.h.find(n => n.type === 'History').props.onLoadHistory('legacy'); f.h.render(); f.h.tick(300); await f.complete()
    assert.equal(f.workspace().completed.result.outputText, 'a!ba'); assert.equal(f.workspace().draft.replacement, '$1!')
    f.h.find(n => n.props?.onSave).props.onSave(); f.h.render(); assert.equal(f.saves[0].inputs.flags, ''); assert.equal(f.saves[0].inputs.replacement, '$1!'); assert.equal(f.saves[0].result.inputText, 'aba'); assert.equal(f.saves[0].result.outputText, 'a!ba')
    await f.run({ pattern: '\\d', flags: 'g', operation: 'extract', inputText: '0123456789' }); f.h.find(n => n.props?.onSave).props.onSave()
    assert.equal(f.saves[1].result.matchCount, 10); assert.equal(f.saves[1].result.matches.length, 5); assert.equal(f.saves[1].inputs.transform, 'none')
    f.save(false); f.h.find(n => n.props?.onSave).props.onSave(); f.h.render(); assert.equal(f.h.find(n => n.props?.onSave).props.saveStatus, 'saveFailed')
  } finally { close(f) }
})

await check('smart actions supersede old work and preserve dedupe, literal separators and uppercase semantics', async () => {
  const f = await fixture(); f.start()
  const smart = name => { f.h.button(`smartModes.${name}.title`).props.onClick(); f.h.render(); f.h.button('smartMode.apply').props.onClick(); f.h.render() }
  try {
    f.edit({ pattern: '\\d', inputText: 'b2\na1\nb2\n', operation: 'extract' }); f.h.tick(300); const old = f.workers.at(-1), late = old.onmessage, request = old.request
    smart('removeDuplicates'); f.h.tick(300); await f.complete(); assert.equal(f.workspace().completed.result.outputText, 'b2\na1\n')
    late({ data: { id: request.id, revision: request.revision, ok: false, error: 'invalidRegex' } }); await flush(f.h); assert.equal(f.workspace().draft.transform, 'dedupe'); assert.equal(f.workspace().error, null)
    f.edit({ inputText: 'hi THERE 2go' }); smart('capitalizeWords'); f.h.tick(300); await f.complete(); assert.equal(f.workspace().completed.result.outputText, 'Hi THERE 2go')
    f.edit({ inputText: '::a#b## ::c##' }); f.h.button('smartModes.extractBetween.title').props.onClick(); f.h.render()
    f.h.find(n => n.type === 'input' && n.props['aria-label'] === 'smartModes.extractBetween.title').props.onChange({ target: { value: ':: ##' } }); f.h.render(); f.h.button('smartMode.apply').props.onClick(); f.h.render(); f.h.tick(300); await f.complete()
    assert.equal(f.workspace().completed.result.outputText, '::a#b##\n::c##'); f.edit({ replacement: 'ordinary' }); assert.equal(f.workspace().draft.transform, 'none')
  } finally { close(f) }
})

await check('output and link copy ownership is bidirectional; old reject/timer and input/locale ABA stay obsolete', async () => {
  const f = await fixture(); f.start(); const timers = captureTimers(f.h)
  try {
    await f.run({ pattern: '\\d', inputText: 'n8', operation: 'extract' })
    for (const [first, second] of [['copyOutput', 'copyLink'], ['copyLink', 'copyOutput']]) {
      const old = deferred(); f.native(() => old.promise); f.workspace()[first](); f.native(async () => {}); f.workspace()[second](); await flush(f.h)
      const token = f.workspace().feedback.token; old.reject(new Error('late refusal')); await flush(f.h); assert.equal(f.legacy.length, 0); assert.deepEqual(f.workspace().feedback.token, token)
    }
    const oldTimer = timers.filter(timer => timer.delay === 2000)[0].callback
    f.workspace().copyOutput(); await flush(f.h); oldTimer(); f.h.render(); assert.equal(f.workspace().feedback.status, 'copied')
    f.edit({ inputText: 'other9' }); f.edit({ inputText: 'n8' }); assert.equal(f.workspace().feedback, null)
    f.h.tick(300); await f.complete(); f.native(async () => { throw new Error('no') }); f.fallback(false); f.workspace().copyOutput(); await flush(f.h)
    assert.equal(f.workspace().feedback.status, 'failed'); assert.equal(f.workspace().feedback.text, '8'); f.locale('en'); f.locale('ko'); assert.equal(f.workspace().feedback, null)
    const pending = deferred(); f.native(() => pending.promise); f.workspace().copyOutput(); close(f); pending.reject(new Error('after unmount')); await flush(f.h); assert.equal(f.legacy.length, 1)
  } finally { close(f) }
})

await check('actual result child shows full recovery only explicitly, keeps previous snapshot and permits file cancel', async () => {
  const f = await fixture(); f.start()
  try {
    const original = 'q'.repeat(60001); await f.run({ pattern: 'q+', inputText: original, operation: 'extract' }); f.native(async () => { throw new Error('no') }); f.fallback(false); f.workspace().copyOutput(); await flush(f.h)
    const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch39/translations-regex.json', 'utf8'))
    for (const locale of ['ko', 'en']) {
      const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')); Object.assign(messages.regexExtractor, fragments[locale].regexExtractor)
      const h = await componentHarness('src/components/RegexResultPanel.tsx', { messages, props: { workspace: f.workspace(), onSave() {}, saveStatus: null } })
      try {
        h.render(); assert.equal(h.find(n => n.props?.['data-regex-output'] !== undefined).props.value.length, 50000); assert.equal(h.all().some(n => n.props?.id === 'regex-copy-manual'), false)
        h.button(messages.regexExtractor.execution.actions.openManual).props.onClick(); h.render(); assert.equal(h.find(n => n.props?.id === 'regex-copy-manual').props.value, original)
        f.workspace().upload({ size: 1 }); f.h.render(); h.setProps({ workspace: f.workspace(), onSave() {}, saveStatus: null }); assert.equal(h.find(n => n.props?.['data-regex-action'] === 'cancel').props.disabled, false)
      } finally { h.cleanup(); f.workspace().cancel(); f.h.render() }
    }
  } finally { close(f) }
})
console.log(`Regex independent parent: ${groups} groups passed; no native browser/OS clipboard claims`)
