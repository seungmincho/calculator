// Actual recovery component with controlled textarea methods; no browser/clipboard access.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { componentHarness, all } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const messages = JSON.parse(readFileSync(new URL('./translations-number.json', import.meta.url), 'utf8'))
const entry = 'src/components/NumberToKoreanCopyRecovery.tsx'
let groups = 0
const check = async (name, run) => { await run(); groups++; console.log(`PASS ${name}`) }
const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, next]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return typeof next === 'string' ? [path] : flatten(next, path)
})

const setup = async (locale = 'ko', overrides = {}) => {
  const calls = { focus: 0, select: 0, ranges: [], retry: 0, close: 0 }
  let throwSelection = false
  const host = {
    focus() { calls.focus++ },
    select() { calls.select++; if (throwSelection) throw new Error('selection denied') },
    setSelectionRange(start, end) { calls.ranges.push([start, end]) },
  }
  const props = { target: 'batch', text: '\uFEFF이름\t숫자\t결과\r\n' + Array.from({ length: 100 }, (_, i) => `${i + 1}\t'${9007199254740993n + BigInt(i)}\t한글 🧾\r\n`).join(''),
    label: locale === 'ko' ? '일괄 변환 표' : 'Batch conversion table',
    onRetry: () => calls.retry++, onClose: () => calls.close++, ...overrides }
  const harness = await componentHarness(entry, { messages: messages[locale], props,
    beforeEffects(tree) { const field = all(tree).find(node => node.type === 'textarea'); field.props.ref.current = host },
  })
  harness.render()
  return { harness, calls, props, failSelection(value) { throwSelection = value } }
}

await check('KO/EN matching 14 keys and actual complete readonly output with labels and touch sizes', async () => {
  assert.deepEqual(flatten(messages.ko).sort(), flatten(messages.en).sort())
  assert.equal(flatten(messages.ko).length, 14)
  for (const locale of ['ko', 'en']) {
    const { harness, calls, props } = await setup(locale)
    const field = harness.find(node => node.type === 'textarea').props
    assert.equal(field.value, props.text)
    assert.equal(field.readOnly, true)
    assert.equal(field.rows, 8)
    assert.equal(field.autoFocus, undefined)
    assert.equal(calls.focus, 0)
    assert.match(field.className, /text-base/)
    const label = harness.find(node => node.type === 'label').props
    assert.equal(label.htmlFor, field.id)
    assert.ok(harness.all().some(node => node.props?.id === field['aria-describedby']))
    for (const button of harness.all().filter(node => node.type === 'button')) assert.match(button.props.className, /min-h-11/)
    assert.ok(harness.text().includes(messages[locale].numberToKorean.copyRecovery.hint))
    assert.ok(!harness.text().includes('copyRecovery.'))
    harness.cleanup()
  }
})

await check('manual select includes every UTF-16 character and never invokes retry/close or claims copy', async () => {
  const { harness, calls, props } = await setup()
  harness.find(node => node.props?.['data-number-copy-select'] !== undefined).props.onClick()
  harness.render()
  assert.deepEqual(calls.ranges, [[0, props.text.length]])
  assert.equal(calls.focus, 1)
  assert.equal(calls.select, 1)
  assert.equal(calls.retry, 0)
  assert.equal(calls.close, 0)
  assert.ok(!harness.all().some(node => node.props?.role === 'status'))
  harness.find(node => node.props?.['data-number-copy-retry'] !== undefined).props.onClick()
  harness.find(node => node.props?.['data-number-copy-close'] !== undefined).props.onClick()
  assert.equal(calls.retry, 1)
  assert.equal(calls.close, 1)
  harness.cleanup()
})

await check('selection failure is recoverable and a successful selection removes only that notice', async () => {
  const { harness, calls, failSelection } = await setup('en')
  failSelection(true)
  harness.find(node => node.props?.['data-number-copy-select'] !== undefined).props.onClick()
  harness.render()
  assert.ok(harness.text().includes(messages.en.numberToKorean.copyRecovery.selectionFailed))
  assert.equal(calls.ranges.length, 0)
  failSelection(false)
  harness.find(node => node.props?.['data-number-copy-select'] !== undefined).props.onClick()
  harness.render()
  assert.ok(!harness.text().includes(messages.en.numberToKorean.copyRecovery.selectionFailed))
  assert.equal(calls.ranges.length, 1)
  assert.ok(harness.all().some(node => node.props?.role === 'alert'))
  harness.cleanup()
})

await check('new target or text cannot inherit a previous selection failure, including late old handlers', async () => {
  const { harness, props, failSelection } = await setup()
  const oldSelect = harness.find(node => node.props?.['data-number-copy-select'] !== undefined).props.onClick
  failSelection(true); oldSelect(); harness.render()
  assert.ok(harness.all().some(node => node.props?.role === 'status'))
  harness.setProps({ ...props, text: 'new full TSV\n' })
  assert.ok(!harness.all().some(node => node.props?.role === 'status'))
  harness.setProps({ ...props, target: 'link', text: 'https://toolhub.ai.kr/number-to-korean/?n=123' })
  oldSelect(); harness.render()
  assert.ok(!harness.all().some(node => node.props?.role === 'status'))
  assert.equal(harness.find(node => node.type === 'textarea').props.rows, 4)
  assert.equal(harness.find(node => node.type === 'textarea').props.value, 'https://toolhub.ai.kr/number-to-korean/?n=123')
  harness.cleanup()
})

console.log(`${groups} actual number copy-recovery groups passed (controlled host methods, not browser selection)`)
