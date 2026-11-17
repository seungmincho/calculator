import assert from 'node:assert/strict'
import {
  WRITING_DIFF_HANDOFF_KEY as KEY, WRITING_DIFF_HANDOFF_PATH as PATH, WRITING_DIFF_HANDOFF_SOURCE as SOURCE,
  WRITING_DIFF_HANDOFF_TTL as TTL, WRITING_DIFF_TEXT_LIMIT as LIMIT, WRITING_DIFF_RAW_LIMIT as RAW_LIMIT,
  createWritingDiffHandoff, parseWritingDiffHandoff, prepareWritingDiffHandoff, openWritingDiffHandoff,
  clearWritingDiffHandoff, createWritingDiffReceiver, WritingDiffHandoffError,
  type WritingDiffWindow, type WritingDiffHandoff,
} from '../src/utils/writingDiffHandoff.ts'
import { WRITING_DRAFT_KEY, WRITING_VERSIONS_KEY, type WritingVersion } from '../src/utils/writingVersions.ts'
import { TEXT_HANDOFF_KEY, createTextHandoff, parseTextHandoff } from '../src/utils/textHandoff.ts'

let checks = 0
function check(label: string, run: () => void) { run(); checks++; console.log(`PASS ${label}`) }
const now = 1_000_000
const saved = { name: '저장본 <제목>', title: '첫 문항', sourceTab: 2, text: ' 첫 줄\r\n둘째😀\r셋째\n\u0000끝\ud800 ' }
const current = { title: '지금 글', sourceTab: 5, text: '첫 줄\r\n바뀐😀\n' }
const payload = createWritingDiffHandoff(saved, current, now)
const raw = JSON.stringify(payload)
const error = (code: string) => (cause: unknown) => cause instanceof WritingDiffHandoffError && cause.code === code
const parseError = (value: unknown, code: string, at = now) => assert.deepEqual(parseWritingDiffHandoff(JSON.stringify(value), at), { ok: false, error: code })
const memory = () => {
  const data = new Map<string, string>()
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
}
const seeded = () => { const store = memory(); store.setItem(KEY, raw); return store }
const popup = () => {
  const store = memory(); const log: string[] = []; let opener: unknown = { source: true }
  const target: WritingDiffWindow = {
    get opener() { return opener }, set opener(value) { opener = value; log.push('detach') },
    sessionStorage: {
      setItem(key, value) { log.push('write'); store.setItem(key, value) },
      getItem(key) { log.push('readback'); return store.getItem(key) },
    },
    location: { replace(url) { assert.equal(opener, null); log.push(url) } }, close() { log.push('close') },
  }
  return { target, store, log }
}
const receive = (storage: Pick<Storage, 'getItem' | 'removeItem'>, apply: (p: WritingDiffHandoff) => void = () => {}) => {
  const receiver = createWritingDiffReceiver(); const ticket = receiver.begin(SOURCE)!
  return receiver.receive(ticket, storage, apply, now)
}

check('exact two-document roundtrip and immutable snapshot, including empty and identical documents', () => {
  assert.deepEqual(parseWritingDiffHandoff(raw, now), { ok: true, payload })
  assert.equal(payload.left.text, saved.text); assert.equal(payload.right.text, current.text)
  const left = { ...saved }; const right = { ...current }; const snap = createWritingDiffHandoff(left, right, now)
  left.text = 'later'; right.title = 'later'; assert.equal(snap.left.text, saved.text); assert.equal(snap.right.title, current.title)
  for (const text of ['', ' \r\n\t ', '한글😀']) {
    const p = createWritingDiffHandoff({ ...saved, text }, { ...current, text }, now)
    assert.deepEqual(parseWritingDiffHandoff(JSON.stringify(p), now), { ok: true, payload: p })
  }
})
check('50k per side, UTF-16 units, maximal JSON escaping and bounded raw parsing', () => {
  for (const text of ['가'.repeat(LIMIT), '\u0000'.repeat(LIMIT), '\ud800'.repeat(LIMIT), '😀'.repeat(LIMIT / 2)]) {
    const p = createWritingDiffHandoff({ ...saved, name: '\u0001'.repeat(40), title: '\u0002'.repeat(40), text }, { ...current, title: '\u0003'.repeat(40), text }, now)
    const json = JSON.stringify(p); assert.ok(json.length <= RAW_LIMIT)
    assert.deepEqual(parseWritingDiffHandoff(json, now), { ok: true, payload: p })
  }
  assert.throws(() => createWritingDiffHandoff({ ...saved, text: '가'.repeat(LIMIT + 1) }, current, now), error('textTooLong'))
  assert.throws(() => createWritingDiffHandoff(saved, { ...current, text: '\0'.repeat(LIMIT + 1) }, now), error('textTooLong'))
  assert.deepEqual(parseWritingDiffHandoff(' '.repeat(RAW_LIMIT + 1), now), { ok: false, error: 'invalid' })
})
check('strict shape, source, version, document roles and metadata', () => {
  for (const value of [null, [], true, 1, 'text']) parseError(value, 'invalid')
  for (const value of [{ ...payload, version: 2 }, { ...payload, source: 'ocr' }, {}]) parseError(value, 'unsupported')
  for (const value of [
    { ...payload, extra: true }, { ...payload, left: payload.right, right: payload.left },
    { ...payload, left: { ...payload.left, role: 'current' } },
    { ...payload, left: { ...payload.left, name: ' ' } }, { ...payload, left: { ...payload.left, name: 'x'.repeat(41) } },
    { ...payload, right: { ...payload.right, title: 'x'.repeat(41) } }, { ...payload, right: { ...payload.right, text: null } },
    { ...payload, right: { ...payload.right, extra: true } }, { ...payload, right: [] },
  ]) parseError(value, 'invalid')
  for (const sourceTab of [0, 6, 1.5, '2', null]) parseError({ ...payload, right: { ...payload.right, sourceTab } }, 'invalid')
  parseError({ ...payload, right: { ...payload.right, text: 'x'.repeat(LIMIT + 1) } }, 'textTooLong')
  assert.deepEqual(parseWritingDiffHandoff('{', now), { ok: false, error: 'invalid' })
  assert.deepEqual(parseWritingDiffHandoff(null, now), { ok: false, error: 'missing' })
})
check('inclusive TTL, future and invalid clocks', () => {
  assert.equal(parseWritingDiffHandoff(raw, now + TTL).ok, true)
  assert.deepEqual(parseWritingDiffHandoff(raw, now + TTL + 1), { ok: false, error: 'expired' })
  parseError({ ...payload, createdAt: now + 1 }, 'future')
  for (const createdAt of [-1, 1.5, '1000000', null, Number.MAX_SAFE_INTEGER + 1]) parseError({ ...payload, createdAt }, 'invalid')
  for (const clock of [NaN, Infinity, -1, 1.5]) assert.deepEqual(parseWritingDiffHandoff(raw, clock), { ok: false, error: 'invalid' })
})
check('source preparation reads current selected record and preserves every source byte', () => {
  const store = memory()
  const version: WritingVersion = { ...saved, id: 'version-1', target: 300, basis: 'chars', createdAt: '2026-11-17T00:00:00.000Z' }
  const stored = JSON.stringify({ version: 1, versions: [version] })
  store.setItem(WRITING_VERSIONS_KEY, stored); store.setItem(WRITING_DRAFT_KEY, 'five tabs and undo remain untouched')
  const before = Array.from(store.data)
  const p = prepareWritingDiffHandoff(store, stored, version.id, { title: current.title, text: '' }, 4, now)
  assert.deepEqual(p.left, { role: 'saved', ...saved }); assert.equal(p.right.text, ''); assert.equal(p.right.sourceTab, 5)
  assert.deepEqual(Array.from(store.data), before)
  assert.throws(() => prepareWritingDiffHandoff(store, stored, version.id, { ...current, text: 'x'.repeat(LIMIT + 1) }, 4, now), error('textTooLong'))
  assert.deepEqual(Array.from(store.data), before)
})
check('source conflict, removed selection, corrupt and blocked storage cannot create delivery', () => {
  const store = memory(); store.setItem(WRITING_VERSIONS_KEY, '{invalid')
  assert.throws(() => prepareWritingDiffHandoff(store, null, 'v', current, 0, now), error('conflict'))
  assert.throws(() => prepareWritingDiffHandoff(store, '{invalid', 'v', current, 0, now), error('corrupt'))
  assert.throws(() => prepareWritingDiffHandoff({ getItem() { throw new Error('blocked') } }, null, 'v', current, 0, now), error('unavailable'))
  store.setItem(WRITING_VERSIONS_KEY, JSON.stringify({ version: 1, versions: [] }))
  assert.throws(() => prepareWritingDiffHandoff(store, store.getItem(WRITING_VERSIONS_KEY), 'removed', current, 0, now), error('conflict'))
  const version = { ...saved, id: 'v', target: 1, basis: 'chars', createdAt: '2026-11-17T00:00:00.000Z' }
  const original = JSON.stringify({ version: 1, versions: [version] }); let reads = 0
  assert.throws(() => prepareWritingDiffHandoff({ getItem: () => ++reads === 1 ? original : 'newer' }, original, 'v', current, 0, now), error('conflict'))
})
check('explicit new tab order, fixed private URL and independent successive deliveries', () => {
  const a = popup(); const b = popup()
  openWritingDiffHandoff(payload, () => a.target, now)
  const changed = createWritingDiffHandoff(saved, { ...current, text: 'second' }, now)
  openWritingDiffHandoff(changed, () => b.target, now)
  assert.deepEqual(a.log, ['write', 'readback', 'detach', PATH])
  assert.deepEqual(parseWritingDiffHandoff(a.store.getItem(KEY), now), { ok: true, payload })
  assert.equal((parseWritingDiffHandoff(b.store.getItem(KEY), now) as { ok: true; payload: WritingDiffHandoff }).payload.right.text, 'second')
  assert.equal(new URL(PATH, 'https://example.test').search, '?from=writing-versions')
  assert.equal(a.store.data.size, 1); assert.equal(b.store.data.size, 1)
})
check('popup blocked/thrown and invalid payload leave no opened target', () => {
  assert.throws(() => openWritingDiffHandoff(payload, () => null, now), error('popupBlocked'))
  assert.throws(() => openWritingDiffHandoff(payload, () => { throw new Error('blocked') }, now), error('popupBlocked'))
  let opened = false
  assert.throws(() => openWritingDiffHandoff(payload, () => { opened = true; return null }, now + TTL + 1), error('expired'))
  assert.equal(opened, false)
})
check('every post-open failure closes only its target, including silent opener failure', () => {
  for (const failure of ['storageAccess', 'set', 'get', 'readback', 'openerThrow', 'openerSilent', 'navigate', 'close']) {
    const p = popup()
    if (failure === 'storageAccess') Object.defineProperty(p.target, 'sessionStorage', { get() { throw new Error('blocked') } })
    if (failure === 'set' || failure === 'close') p.target.sessionStorage.setItem = () => { throw new Error('quota') }
    if (failure === 'get') p.target.sessionStorage.getItem = () => { throw new Error('blocked') }
    if (failure === 'readback') p.target.sessionStorage.getItem = () => null
    if (failure.startsWith('opener')) Object.defineProperty(p.target, 'opener', { get: () => 'source', set() { if (failure === 'openerThrow') throw new Error('blocked') } })
    if (failure === 'navigate') p.target.location.replace = () => { throw new Error('navigation') }
    if (failure === 'close') p.target.close = () => { p.log.push('close'); throw new Error('denied') }
    assert.throws(() => openWritingDiffHandoff(payload, () => p.target, now), error('handoffFailed'))
    assert.equal(p.log.at(-1), 'close', failure)
  }
})
check('conditional consume detects replacement, silent deletion and readback failure', () => {
  const store = seeded(); assert.equal(clearWritingDiffHandoff(store, raw), 'cleared'); assert.equal(store.getItem(KEY), null)
  store.setItem(KEY, 'newer'); assert.equal(clearWritingDiffHandoff(store, raw), 'replaced'); assert.equal(store.getItem(KEY), 'newer')
  store.setItem(KEY, raw); assert.equal(clearWritingDiffHandoff({ ...store, removeItem() {} }, raw), 'unavailable')
  let reads = 0
  assert.equal(clearWritingDiffHandoff({ getItem() { if (++reads > 1) throw new Error('blocked'); return raw }, removeItem() {} }, raw), 'unavailable')
  assert.equal(clearWritingDiffHandoff({ ...store, removeItem() { store.setItem(KEY, 'newer after deletion') } }, raw), 'replaced')
  assert.equal(store.getItem(KEY), 'newer after deletion')
})
check('receiver ignores wrong route and applies once without running or changing text', () => {
  const receiver = createWritingDiffReceiver(); const store = seeded(); let applies = 0
  assert.equal(receiver.begin('ocr'), null); assert.equal(receiver.begin(null), null); assert.equal(store.getItem(KEY), raw)
  const ticket = receiver.begin(SOURCE)!
  const result = receiver.receive(ticket, store, p => { applies++; assert.deepEqual(p, payload) }, now)
  assert.deepEqual(result, { ok: true, payload, cleanup: 'cleared' }); assert.equal(applies, 1)
  assert.equal(receiver.begin(SOURCE), null); assert.deepEqual(receiver.receive(ticket, store, () => applies++, now), { ok: false, error: 'stale' })
  assert.equal(applies, 1)
})
check('input before begin, input while deferred, canceled work and reversed tickets cannot apply', () => {
  for (const kind of ['before', 'during', 'cancel', 'reverse']) {
    const receiver = createWritingDiffReceiver(); const store = seeded(); let applies = 0
    if (kind === 'before') receiver.edit()
    const old = receiver.begin(SOURCE)!
    if (kind === 'during') receiver.edit()
    if (kind === 'cancel') receiver.cancel(old)
    const latest = kind === 'reverse' ? receiver.begin(SOURCE)! : old
    const result = receiver.receive(old, store, () => applies++, now)
    assert.equal(result.ok, false, kind); assert.equal(applies, 0); assert.equal(store.getItem(KEY), raw)
    if (kind === 'reverse') { assert.equal(receiver.receive(latest, store, () => applies++, now).ok, true); assert.equal(applies, 1) }
  }
  const receiver = createWritingDiffReceiver(); const old = receiver.begin(SOURCE)!; receiver.cancel(old)
  const secondSetup = receiver.begin(SOURCE)!; assert.equal(receive(seeded()).ok, true)
  assert.equal(receiver.receive(secondSetup, seeded(), () => {}, now).ok, true, 'StrictMode canceled setup may reschedule')
})
check('mid-read edits/new payloads stop stale application and preserve newest raw', () => {
  for (const kind of ['editFirst', 'editSecond', 'replace']) {
    const receiver = createWritingDiffReceiver(); const ticket = receiver.begin(SOURCE)!; let reads = 0; let applies = 0; let removes = 0
    const result = receiver.receive(ticket, { getItem() {
      reads++; if ((kind === 'editFirst' && reads === 1) || (kind === 'editSecond' && reads === 2)) receiver.edit()
      return kind === 'replace' && reads > 1 ? 'newer' : raw
    }, removeItem() { removes++ } }, () => applies++, now)
    assert.equal(result.ok, false); assert.equal(applies, 0); assert.equal(removes, 0)
  }
})
check('invalid/missing/expired data and apply failure are preserved without reattempt', () => {
  for (const text of [null, '{broken', JSON.stringify({ ...payload, version: 2 }), JSON.stringify({ ...payload, createdAt: 0 })]) {
    const store = memory(); if (text !== null) store.setItem(KEY, text)
    const receiver = createWritingDiffReceiver(); const ticket = receiver.begin(SOURCE)!; let applies = 0
    assert.equal(receiver.receive(ticket, store, () => applies++, now).ok, false)
    assert.equal(applies, 0); assert.equal(store.getItem(KEY), text); assert.equal(receiver.begin(SOURCE), null)
  }
  const store = seeded(); assert.deepEqual(receive(store, () => { throw new Error('apply failed') }), { ok: false, error: 'applyFailed' })
  assert.equal(store.getItem(KEY), raw)
})
check('read failures and cleanup failures never remove an unapplied or replacement payload', () => {
  assert.deepEqual(receive({ getItem() { throw new Error('blocked') }, removeItem() { throw new Error('must not call') } }), { ok: false, error: 'unavailable' })
  let reads = 0
  assert.deepEqual(receive({ getItem() { if (++reads === 2) throw new Error('blocked'); return raw }, removeItem() { throw new Error('must not call') } }), { ok: false, error: 'unavailable' })
  const store = seeded(); let applied = false
  assert.deepEqual(receive({ ...store, removeItem() {} }, () => { applied = true }), { ok: true, payload, cleanup: 'unavailable' })
  assert.equal(applied, true); assert.equal(store.getItem(KEY), raw)
  assert.deepEqual(receive(store, () => { store.setItem(KEY, 'newer') }), { ok: true, payload, cleanup: 'replaced' })
  assert.equal(store.getItem(KEY), 'newer')
})
check('existing OCR/Notepad TTS key and parser remain independent', () => {
  assert.notEqual(KEY, TEXT_HANDOFF_KEY)
  const store = seeded(); const tts = JSON.stringify(createTextHandoff('읽을 글', 'notepad', now)); store.setItem(TEXT_HANDOFF_KEY, tts)
  assert.equal(receive(store).ok, true); assert.equal(store.getItem(TEXT_HANDOFF_KEY), tts)
  assert.equal(parseTextHandoff(tts, now)?.text, '읽을 글'); assert.equal(parseTextHandoff(raw, now), null)
})

console.log(`Writing Diff handoff: ${checks} groups passed`)
