import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createPercentSnapshot, percentComparisonText } from '../../../src/utils/percentComparison.ts'

const before = fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/before-fix.json')
const values = { a: '50000', b: '15', p: '300', w: '1200', f: '30000', t: '40000', dp: '89000', dr: '30', rs: '62300', rr: '30', cp: '100000', x: '3', y: '5', v: '110000' }
const snapshot = (kind, id) => { const result = createPercentSnapshot({ kind, values, chain: ['30', '20'], decimals: 2, korean: false, main: `${id} result`, formula: `${id} formula` }, id); assert.ok(result.ok); return result.snapshot }
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/translations-percent.json', 'utf8'))
function messages(locale) { const base = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')); base.percentCalculator.comparison = fragment[locale].percentCalculator.comparison; return base }
const translator = source => (key, vars = {}) => { let value = key.split('.').reduce((parent, part) => parent?.[part], source); assert.equal(typeof value, 'string', key); for (const [name, content] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(content)); return value }
let groups = 0
for (const locale of ['ko', 'en']) {
  const source = messages(locale), items = ['of', 'ratio', 'change', 'discount', 'chain', 'pp'].map((kind, n) => snapshot(kind, 'id' + n))
  const copies = [], downloads = [], removed = [], cleared = [], props = { items, onRemove: id => removed.push(id), onClear: () => cleared.push(true), onCopy: text => copies.push(text), onDownload: text => downloads.push(text) }
  const h = await componentHarness('src/components/PercentComparisonPanel.tsx', { props, messages: source }); h.render()
  const attr = name => h.find(n => n.props[`data-percent-comparison-${name}`] === '')
  const expected = percentComparisonText(items, translator(source.percentCalculator))
  attr('copy').props.onClick(); attr('download').props.onClick(); assert.deepEqual(copies, [expected]); assert.deepEqual(downloads, [expected])
  assert.equal(h.all().filter(n => n.props['data-percent-comparison-item']).length, 6)
  assert.ok(h.all().filter(n => n.type === 'button').every(n => n.props.className.includes('min-h-11')))
  h.find(n => n.props['data-percent-comparison-remove'] === 'id2').props.onClick(); attr('clear').props.onClick(); assert.deepEqual(removed, ['id2']); assert.deepEqual(cleared, [true]); assert.equal(props.items.length, 6)
  props.notice = 'limit'; h.setProps(props); h.render(); assert.ok(h.text().includes(source.percentCalculator.comparison.limit))
  props.items = []; h.setProps(props); h.render(); for (const action of ['copy', 'download', 'clear']) assert.equal(attr(action).props.disabled, true)
  h.cleanup(); groups++; console.log('PASS six immutable items/full copy TXT/clear-remove callbacks/empty disabled/translated 44px', locale)
}
{
  const full = '원문 😀\r\n'.repeat(10000), actions = [], props = { text: full, onSelectIntent: () => actions.push('select'), onRetry: () => actions.push('retry'), onClose: () => actions.push('close') }
  const h = await componentHarness('src/components/PercentCopyRecovery.tsx', { props, messages: messages('ko') }); h.render()
  const attr = name => h.find(n => n.props[`data-percent-recovery-${name}`] === '')
  const textarea = attr('text'); assert.equal(textarea.props.value, full); assert.equal(textarea.props.readOnly, true); assert.ok(textarea.props.className.includes('text-base'))
  let focused = 0, selections = 0
  textarea.props.ref.current = { focus() { focused++ }, select() { selections++ }, selectionStart: 0, selectionEnd: 0, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end } }
  attr('select').props.onClick(); h.render(); assert.equal(focused, 1); assert.equal(selections, 1); assert.equal(textarea.props.ref.current.selectionEnd, full.length)
  attr('retry').props.onClick(); attr('close').props.onClick(); assert.deepEqual(actions, ['select', 'retry', 'close'])
  textarea.props.ref.current.setSelectionRange = () => { throw Error('no selection') }; attr('select').props.onClick(); h.render(); assert.ok(h.all().some(n => n.props.role === 'alert'))
  assert.ok(!h.text().includes(messages('ko').percentCalculator.comparison.copied)); h.cleanup(); groups++; console.log('PASS full manual field/select-intent/retry-close and selection failure never claims clipboard success')
}
assert.deepEqual(fs.readFileSync('docs/verify/2026-11-17-repeat-batch52/before-fix.json'), before)
if (!process.argv.includes('--connected')) assert.equal(createHash('sha256').update(fs.readFileSync('src/components/PercentCalculator.tsx')).digest('hex'), JSON.parse(before).sourceSha256)
console.log(`Percent comparison actual children: ${groups} groups passed; before-fix JSON preserved${process.argv.includes('--connected') ? '; connected parent checked separately' : '; original parent preserved'}`)
