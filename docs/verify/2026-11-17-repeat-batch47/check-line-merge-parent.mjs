import assert from 'node:assert/strict'
import { fixture } from './line-merge-parent-harness.mjs'
import { compareTextLines, formatTextDiff } from '../../../src/utils/lineDiff.ts'
import { createWritingDiffHandoff } from '../../../src/utils/writingDiffHandoff.ts'

let groups = 0
async function test(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log('PASS', name) }
await test('successful comparison owns default-original selection; only a new success resets choices', async () => {
  const f = await fixture(); assert.equal(f.panel().output.text, f.panel().document.left)
  await f.compare('a\nold\nanchor\ntail', 'a\nnew\nanchor\nextra\ntail'); const original = f.panel()
  original.onAll(original.document, 'modified'); f.h.render(); assert.equal(f.panel().output.text, 'a\nnew\nanchor\nextra\ntail')
  f.edit('right', 'new unconfirmed'); assert.equal(f.panel().stale, true); const chosen = f.panel().output
  f.start(); const active = f.workers.at(-1), oldMessage = active.onmessage; f.click('workspace.cancel'); oldMessage({ data: { id: active.posted.id, ok: true, result: compareTextLines(active.posted.left, active.posted.right) } }); await f.settle()
  assert.equal(f.panel().output, chosen); assert.ok(f.h.text().includes(f.label('workspace.canceled')))
  f.start(); await f.succeed(); assert.ok(f.panel().document.id > original.document.id); assert.equal(f.panel().output.text, 'a\nold\nanchor\ntail'); assert.equal(f.panel().stale, false)
  assert.equal(f.attr('id', 'diff-right').props.value, 'new unconfirmed'); f.cleanup()
})
await test('shape-valid wrong-source and omitted trailing-empty replies are rejected and previous selection is retained', async () => {
  const f = await fixture(); await f.compare('old', 'new'); let props = f.panel(); props.onAll(props.document, 'modified'); f.h.render(); props = f.panel()
  for (const pair of [['a\nb', 'a\nB', compareTextLines('x\nb', 'x\nB')], ['\n', '', compareTextLines('', '')]]) {
    f.edit('left', pair[0]); f.edit('right', pair[1]); f.start(); await f.succeed(pair[2])
    assert.equal(f.panel().output, props.output); assert.ok(f.h.text().includes(f.label('workspace.errors.invalidResponse'))); assert.equal(f.workers.at(-1).terminated, 1)
  }
  f.cleanup()
})
await test('all600 rows and exact2MiB merge reach full outputs regardless of comparison page or filter', async () => {
  const f = await fixture(), left = Array.from({ length: 600 }, (_, i) => `row${i}`).join('\n'), right = left.replace('row300', 'changed300')
  await f.compare(left, right); f.click('workspace.nextPage'); f.click('workspace.filter.changes'); await f.output('comparison', 'download')
  assert.equal(await f.io.downloads.at(-1).blob.text(), formatTextDiff(compareTextLines(left, right)))
  const a = 'a'.repeat(1048575) + '\n', b = '\n' + 'b'.repeat(1048575); await f.compare(a, b)
  let props = f.panel(); props.onChoose(props.document, props.document.blocks[1].id, 'modified'); f.h.render(); props = f.panel()
  assert.equal(props.output.bytes, 2097152); await f.output('merged'); await f.output('merged', 'download')
  assert.equal(f.io.copies.at(-1).text.length, 2097152); assert.equal(f.io.downloads.at(-1).blob.size, 2097152); assert.equal(await f.io.downloads.at(-1).blob.text(), a + b); f.cleanup()
})
await test('comparison and merged copy or TXT share one owner and suppress previous late fallbacks', async () => {
  for (const [from, to, action] of [['comparison', 'merged', 'copy'], ['merged', 'comparison', 'copy'], ['comparison', 'merged', 'download'], ['merged', 'comparison', 'download'], ['comparison', 'comparison', 'download'], ['merged', 'merged', 'download']]) {
    const f = await fixture(); f.io.mode = 'pending'; await f.output(from); const old = f.io.copies.at(-1)
    f.io.mode = 'success'; await f.output(to, action); old.reject(new Error('late')); await f.settle(); assert.equal(f.io.legacy.length, 0)
    assert.equal(f.h.all().some(node => node.type === 'DiffCopyRecovery'), false); assert.ok(f.attr('data-diff-output-status')); f.cleanup()
  }
})
await test('input/selection/new compare/localeABA/replay/unmount cancel pending copy without discarding drafts', async () => {
  for (const boundary of ['input', 'selection', 'compare', 'locale', 'replay', 'unmount']) {
    const f = await fixture(); f.io.mode = 'pending'; await f.output('merged'); const old = f.io.copies.at(-1)
    if (boundary === 'input') f.edit('left', 'latest input')
    if (boundary === 'selection') { const p = f.panel(); p.onAll(p.document, 'modified'); f.h.render() }
    if (boundary === 'compare') f.start()
    if (boundary === 'locale') { await f.localeTo('en'); await f.localeTo('ko') }
    if (boundary === 'replay') f.h.replayEffects()
    if (boundary === 'unmount') f.cleanup()
    old.reject(new Error('late')); if (boundary !== 'unmount') await f.settle(); else await new Promise(resolve => setImmediate(resolve))
    assert.equal(f.io.legacy.length, 0); if (boundary !== 'unmount') { assert.equal(f.h.all().some(node => node.type === 'DiffCopyRecovery'), false); f.cleanup() }
  }
})
await test('copy failure exposes exact immutable text and manual retry/close belongs only to current output', async () => {
  const f = await fixture(); await f.compare('first\r\n\r\nlast\n', 'changed\r\n\r\nlast\n'); f.io.mode = 'failed'; await f.output('merged')
  const failure = f.h.find(node => node.type === 'DiffCopyRecovery').props; assert.equal(failure.state.text, 'first\n\nlast\n'); assert.equal(f.io.legacy.length, 1)
  f.io.mode = 'success'; failure.onRetry(failure.state.token); await f.settle(); assert.ok(f.attr('data-diff-output-status'))
  f.io.mode = 'failed'; await f.output('comparison'); const next = f.h.find(node => node.type === 'DiffCopyRecovery').props; failure.onClose(failure.state.token); f.h.render()
  assert.equal(f.h.find(node => node.type === 'DiffCopyRecovery').props.state.token, next.state.token); assert.equal(next.state.text, formatTextDiff(compareTextLines('first\n\nlast\n', 'changed\n\nlast\n'))); f.cleanup()
})
await test('old document/result handlers cannot apply after same-source recomparison or languageABA; empty output is deliberate', async () => {
  const f = await fixture(); await f.compare('', 'new'); const old = f.panel(); await f.compare('', 'new'); const current = f.panel()
  old.onAll(old.document, 'modified'); old.onCopy(old.output); f.h.render(); assert.equal(f.panel().output, current.output); assert.equal(f.io.copies.length, 0)
  const oldLocale = f.panel(); await f.localeTo('en'); await f.localeTo('ko'); oldLocale.onAll(oldLocale.document, 'modified'); oldLocale.onCopy(oldLocale.output); f.h.render(); assert.equal(f.panel().output.text, ''); assert.equal(f.io.copies.length, 0)
  await f.output('merged'); await f.output('merged', 'download'); assert.equal(f.io.copies[0].text, ''); assert.equal(f.io.downloads[0].blob.size, 0)
  f.click('actions.clear'); assert.equal(f.h.all().some(node => node.type === 'LineMergePanel'), false); assert.equal(f.attr('id', 'diff-left').props.value, ''); f.cleanup()
})
await test('writing handoff clears example merge without autoWorker; pending user edits preserve both handoff and draft', async () => {
  const raw = JSON.stringify(createWritingDiffHandoff({ name: 'Saved', title: 'one', sourceTab: 1, text: 'saved\n' }, { title: 'two', sourceTab: 2, text: 'current\n' }))
  for (const dirty of [false, true]) {
    const f = await fixture({ raw, url: 'https://toolhub.ai.kr/diff-viewer/?from=writing-versions&keep=1#result' })
    if (dirty) f.edit('left', 'manual edit')
    f.h.tick(0); await f.settle(); assert.equal(f.workers.length, 0)
    if (dirty) { assert.equal(f.io.raw, raw); assert.equal(f.attr('id', 'diff-left').props.value, 'manual edit'); assert.ok(f.panel()); assert.ok(f.attr('data-writing-diff-handoff', 'edited')) }
    else { assert.equal(f.io.removed, 1); assert.equal(f.h.all().some(node => node.type === 'LineMergePanel'), false); assert.equal(f.attr('id', 'diff-left').props.value, 'saved\n'); f.start(); await f.succeed(); assert.equal(f.panel().output.text, 'saved\n') }
    assert.equal(f.h.window.location.search, '?from=writing-versions&keep=1'); f.cleanup()
  }
})
console.log(JSON.stringify({ groups, actualParent: true, actualClient: true, controlledIO: true, nativeBrowser: false }))
