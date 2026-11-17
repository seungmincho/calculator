import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as merge from '../../../src/utils/lineMerge.ts'
import { compareTextLines } from '../../../src/utils/lineDiff.ts'

const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch47/translations-line-merge.json', 'utf8'))
let sequence = 0, groups = 0
const prepare = (left, right) => merge.prepareLineMerge(++sequence, left, right, compareTextLines(left, right))
const attr = (host, name, value = '') => host.find(node => node.props[name] === value)
const click = (host, name, value = '') => { const node = attr(host, name, value); assert.ok(!node.props.disabled); node.props.onClick(); host.render() }
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)]
async function fixture(document, { locale = 'ko', choices = merge.createLineMergeChoices(document), ...extra } = {}) {
  let host, props
  const copies = [], downloads = [], changes = []
  props = { document, output: merge.selectLineMerge(document, choices), stale: false, ...extra,
    onChoose(owner, blockId, side) { assert.equal(owner, props.document); changes.push([blockId, side]); props = { ...props, output: merge.selectLineMerge(owner, props.output.choices.map(choice => choice.blockId === blockId ? { ...choice, side } : choice)) }; host.setProps(props) },
    onAll(owner, side) { assert.equal(owner, props.document); props = { ...props, output: merge.selectLineMerge(owner, merge.createLineMergeChoices(owner, side)) }; host.setProps(props) },
    onCopy(output) { copies.push(output) }, onDownload(output) { downloads.push(output) },
  }
  // Externalize the real module so its private WeakSet brands are shared with these actual factory outputs.
  host = await componentHarness('src/components/LineMergePanel.tsx', { props, messages: fragments[locale], modules: { '@/utils/lineMerge': merge } }); host.render()
  return { host, copies, downloads, changes, get props() { return props }, update(value) { props = { ...props, ...value }; host.setProps(props) } }
}
async function test(name, run) { await run(); groups++; console.log('PASS', name) }

await test('seven blocks page independently, retained selections drive complete outputs and source inputs stay unchanged', async () => {
  const left = Array.from({ length: 7 }, (_, i) => `old${i}\nanchor${i}`).join('\n'), right = left.replaceAll('old', 'new'), doc = prepare(left, right), f = await fixture(doc)
  assert.equal(f.host.all().filter(node => node.type === 'fieldset').length, 6)
  const radio = f.host.find(node => node.type === 'input' && node.props.value === 'modified'); radio.props.onChange({ target: { checked: true } }); f.host.render()
  click(f.host, 'data-line-merge-block-next'); assert.equal(f.host.all().filter(node => node.type === 'fieldset').length, 1)
  f.host.find(node => node.type === 'input' && node.props.value === 'modified').props.onChange({ target: { checked: true } }); f.host.render()
  click(f.host, 'data-line-merge-block-prev'); assert.equal(f.host.find(node => node.type === 'input' && node.props.value === 'modified').props.checked, true)
  click(f.host, 'data-line-merge-copy'); click(f.host, 'data-line-merge-download'); assert.equal(f.copies[0], f.downloads[0]); assert.equal(f.copies[0].text, left.replace('old0', 'new0').replace('old6', 'new6'))
  click(f.host, 'data-line-merge-all', 'modified'); assert.equal(f.props.output.text, right)
  click(f.host, 'data-line-merge-all', 'original'); assert.equal(f.props.output.text, left); assert.equal(doc.left, left); assert.equal(doc.right, right); f.host.cleanup()
})
await test('600-row preview retains page identity while all rows reach copy and TXT callbacks', async () => {
  const text = Array.from({ length: 600 }, (_, index) => `${index}:가😀`).join('\n'), f = await fixture(prepare(text, text))
  const rows = () => f.host.all().filter(node => Object.hasOwn(node.props, 'data-line-merge-row'))
  assert.equal(rows().length, 200); assert.equal(rows()[0].props['data-line-merge-row'], 1)
  click(f.host, 'data-line-merge-result-next'); click(f.host, 'data-line-merge-result-next'); assert.equal(rows()[0].props['data-line-merge-row'], 401); assert.equal(rows().at(-1).props['data-line-merge-row'], 600)
  assert.equal(attr(f.host, 'data-line-merge-result-next').props.disabled, true)
  click(f.host, 'data-line-merge-copy'); click(f.host, 'data-line-merge-download'); assert.equal(f.copies[0].text, text); assert.equal(f.downloads[0].lineCount, 600); f.host.cleanup()
})
await test('exact2MiB merge limits rendered text without truncating emitted document', async () => {
  const left = 'a'.repeat(1048575) + '\n', right = '\n' + 'b'.repeat(1048575), doc = prepare(left, right)
  const choices = merge.createLineMergeChoices(doc).map((choice, index) => ({ ...choice, side: index ? 'modified' : 'original' })), f = await fixture(doc, { choices })
  assert.ok(f.host.text().length < 15000)
  click(f.host, 'data-line-merge-copy'); click(f.host, 'data-line-merge-download'); assert.equal(f.copies[0].bytes, 2097152); assert.equal(f.downloads[0].text, left + right); f.host.cleanup()
})
await test('empty document remains actionable, stale comparison stays labelled and mismatched snapshot disables output', async () => {
  const f = await fixture(prepare('', 'new'))
  assert.ok(attr(f.host, 'data-line-merge-empty')); assert.equal(attr(f.host, 'data-line-merge-copy').props.disabled, false)
  click(f.host, 'data-line-merge-copy'); assert.equal(f.copies[0].text, ''); assert.equal(f.copies[0].bytes, 0)
  f.update({ stale: true }); assert.ok(attr(f.host, 'data-line-merge-stale')); assert.equal(attr(f.host, 'data-line-merge-copy').props.disabled, false)
  const other = prepare('a', 'b'); f.update({ output: merge.selectLineMerge(other, merge.createLineMergeChoices(other)) })
  assert.equal(attr(f.host, 'data-line-merge-copy').props.disabled, true); assert.equal(attr(f.host, 'data-line-merge-download').props.disabled, true)
  assert.ok(f.host.all().filter(node => node.type === 'input').every(node => node.props.disabled)); f.host.cleanup()
})
await test('both translations resolve all block/output labels, 44px actions and keyboard radio controls', async () => {
  for (const locale of ['ko', 'en']) {
    const f = await fixture(prepare('old\n\ntail', 'new\n\nextra\ntail'), { locale })
    assert.ok(f.host.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
    assert.ok(f.host.all().filter(node => node.type === 'input').every(node => node.props.type === 'radio' && node.props.name.startsWith('merge-')))
    assert.equal(f.host.text().includes('merge.'), false); f.host.cleanup()
  }
})
await test('copy recovery renders full text only on request and keeps selection errors/retries scoped to its token', async () => {
  for (const locale of ['ko', 'en']) {
    const actions = [], token = Object.freeze({ sequence: 1 }), content = '한😀\n'.repeat(50000)
    const io = { selectionThrows: true, selected: null, focus: 0 }
    let props = { state: { kind: 'copy', status: 'failed', target: 'merged', text: content, label: fragments[locale].diffViewer.output.merged, filename: 'merged.txt', token }, onRetry(value) { actions.push(['retry', value]) }, onClose(value) { actions.push(['close', value]) } }
    const h = await componentHarness('src/components/DiffCopyRecovery.tsx', { props, messages: fragments[locale], beforeEffects(tree) { for (const node of walk(tree)) if (node.type === 'textarea') node.props.ref.current = { focus() { io.focus++ }, select() { if (io.selectionThrows) throw new Error('selection unavailable') }, setSelectionRange(start, end) { io.selected = [start, end] } } } }); h.render()
    assert.equal(h.all().some(node => node.type === 'textarea'), false); click(h, 'data-diff-copy-expand')
    const field = attr(h, 'data-diff-copy-manual'); assert.equal(field.props.value, content); assert.ok(field.props.className.includes('text-base')); assert.equal(field.props.readOnly, true)
    click(h, 'data-diff-copy-select'); assert.ok(h.text().includes(fragments[locale].diffViewer.output.selectionFailed)); io.selectionThrows = false; click(h, 'data-diff-copy-select')
    assert.deepEqual(io.selected, [0, content.length]); assert.equal(h.text().includes(fragments[locale].diffViewer.output.selectionFailed), false)
    click(h, 'data-diff-copy-retry'); click(h, 'data-diff-copy-close'); assert.equal(actions[0][1], token); assert.equal(actions[1][1], token)
    props = { ...props, state: { ...props.state, token: { sequence: 2 }, text: '', status: 'copying' } }; h.setProps(props)
    assert.equal(h.all().some(node => node.type === 'textarea'), false); assert.equal(attr(h, 'data-diff-copy-retry').props.disabled, true)
    click(h, 'data-diff-copy-expand'); assert.equal(attr(h, 'data-diff-copy-select').props.disabled, true)
    assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); h.cleanup()
  }
})
console.log(JSON.stringify({ groups, kind: 'actual unconnected child components with controlled host refs', nativeBrowser: false }))
