import assert from 'node:assert/strict'
import {
  TEXT_HANDOFF_KEY, TEXT_HANDOFF_LIMIT, TEXT_HANDOFF_TTL, createTextHandoff,
  parseTextHandoff, parseTextHandoffFrom, saveTextHandoff, openTextHandoff,
  clearTextHandoff, captureTextSelection, selectedHandoffText, type TextHandoffWindow,
} from '../src/utils/textHandoff.ts'

let checks = 0
const check = (label: string, run: () => void) => { run(); checks++; console.log(`PASS ${label}`) }
const now = 1000000
const payload = { source: 'notepad', text: ' 앞문장\n한글 😀 <script> & ?t=비밀\n끝 ', createdAt: now }
const raw = JSON.stringify(payload)
check('exact multiline text and canonical source', () => assert.deepEqual(parseTextHandoff(raw, now), payload))
check('OCR payload compatibility', () => assert.equal(parseTextHandoff(JSON.stringify({ ...payload, source: 'ocr' }), now)?.source, 'ocr'))
for (const value of [null, [], true, 1, 'text', {}, { ...payload, source: 'external' }, { ...payload, text: null }, { ...payload, text: ' \n' }, { ...payload, createdAt: '1000000' }, { ...payload, createdAt: -1 }, { ...payload, createdAt: 1.5 }, { ...payload, createdAt: now + 1 }]) {
  check(`invalid shape ${checks}`, () => assert.equal(parseTextHandoff(JSON.stringify(value), now), null))
}
check('invalid JSON', () => assert.equal(parseTextHandoff('{bad', now), null))
check('TTL inclusive boundary', () => assert.ok(parseTextHandoff(raw, now + TEXT_HANDOFF_TTL)))
check('TTL elapsed', () => assert.equal(parseTextHandoff(raw, now + TEXT_HANDOFF_TTL + 1), null))
check('nonfinite clock rejected', () => assert.equal(parseTextHandoff(raw, Infinity), null))
check('source route mismatch', () => assert.equal(parseTextHandoffFrom(raw, 'ocr', now), null))
check('source route matching', () => assert.deepEqual(parseTextHandoffFrom(raw, 'notepad', now), payload))
check('unknown fields projected away', () => assert.deepEqual(parseTextHandoff(JSON.stringify({ ...payload, extra: { nested: true } }), now), payload))
check('maximum accepted', () => assert.equal(createTextHandoff('가'.repeat(TEXT_HANDOFF_LIMIT), 'notepad', now).text.length, TEXT_HANDOFF_LIMIT))
check('maximum escaped JSON roundtrip', () => { const value = createTextHandoff('x' + '\u0001'.repeat(TEXT_HANDOFF_LIMIT - 1), 'notepad', now); assert.deepEqual(parseTextHandoff(JSON.stringify(value), now), value) })
check('oversize rejected', () => assert.throws(() => createTextHandoff('a'.repeat(TEXT_HANDOFF_LIMIT + 1), 'notepad', now), /textTooLong/))
check('invalid clock rejected on creation', () => assert.throws(() => createTextHandoff('text', 'notepad', NaN), /handoffFailed/))

const memory = () => {
  const data = new Map<string, string>()
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
}
check('OCR save remains same-tab source', () => { const storage = memory(); saveTextHandoff('OCR 원문', storage); assert.equal(parseTextHandoff(storage.getItem(TEXT_HANDOFF_KEY))?.source, 'ocr') })
check('OCR readback failure', () => assert.throws(() => saveTextHandoff('OCR', { setItem() {}, getItem: () => null }), /handoffFailed/))
check('OCR invalid-input error compatibility', () => assert.throws(() => saveTextHandoff(' ', memory()), /textTooLong/))

const popup = () => {
  const storage = memory()
  const log: string[] = []
  let opener: unknown = { source: 'source tab' }
  const target: TextHandoffWindow = {
    get opener() { return opener }, set opener(value) { opener = value; log.push('detach') },
    sessionStorage: { getItem: storage.getItem, setItem(key, value) { assert.equal(opener, null); log.push('store'); storage.setItem(key, value) } },
    location: { replace(url) { log.push(url) } }, close() { log.push('close') },
  }
  return { target, storage, log }
}
check('new target gets exact body; URL has only source; opener detached first', () => {
  const p = popup(); openTextHandoff(payload.text, 'notepad', () => p.target)
  assert.deepEqual(p.log, ['detach', 'store', '/text-to-speech/?from=notepad'])
  assert.equal(parseTextHandoff(p.storage.getItem(TEXT_HANDOFF_KEY))?.text, payload.text)
})
check('two sends use separate windows and independent payloads', () => {
  const a = popup(); const b = popup(); openTextHandoff('first', 'notepad', () => a.target); openTextHandoff('second', 'notepad', () => b.target)
  assert.equal(parseTextHandoff(a.storage.getItem(TEXT_HANDOFF_KEY))?.text, 'first'); assert.equal(parseTextHandoff(b.storage.getItem(TEXT_HANDOFF_KEY))?.text, 'second')
})
check('invalid text never opens a tab', () => { let opened = false; assert.throws(() => openTextHandoff(' ', 'notepad', () => { opened = true; return null }), /emptyText/); assert.equal(opened, false) })
check('blocked popup', () => assert.throws(() => openTextHandoff('body', 'notepad', () => null), /popupBlocked/))
check('popup exception', () => assert.throws(() => openTextHandoff('body', 'notepad', () => { throw new Error('blocked') }), /popupBlocked/))
for (const failure of ['set', 'readback', 'navigate']) check(`${failure} failure closes only target`, () => {
  const p = popup()
  if (failure === 'set') p.target.sessionStorage.setItem = () => { throw new Error('quota') }
  if (failure === 'readback') p.target.sessionStorage.getItem = () => null
  if (failure === 'navigate') p.target.location.replace = () => { throw new Error('navigation') }
  assert.throws(() => openTextHandoff('body', 'notepad', () => p.target), /handoffFailed/)
  assert.equal(p.log.at(-1), 'close')
})
check('consume exact payload once', () => { const s = memory(); s.setItem(TEXT_HANDOFF_KEY, raw); assert.ok(clearTextHandoff(s, raw)); assert.equal(s.getItem(TEXT_HANDOFF_KEY), null); assert.equal(clearTextHandoff(s, raw), false) })
check('newer payload is not deleted', () => { const s = memory(); s.setItem(TEXT_HANDOFF_KEY, 'newer'); assert.equal(clearTextHandoff(s, raw), false); assert.equal(s.getItem(TEXT_HANDOFF_KEY), 'newer') })
check('silent remove failure detected', () => { const s = memory(); s.setItem(TEXT_HANDOFF_KEY, raw); assert.equal(clearTextHandoff({ ...s, removeItem() {} }, raw), false) })

const body = '첫 줄\n읽을 😀 영역\n마지막'
const start = body.indexOf('읽을'); const end = body.indexOf('\n마지막')
const selection = captureTextSelection('note-1', body, start, end)
check('selection preserves exact multilingual range', () => assert.equal(selectedHandoffText(selection, 'note-1', body), '읽을 😀 영역'))
check('note switch invalidates selection', () => assert.equal(selectedHandoffText(selection, 'note-2', body), null))
check('edit outside range invalidates selection', () => assert.equal(selectedHandoffText(selection, 'note-1', `${body}!`), null))
check('equal length edit invalidates selection', () => assert.equal(selectedHandoffText(selection, 'note-1', body.replace('첫', '둘')), null))
for (const [a, b] of [[0, 0], [3, 1], [-1, 3], [1.5, 3], [0, body.length + 1]]) check(`invalid offsets ${a}:${b}`, () => assert.equal(captureTextSelection('note-1', body, a, b), null))
check('whitespace selection not sent', () => assert.equal(selectedHandoffText(captureTextSelection('n', 'a  b', 1, 3), 'n', 'a  b'), null))
check('short selection from oversized note accepted', () => { const text = '가'.repeat(TEXT_HANDOFF_LIMIT + 20); const part = selectedHandoffText(captureTextSelection('n', text, 1, 11), 'n', text); assert.equal(createTextHandoff(part!, 'notepad', now).text.length, 10) })
console.log(`Text handoff: ${checks} checks passed`)
