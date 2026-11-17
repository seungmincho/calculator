// Actual component event checks; Worker, clipboard and download I/O are controlled.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs'
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function merge(base, patch) { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
async function fixture(messages) {
  const jobs = [], copies = [], downloads = [], anchors = []
  let canceled = 0, downloadFails = false
  const h = await componentHarness('src/components/TextDiffWorkspace.tsx', {
    messages,
    modules: {
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
      '@/lib/diff/client': { createLineDiffClient: () => ({ run(left, right) { const job = { ...deferred(), left, right }; jobs.push(job); return job.promise }, cancel() { canceled++ } }) },
      '@/lib/diff/clipboard': { copyDiffText(text, isCurrent) { const copy = { ...deferred(), text, isCurrent }; copies.push(copy); return copy.promise } },
    },
    globals: { URL: { createObjectURL(blob) { if (downloadFails) throw new Error('download unavailable'); downloads.push(blob); return 'blob:test' }, revokeObjectURL() {} } },
    document: { body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'a'); const anchor = { click() { anchor.clicked = true }, remove() { anchor.removed = true } }; anchors.push(anchor); return anchor } },
  })
  h.render()
  return Object.assign(h, { jobs, copies, downloads, anchors, canceled: () => canceled, failDownload() { downloadFails = true },
    edit(side, value) { h.find(node => node.props.id === `diff-${side}`).props.onChange({ target: { value } }); h.render() },
    click(label) { h.button(label).props.onClick(); h.render() },
    async settle(job, value, failed = false) { job[failed ? 'reject' : 'resolve'](value); await tick(); h.render() },
    input(side) { return h.find(node => node.props.id === `diff-${side}`).props.value },
  })
}
let passed = 0
async function check(name, action) { await action(); passed++; console.log(`PASS ${name}`) }
;(async () => {
  const { compareTextLines, formatTextDiff } = await import('../src/utils/lineDiff.ts')
  await check('initial example is useful and editing never starts background work', async () => {
    const h = await fixture(); assert.ok(h.text().includes('workspace.exampleNotice')); assert.equal(h.jobs.length, 0)
    h.edit('left', '새 원문'); assert.equal(h.jobs.length, 0); assert.ok(h.text().includes('workspace.staleExport'))
    h.click('actions.compare'); assert.equal(h.jobs[0].left, '새 원문'); assert.ok(h.text().includes('workspace.running')); h.cleanup()
  })
  await check('old completion and errors cannot replace or finish the latest comparison', async () => {
    const h = await fixture(); h.edit('left', '첫째'); h.edit('right', '첫째'); h.click('actions.compare')
    h.edit('left', '둘째'); h.edit('right', '둘째'); h.click('actions.compare')
    await h.settle(h.jobs[0], compareTextLines('첫째', '첫째')); assert.ok(h.text().includes('workspace.running')); assert.ok(!h.text().includes('workspace.errors'))
    await h.settle(h.jobs[1], compareTextLines('둘째', '둘째')); assert.ok(!h.text().includes('workspace.running')); assert.ok(!h.text().includes('workspace.staleExport')); assert.equal(h.input('left'), '둘째')
    h.click('actions.compare'); h.click('workspace.compareAgain'); await h.settle(h.jobs[2], new Error('old error'), true)
    assert.ok(h.text().includes('workspace.running')); assert.ok(!h.text().includes('workspace.errors')); h.cleanup()
  })
  await check('edit, swap, clear, cancel and unmount invalidate pending replies', async () => {
    for (const action of ['edit', 'swap', 'clear', 'cancel', 'unmount']) {
      const h = await fixture(); h.click('actions.compare')
      if (action === 'edit') h.edit('left', '계속 작성')
      else if (action === 'unmount') h.cleanup()
      else h.click(action === 'cancel' ? 'workspace.cancel' : `actions.${action}`)
      const before = h.text(); await h.settle(h.jobs[0], compareTextLines('OUTDATED', 'OUTDATED'))
      assert.equal(h.text(), before); assert.ok(!h.text().includes('OUTDATED')); assert.ok(h.canceled() > 0)
      if (action !== 'unmount') h.cleanup()
    }
  })
  await check('failed comparison preserves both inputs and old result, then supports retry', async () => {
    const h = await fixture(); h.edit('left', '실패 후 보존'); h.edit('right', '<script>alert(1)</script>'); h.click('actions.compare')
    await h.settle(h.jobs[0], new Error('worker unavailable'), true)
    assert.ok(h.text().includes('workspace.errors.workerFailed')); assert.ok(h.text().includes('workspace.staleExport')); assert.equal(h.input('left'), '실패 후 보존')
    h.click('actions.compare'); await h.settle(h.jobs[1], compareTextLines(h.input('left'), h.input('right')))
    assert.ok(!h.text().includes('workspace.errors')); assert.ok(h.text().includes('<script>alert(1)</script>')); assert.ok(!h.all().some(node => node.type === 'script')); h.cleanup()
  })
  await check('pagination/filter change displayed rows only; copy and TXT retain the full snapshot', async () => {
    const h = await fixture(); const left = Array.from({ length: 201 }, (_, i) => `줄 ${i}`).join('\n'), right = `${left}\n추가`
    h.edit('left', left); h.edit('right', right); h.click('actions.compare'); const result = compareTextLines(left, right)
    await h.settle(h.jobs[0], result); assert.equal(h.all().filter(node => node.props['data-diff-type']).length, 200)
    h.click('workspace.nextPage'); assert.equal(h.all().filter(node => node.props['data-diff-type']).length, 2)
    h.click('workspace.filter.changes'); assert.equal(h.all().filter(node => node.props['data-diff-type']).length, 1)
    h.click('actions.copyDiff'); assert.equal(h.copies[0].text, formatTextDiff(result)); await h.settle(h.copies[0], 'copied')
    h.edit('left', '아직 비교하지 않은 입력'); h.click('workspace.download'); assert.ok(h.text().includes('workspace.staleExport'))
    assert.equal(await h.downloads[0].text(), formatTextDiff(result)); assert.equal(h.anchors[0].download, 'toolhub-text-comparison.txt'); assert.ok(h.anchors[0].clicked && h.anchors[0].removed); h.cleanup()
  })
  await check('copy failure is read-only manual recovery and editing suppresses late success', async () => {
    const h = await fixture(); h.click('actions.copyDiff'); await h.settle(h.copies[0], 'failed')
    const field = h.find(node => node.props.id === 'diff-copy-fallback'); assert.equal(field.props.readOnly, true); assert.equal(field.props.value, h.copies[0].text)
    h.click('actions.copyDiff'); h.edit('right', '작성 중'); assert.equal(h.copies[1].isCurrent(), false); await h.settle(h.copies[1], 'copied')
    assert.ok(!h.text().includes('actions.copied')); assert.ok(!h.all().some(node => node.props.id === 'diff-copy-fallback')); h.cleanup()
  })
  await check('download failure is explicit and never discards the completed result', async () => {
    const h = await fixture(); h.failDownload(); h.click('workspace.download'); assert.ok(h.text().includes('workspace.downloadFailed'))
    assert.ok(!h.text().includes('workspace.downloadStarted')); assert.ok(h.all().some(node => node.props.id === 'diff-result')); h.click('actions.copyDiff'); assert.ok(h.copies[0].text.length > 0); h.cleanup()
  })
  await check('empty and unchanged results differ, and actual Korean/English patches cover both views', async () => {
    for (const language of ['ko', 'en']) {
      const messages = merge(JSON.parse(fs.readFileSync(`messages/${language}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch19/translations-diff.json', 'utf8'))[language])
      const h = await fixture(messages), t = messages.diffViewer
      h.edit('left', ''); h.edit('right', ''); h.click(t.actions.compare); await h.settle(h.jobs[0], compareTextLines('', ''))
      assert.ok(h.text().includes(t.workspace.bothEmpty)); h.edit('left', '같음'); h.edit('right', '같음'); h.click(t.actions.compare); await h.settle(h.jobs[1], compareTextLines('같음', '같음'))
      h.click(t.workspace.filter.changes); assert.ok(h.text().includes(t.workspace.noChanges)); assert.ok(!h.text().includes(t.workspace.bothEmpty)); h.cleanup()
    }
  })
  console.log(`Line diff actual component: ${passed} groups passed (controlled I/O; not a browser rendering test)`)
})().catch(error => { console.error(error); process.exitCode = 1 })
