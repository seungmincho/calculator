import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fixture } from './line-merge-parent-harness.mjs'
import { createWritingDiffHandoff } from '../../../src/utils/writingDiffHandoff.ts'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as merge from '../../../src/utils/lineMerge.ts'

const rawHandoff = () => JSON.stringify(createWritingDiffHandoff({ name: 'saved', title: 'left', sourceTab: 2, text: 'delivered old\r\nend' }, { title: 'right', sourceTab: 4, text: 'delivered new\nend' }))
const tests = []
const test = (name, run) => tests.push({ name, run })
const choose = (f, side, index) => { const p = f.panel(); if (index === undefined) p.onAll(p.document, side); else p.onChoose(p.document, p.document.blocks[index].id, side); f.h.render() }
const data = (f, key) => f.h.all().filter(node => Object.hasOwn(node.props ?? {}, key))
const messages = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch47/translations-line-merge.json', 'utf8'))
const child = async (entry, props, locale = 'ko', extra = {}) => {
  const h = await componentHarness(entry, { props, messages: messages[locale], modules: { '@/utils/lineMerge': merge }, ...extra }); h.render(); return h
}
const recovery = f => f.h.find(node => node.type === 'DiffCopyRecovery').props

test('pending handoff respects selection and both output targets', async () => {
  const observations = []
  for (const action of ['choose', 'merged-copy', 'merged-download', 'comparison-copy', 'comparison-download']) {
    const raw = rawHandoff(), f = await fixture({ raw, url: 'https://toolhub.ai.kr/diff-viewer/?from=writing-versions&keep=1#anchor' })
    try {
      const before = f.panel().document
      if (action === 'choose') choose(f, 'modified')
      else { const [target, verb] = action.split('-'); await f.output(target, verb) }
      f.h.tick(0); await f.settle()
      observations.push({ action, retained: data(f, 'data-writing-diff-handoff')[0]?.props['data-writing-diff-handoff'] === 'edited', rawPreserved: f.io.raw === raw, resultPreserved: f.h.all().some(node => node.type === 'LineMergePanel' && node.props.document === before), workers: f.workers.length })
    } finally { f.cleanup() }
  }
  if (process.argv.includes('--record-handoff')) {
    fs.writeFileSync(new URL('independent-parent-handoff-before-fix.json', import.meta.url), JSON.stringify(observations, null, 2) + '\n')
  }
  for (const observed of observations) assert.deepEqual(observed, { action: observed.action, retained: true, rawPreserved: true, resultPreserved: true, workers: 0 })
})

test('only new success resets choices and old document callbacks cannot change its successor', async () => {
  const f = await fixture()
  try {
    const left = 'start\nold one\nanchor\nold two\nend\n', right = 'start\nnew one\nanchor\nnew two\nend\n'
    await f.compare(left, right); choose(f, 'modified', 1)
    const first = f.panel(), expected = 'start\nold one\nanchor\nnew two\nend\n'
    assert.equal(first.output.text, expected)
    f.edit('left', 'draft edited'); assert.equal(f.panel().output, first.output); assert.equal(f.panel().stale, true)
    f.start(); choose(f, 'modified', 0); const chosenWhileRunning = f.panel().output
    const failed = f.workers.at(-1); failed.onerror({ preventDefault() {} }); await f.settle()
    assert.equal(f.panel().output, chosenWhileRunning)
    f.start(); const canceled = f.workers.at(-1), callback = canceled.onmessage
    f.click('workspace.cancel'); callback({ data: { id: canceled.posted.id, ok: true, result: { lines: [], summary: { added: 0, removed: 0, unchanged: 0 } } } }); await f.settle()
    assert.equal(f.panel().output, chosenWhileRunning); assert.equal(canceled.terminated, 1)
    await f.compare(left, right); const fresh = f.panel()
    assert.notEqual(fresh.document, first.document); assert.ok(fresh.document.id > first.document.id)
    assert.equal(fresh.output.text, left); assert.ok(fresh.output.choices.every(choice => choice.side === 'original'))
    first.onAll(first.document, 'modified'); first.onChoose(first.document, first.document.blocks[0].id, 'modified'); first.onCopy(first.output); first.onDownload(first.output); f.h.render()
    assert.equal(f.panel().output, fresh.output); assert.equal(f.io.copies.length, 0); assert.equal(f.io.downloads.length, 0)
    assert.equal(f.attr('id', 'diff-left').props.value, left); assert.equal(f.attr('id', 'diff-right').props.value, right)
  } finally { f.cleanup() }
})

test('actual client rejects source-content, summary, number and empty-array impostors', async () => {
  const f = await fixture()
  try {
    await f.compare('same\nold\n', 'same\nnew\n'); choose(f, 'modified'); const output = f.panel().output
    const incorrect = [
      { lines: [{ type: 'unchanged', content: 'forged', left: 1, right: 1 }], summary: { unchanged: 1, added: 0, removed: 0 } },
      { lines: [{ type: 'unchanged', content: 'exact', left: 1, right: 1 }], summary: { unchanged: 0, added: 0, removed: 0 } },
      { lines: [{ type: 'unchanged', content: 'exact', left: 2, right: 1 }], summary: { unchanged: 1, added: 0, removed: 0 } },
      { lines: [], summary: { unchanged: 0, added: 0, removed: 0 } },
    ]
    for (const result of incorrect) {
      f.edit('left', 'exact'); f.edit('right', 'exact'); f.start(); await f.succeed(result)
      assert.equal(f.panel().output, output); assert.ok(f.h.text().includes(f.label('workspace.errors.invalidResponse')))
      assert.equal(f.workers.at(-1).terminated, 1)
    }
    await f.compare('', ''); assert.equal(f.panel().output.lineCount, 0)
    await f.compare('\r\n', '\n'); assert.equal(f.panel().output.lineCount, 2); assert.equal(f.panel().output.text, '\n')
  } finally { f.cleanup() }
})

test('two-MiB selected output and empty output stay whole while actual child preview is bounded', async () => {
  const f = await fixture()
  try {
    const a = 'a'.repeat(1048575), b = 'b'.repeat(1048575)
    await f.compare(`${a}\n`, `\n${b}`); assert.equal(f.panel().document.blocks.length, 2)
    choose(f, 'modified', 1); const p = f.panel(), expected = `${a}\n\n${b}`
    assert.equal(p.output.text, expected); assert.equal(p.output.bytes, 2097152)
    const h = await child('src/components/LineMergePanel.tsx', p)
    assert.equal(h.all().filter(node => node.props?.['data-line-merge-row']).length, 3)
    const preview = h.find(node => Object.hasOwn(node.props ?? {}, 'data-line-merge-preview'))
    assert.ok(JSON.stringify(preview).length < 10000); h.cleanup()
    await f.output('merged'); await f.output('merged', 'download')
    assert.equal(f.io.copies.at(-1).text, expected); assert.equal(await f.io.downloads.at(-1).blob.text(), expected)
    assert.equal(f.io.downloads.at(-1).blob.size, 2097152); assert.equal(f.io.downloads.at(-1).filename, 'toolhub-merged-document.txt')
    await f.compare('remove all', ''); choose(f, 'modified'); await f.output('merged'); await f.output('merged', 'download')
    assert.equal(f.io.copies.at(-1).text, ''); assert.equal(f.io.downloads.at(-1).blob.size, 0)
    const rows = Array.from({ length: 603 }, (_, i) => `same ${i}`).join('\n')
    await f.compare(rows, rows); const page = await child('src/components/LineMergePanel.tsx', f.panel())
    assert.equal(page.all().filter(node => node.props?.['data-line-merge-row']).length, 200)
    page.find(node => Object.hasOwn(node.props ?? {}, 'data-line-merge-result-next')).props.onClick(); page.render()
    assert.equal(page.all().find(node => node.props?.['data-line-merge-row'])?.props['data-line-merge-row'], 201)
    page.cleanup(); await f.output('merged', 'download'); assert.equal(await f.io.downloads.at(-1).blob.text(), rows)
  } finally { f.cleanup() }
})

test('comparison and merged copy or download invalidate each older clipboard target', async () => {
  for (const first of ['merged', 'comparison']) for (const second of ['merged', 'comparison']) for (const verb of ['copy', 'download']) {
    const f = await fixture()
    try {
      await f.compare('x\nold', 'x\nnew'); choose(f, 'modified')
      f.io.mode = 'pending'; await f.output(first); const older = f.io.copies.at(-1)
      f.io.mode = 'success'; await f.output(second, verb); const count = f.io.copies.length
      older.reject(new Error('old denied')); await f.settle()
      assert.equal(f.io.legacy.length, 0); assert.equal(f.io.copies.length, count)
      assert.equal(f.h.all().some(node => node.type === 'DiffCopyRecovery'), false)
      assert.ok(data(f, 'data-diff-output-status')[0]); assert.ok(f.h.text().includes(f.label(`output.${second}`)))
      if (verb === 'download') assert.equal(await f.io.downloads.at(-1).blob.text(), second === 'merged' ? 'x\nnew' : '  x\n- old\n+ new')
    } finally { f.cleanup() }
  }
})

test('input, choice and locale ABA cannot revive pending fallback, feedback or old export closures', async () => {
  for (const mode of ['input', 'choice', 'locale']) {
    const f = await fixture()
    try {
      await f.compare('old', 'new'); const first = f.panel()
      f.io.mode = 'pending'; await f.output('merged'); const pending = f.io.copies.at(-1)
      if (mode === 'input') { f.edit('left', 'other'); f.edit('left', 'old') }
      else if (mode === 'choice') { choose(f, 'modified'); choose(f, 'original') }
      else { await f.localeTo('en'); await f.localeTo('ko') }
      pending.reject(new Error('late')); await f.settle(); assert.equal(f.io.legacy.length, 0)
      assert.equal(data(f, 'data-diff-output-status').length, 0); assert.equal(f.h.all().some(node => node.type === 'DiffCopyRecovery'), false)
      if (mode !== 'input') { first.onCopy(first.output); first.onDownload(first.output); await f.settle(); assert.equal(f.io.copies.length, 1); assert.equal(f.io.downloads.length, 0) }
      f.io.mode = 'success'; await f.output('merged'); assert.equal(data(f, 'data-diff-output-status').length, 1)
      if (mode === 'locale') { await f.localeTo('en'); await f.localeTo('ko') }
      else { f.edit('left', 'again'); f.edit('left', 'old') }
      f.h.tick(2000); assert.equal(data(f, 'data-diff-output-status').length, 0)
    } finally { f.cleanup() }
  }
})

test('full manual failure is explicit, readonly, recoverable and stale retry or close cannot own new output', async () => {
  const f = await fixture()
  try {
    const text = `${'한글😀'.repeat(20000)}\nlast`
    await f.compare(text, text); f.io.mode = 'failed'; await f.output('merged')
    const old = recovery(f); assert.equal(old.state.text, text)
    let field
    const h = await child('src/components/DiffCopyRecovery.tsx', old, 'en', { beforeEffects(tree) {
      const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; if (node.type === 'textarea') { field = { focus() { throw new Error('focus blocked') }, select() {}, setSelectionRange() {} }; node.props.ref.current = field }; walk(node.props?.children) }; walk(tree)
    } })
    assert.equal(h.all().some(node => node.type === 'textarea'), false)
    h.find(node => Object.hasOwn(node.props ?? {}, 'data-diff-copy-expand')).props.onClick(); h.render()
    const manual = h.find(node => node.type === 'textarea'); assert.equal(manual.props.value, text); assert.equal(manual.props.readOnly, true)
    h.find(node => Object.hasOwn(node.props ?? {}, 'data-diff-copy-select')).props.onClick(); h.render()
    assert.ok(h.text().includes(messages.en.diffViewer.output.selectionFailed)); h.cleanup()
    f.io.mode = 'success'; old.onRetry(old.state.token); await f.settle(); assert.equal(f.io.copies.at(-1).text, text)
    await f.output('comparison'); const copied = f.io.copies.length
    old.onRetry(old.state.token); old.onClose(old.state.token); await f.settle()
    assert.equal(f.io.copies.length, copied); assert.equal(data(f, 'data-diff-output-status').length, 1)
  } finally { f.cleanup() }
})

test('normal handoff replay consumes once, getter edit preserves raw, and unmount invalidates old exports', async () => {
  const raw = rawHandoff(), f = await fixture({ raw, url: 'https://toolhub.ai.kr/diff-viewer/?from=writing-versions' })
  try {
    f.h.replayEffects(); f.h.tick(0); await f.settle()
    assert.equal(f.io.removed, 1); assert.equal(f.io.raw, null); assert.equal(f.workers.length, 0)
    assert.equal(f.attr('id', 'diff-left').props.value, 'delivered old\r\nend'); assert.equal(f.attr('id', 'diff-right').props.value, 'delivered new\nend')
    assert.equal(f.h.all().some(node => node.type === 'LineMergePanel'), false)
    f.start(); await f.succeed(); const p = f.panel(); assert.equal(p.output.text, 'delivered old\nend')
    f.io.mode = 'pending'; await f.output('merged'); const pending = f.io.copies.at(-1)
    f.cleanup(); pending.reject(new Error('late unmount')); await f.settle()
    p.onCopy(p.output); p.onDownload(p.output); await f.settle(); assert.equal(f.io.legacy.length, 0); assert.equal(f.io.copies.length, 1); assert.equal(f.io.downloads.length, 0)
  } finally { f.cleanup() }
  const g = await fixture({ raw, url: 'https://toolhub.ai.kr/diff-viewer/?from=writing-versions' })
  try {
    let reads = 0
    g.h.window.sessionStorage.getItem = () => { if (++reads === 2) choose(g, 'modified'); return raw }
    const before = g.panel().document; g.h.tick(0); await g.settle()
    assert.equal(g.io.removed, 0); assert.equal(g.io.raw, raw); assert.equal(g.panel().document, before)
    assert.equal(g.panel().output.text, before.right); assert.equal(g.workers.length, 0)
  } finally { g.cleanup() }
})

let passed = 0
for (const { name, run } of tests) {
  const match = process.argv.find(arg => arg.startsWith('--match='))?.slice(8)
  if (match && !new RegExp(match).test(name)) continue
  if (process.argv.includes('--handoff-only') && !name.startsWith('pending handoff')) continue
  if (process.argv.includes('--without-handoff') && (name.startsWith('pending handoff') || name.startsWith('normal handoff'))) continue
  await run(); passed++; console.log(`PASS ${name}`)
}
console.log(`Independent parent groups: ${passed}`)
