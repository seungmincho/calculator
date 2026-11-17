// node scripts/check-number-to-korean-editing.ts
import assert from 'node:assert/strict'
import {
  NUMBER_KOREAN_EXAMPLE, NUMBER_KOREAN_EXAMPLE_INPUT, initialNumberEditingState,
  reduceNumberEditing as reduce, formatNumberOnBlur, addNumberQuickAmount,
  numberInputSyncUrl, numberShareUrl, type NumberEditingState,
} from '../src/utils/numberToKoreanEditing.ts'
import { canonical, parseAmount, toKoreanReading } from '../src/utils/numberToKorean.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
const initial = initialNumberEditingState
const hydrate = (query = '') => reduce(initial(), { type: 'hydrate', params: new URLSearchParams(query) })
const edit = (raw: string) => reduce(hydrate(), { type: 'change', raw })
const url = 'https://toolhub.ai.kr/number-to-korean/?campaign=x&n=old#result'
const assertAmountEqual = (before: string, after: string) => assert.deepEqual(parseAmount(after), parseAmount(before))

check('SSR and initial client use one fixed, immediately calculable example without writing a URL', () => {
  assert.deepEqual(initial(), initial())
  assert.equal(initial().raw, NUMBER_KOREAN_EXAMPLE_INPUT)
  assert.equal(canonical(parseAmount(initial().raw)!), NUMBER_KOREAN_EXAMPLE)
  assert.ok(toKoreanReading(parseAmount(initial().raw)!).length > 0)
  assert.equal(initial().focused, false)
  assert.equal(numberInputSyncUrl(url, initial()), null)
  assert.equal(numberShareUrl(url, initial()), null)
  assert.equal(hydrate().example, true)
  assert.equal(numberInputSyncUrl(url, hydrate()), null)
})

check('has(n) distinguishes absent, empty, invalid and valid input; read alone never rewrites it', () => {
  for (const [raw, expected] of [['', ''], ['not a number', 'not a number'], ['0001234.00', '1,234.00'], ['일금 오만원정', '일금 오만원정']]) {
    const state = hydrate(new URLSearchParams({ n: raw }).toString())
    assert.equal(state.raw, expected)
    assert.equal(state.example, false)
    assert.equal(state.userEdited, false)
    assert.equal(numberInputSyncUrl(url, state), null)
    assert.equal(reduce(state, { type: 'hydrate', params: new URLSearchParams('n=99') }), state)
  }
})

check('editing, composition, clear and quick-add before hydration all win over a late link', () => {
  for (const action of [{ type: 'change', raw: '-' }, { type: 'compositionStart' }, { type: 'clear' }, { type: 'quickAdd', amount: '1000' }] as const) {
    const state = reduce(initial(), action)
    const restored = reduce(state, { type: 'hydrate', params: new URLSearchParams('n=999') })
    assert.equal(restored.raw, state.raw)
    assert.equal(restored.example, false)
    assert.equal(restored.urlRestored, true)
  }
  // Even a quick gesture that leaves the amount unchanged expresses user intent.
  const state = reduce(initial(), { type: 'quickAdd', amount: '0' })
  assert.equal(reduce(state, { type: 'hydrate', params: new URLSearchParams('n=999') }).raw, initial().raw)
})

check('raw middle edits and Korean text stay byte-for-byte unchanged while typing', () => {
  for (const raw of ['12,934,567', '12,34,567', '-00123.', '−.5', '금 오만 원정', '오ㅁ', '  1234  ', '1.00000000000000000001']) {
    const before = Object.freeze(hydrate())
    const state = reduce(before, { type: 'change', raw })
    assert.equal(state.raw, raw)
    assert.equal(before.raw, NUMBER_KOREAN_EXAMPLE_INPUT)
    assert.equal(state.example, false)
  }
})

check('blur adds grouping without numeric coercion, fraction rounding or changing calculation', () => {
  const cases = [
    ['9007199254740993', '9,007,199,254,740,993'],
    ['99999999999999999999', '99,999,999,999,999,999,999'],
    ['-0001234.00000000000000000001', '-1,234.00000000000000000001'],
    ['−1234.00', '−1,234.00'], ['1234.', '1,234.'], ['.00500', '.00500'],
    ['₩ 0001234 원정', '1,234'], ['12,34', '1,234'], ['-0.00', '-0.00'],
  ]
  for (const [raw, expected] of cases) {
    assert.equal(formatNumberOnBlur(raw), expected)
    assertAmountEqual(raw, expected)
    assert.equal(reduce(edit(raw), { type: 'blur' }).raw, expected)
  }
})

check('incomplete, invalid, Korean and unsupported 21-digit values survive blur intact', () => {
  for (const raw of ['', '-', '−', '.', '-.', '−.', '1..2', 'one', '일금 오만원정', '3억 5천만', '999999999999999999999', '金1234圓']) {
    assert.equal(formatNumberOnBlur(raw), raw)
    assert.equal(reduce(edit(raw), { type: 'blur' }).raw, raw)
  }
})

check('IME blocks quick amounts, clear and URL actions without overwriting composing raw', () => {
  let state = reduce(hydrate(), { type: 'focus' })
  state = reduce(state, { type: 'compositionStart' })
  state = reduce(state, { type: 'change', raw: '오ㅁ', isComposing: true })
  assert.equal(reduce(state, { type: 'clear' }), state)
  assert.equal(reduce(state, { type: 'quickAdd', amount: '1000' }), state)
  assert.equal(numberInputSyncUrl(url, state), null)
  assert.equal(numberShareUrl(url, state), null)
  state = reduce(state, { type: 'compositionEnd', raw: '오만' })
  assert.equal(state.raw, '오만')
  assert.equal(state.focused, true)
  assert.equal(state.composing, false)
})

check('composition blur waits for final input and rejects stale or refocused normalization', () => {
  let state = reduce(edit('1234'), { type: 'compositionStart' })
  state = reduce(state, { type: 'blur' })
  assert.equal(state.raw, '1234')
  assert.equal(reduce(state, { type: 'normalizeDeferred', generation: state.generation }), state)
  state = reduce(state, { type: 'compositionEnd', raw: '12345' })
  const captured = state.generation
  state = reduce(state, { type: 'change', raw: '123456' })
  assert.equal(reduce(state, { type: 'normalizeDeferred', generation: captured }), state)
  assert.equal(reduce(state, { type: 'normalizeDeferred', generation: state.generation }).raw, '123,456')
  const refocused = reduce(state, { type: 'focus' })
  assert.equal(reduce(refocused, { type: 'normalizeDeferred', generation: refocused.generation }), refocused)
  const cleared = reduce(state, { type: 'clear' })
  assert.equal(reduce(cleared, { type: 'normalizeDeferred', generation: cleared.generation }), cleared)
})

check('compositionend before ordinary blur preserves final raw until blur', () => {
  let state = reduce(hydrate(), { type: 'focus' })
  state = reduce(state, { type: 'compositionStart' })
  state = reduce(state, { type: 'compositionEnd', raw: '12345.00' })
  assert.equal(state.raw, '12345.00')
  assert.equal(reduce(state, { type: 'blur' }).raw, '12,345.00')
  // A native composing input can arrive before the compositionstart handler.
  assert.equal(reduce(hydrate(), { type: 'change', raw: '일', isComposing: true }).composing, true)
})

check('explicit clear writes n= and a fresh visit stays empty, preserving unrelated URL parts', () => {
  const state = reduce(hydrate(), { type: 'clear' })
  const next = new URL(numberInputSyncUrl(url, state)!)
  assert.equal(next.searchParams.has('n'), true)
  assert.equal(next.searchParams.get('n'), '')
  assert.equal(next.searchParams.get('campaign'), 'x')
  assert.equal(next.hash, '#result')
  assert.equal(hydrate(next.search).raw, '')
  assert.equal(hydrate(next.search).example, false)
  assert.equal(numberShareUrl(next.href, state), null)
})

check('valid URL sync is canonical; invalid edits remove only n and never expose their raw text', () => {
  const next = new URL(numberInputSyncUrl(url, edit('-0001234.5000'))!)
  assert.equal(next.searchParams.get('n'), '-1234.5')
  assert.equal(next.searchParams.get('campaign'), 'x')
  assert.equal(next.hash, '#result')
  const invalid = new URL(numberInputSyncUrl(url, edit('private invalid text'))!)
  assert.equal(invalid.searchParams.has('n'), false)
  assert.equal(invalid.searchParams.get('campaign'), 'x')
  assert.equal(invalid.hash, '#result')
  assert.ok(!invalid.href.includes('private'))
})

check('copy URL uses the current raw before address sync, with exact 20-digit precision', () => {
  const state = edit('99999999999999999999.123400')
  const link = new URL(numberShareUrl(url, state)!)
  assert.equal(link.searchParams.get('n'), '99999999999999999999.1234')
  assert.equal(link.searchParams.get('campaign'), 'x')
  assert.equal(link.hash, '#result')
  assert.equal(new URL(url).searchParams.get('n'), 'old')
  assert.equal(numberShareUrl(url, edit('-')), null)
})

check('quick amounts retain established negative/invalid, fraction and overflow rules', () => {
  assert.equal(addNumberQuickAmount('-123.50', '1000'), '1,000')
  assert.equal(addNumberQuickAmount('invalid', '1000'), '1,000')
  assert.equal(addNumberQuickAmount('9007199254740993.5000', '1'), '9,007,199,254,740,994.5')
  assert.equal(addNumberQuickAmount('99999999999999999998', '1'), '99,999,999,999,999,999,999')
  assert.equal(addNumberQuickAmount('99999999999999999999', '1'), '99999999999999999999')
  for (const amount of ['-1', 'x', '', '1.5', '9'.repeat(21)]) assert.equal(addNumberQuickAmount('42', amount), '42')
})

check('immutable state transitions never reset deliberate empty/raw input to the example', () => {
  let state: NumberEditingState = Object.freeze(reduce(hydrate(), { type: 'clear' }))
  for (let i = 0; i < 3; i++) {
    state = Object.freeze(reduce(state, { type: 'focus' }))
    state = Object.freeze(reduce(state, { type: 'blur' }))
    state = Object.freeze(reduce(state, { type: 'hydrate', params: new URLSearchParams() }))
    assert.equal(state.raw, '')
    assert.equal(state.example, false)
  }
})

console.log(`${groups} number editing groups passed`)
