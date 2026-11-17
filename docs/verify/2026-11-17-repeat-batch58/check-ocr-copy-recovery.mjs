import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch58/translations-ocr-output.json', 'utf8'))
const results = []
async function test(name, run) { await run(); results.push({ name, pass: true }) }
async function fixture(locale = 'ko') {
  const failure = Object.freeze({ text: '  한글 😀\n'.repeat(8000), label: locale === 'ko' ? '전체 결과' : 'All results' })
  const io = { active: failure, retries: [], closed: [], selects: [], focus: null, select: null, throws: false }
  const props = { failure, isCurrent: candidate => io.active === candidate, onRetry: value => io.retries.push(value), onClose: value => io.closed.push(value) }
  const h = await componentHarness('src/components/OcrCopyRecovery.tsx', { props, messages: fragment[locale], beforeEffects(tree) {
    const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk)
      if (node.props?.['data-ocr-copy-manual']) node.props.ref.current = { focus() { io.focus?.(); if (io.throws) throw new Error('selection denied') }, select() { io.select?.() }, setSelectionRange(start, end) { io.selects.push({ start, end }) } }
      walk(node.props?.children)
    }; walk(tree)
  } }); h.render()
  const by = key => h.find(node => Object.hasOwn(node.props ?? {}, key))
  const click = key => { by(key).props.onClick(); h.render() }
  return { h, io, props, failure, by, click, close() { h.cleanup() } }
}
await test('full Unicode text is rendered only after explicit expansion, without truncation', async () => {
  for (const locale of ['ko', 'en']) { const f = await fixture(locale); try {
    assert.equal(f.h.all().filter(node => node.type === 'textarea').length, 0)
    f.click('data-ocr-copy-expand'); const field = f.by('data-ocr-copy-manual')
    assert.equal(field.props.value, f.failure.text); assert.equal(field.props.readOnly, true)
    assert.ok(field.props.className.includes('text-base')); assert.equal(field.props.maxLength, undefined)
    f.click('data-ocr-copy-select'); assert.deepEqual(f.io.selects, [{ start: 0, end: f.failure.text.length }])
    f.click('data-ocr-copy-retry'); f.click('data-ocr-copy-close')
    assert.equal(f.io.retries[0], f.failure); assert.equal(f.io.closed[0], f.failure)
  } finally { f.close() } }
})
await test('selection failure is reported and a successful selection clears it', async () => {
  const f = await fixture(); try {
    f.click('data-ocr-copy-expand'); f.io.throws = true; f.click('data-ocr-copy-select')
    assert.ok(f.h.text().includes(fragment.ko.imageOcr.output.selectionFailed))
    f.io.throws = false; f.click('data-ocr-copy-select')
    assert.ok(!f.h.text().includes(fragment.ko.imageOcr.output.selectionFailed))
  } finally { f.close() }
})
await test('focus reentry and old rendered handlers cannot act on a replaced failure', async () => {
  const f = await fixture(); try {
    f.click('data-ocr-copy-expand'); const oldRetry = f.by('data-ocr-copy-retry').props.onClick, oldClose = f.by('data-ocr-copy-close').props.onClick
    f.io.focus = () => { f.io.active = null }; f.click('data-ocr-copy-select'); assert.equal(f.io.selects.length, 0)
    const next = Object.freeze({ text: 'new', label: '현재 결과' }); f.io.active = next; f.h.setProps({ ...f.props, failure: next })
    oldRetry(); oldClose(); f.h.render(); assert.equal(f.io.retries.length + f.io.closed.length, 0)
    assert.equal(f.h.all().filter(node => node.type === 'textarea').length, 0)
    f.click('data-ocr-copy-expand'); assert.equal(f.by('data-ocr-copy-manual').props.value, 'new')
  } finally { f.close() }
})
await test('empty result has an honest notice and disables selection', async () => {
  const f = await fixture('en'); try {
    const empty = Object.freeze({ text: '', label: 'Current result' }); f.io.active = empty; f.h.setProps({ ...f.props, failure: empty })
    assert.ok(f.h.text().includes(fragment.en.imageOcr.output.empty)); f.click('data-ocr-copy-expand')
    assert.equal(f.by('data-ocr-copy-select').props.disabled, true)
  } finally { f.close() }
})
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch58/author-recovery-child.json', JSON.stringify({ source: 'Actual unconnected child with controlled React/focus/selection ports; no browser or parent-integration claim.', results }, null, 2) + '\n')
console.log(`OCR copy recovery child: ${results.length}/${results.length} PASS`)
