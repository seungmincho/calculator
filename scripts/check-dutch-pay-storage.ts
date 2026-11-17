import assert from 'node:assert/strict'
import { encodeState, decodeState, type State } from '../src/utils/dutchPay.ts'
import {
  DUTCH_PAY_ACCOUNT_KEY as ACCOUNT, DUTCH_PAY_RECENT_KEY as RECENT, DUTCH_PAY_STORAGE_LIMITS as LIMIT,
  parseDutchPayRecent, parseDutchPayAccount, decodeDutchPaySavedState, prepareDutchPayRecent,
  readDutchPayAccount, readDutchPayRecent, commitDutchPayRecent, commitDutchPayAccount,
  createDutchPayAccountWriter, withDutchPayLock, type DutchPayLock, type DutchPayRecent,
} from '../src/utils/dutchPayStorage.ts'

const state = (title = '합성 모임'): State => ({ mode: 's', title, leader: 0, unit: 100, dir: 'ceil', people: [{ name: '', weight: 1 }, { name: '같은 이름', weight: 1.5 }, { name: '같은 이름', weight: 0 }], expenses: [{ name: '합성 식사', amount: 12345, payer: 2, among: [0, 1, 2] }] })
const entry = (value = state(), at = 1): DutchPayRecent => { const result = prepareDutchPayRecent(value, at); assert.equal(result.ok, true); if (!result.ok) throw new Error(result.error); return result.entry }
function storage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed)), writes: string[] = []
  return { data, writes, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); data.set(key, value) } }
}
const locks = () => {
  const jobs: Array<() => void> = [], names: string[] = []
  const lock: DutchPayLock = (key, action) => new Promise(resolve => { names.push(key); jobs.push(() => resolve(action())) })
  return { lock, jobs, names, next() { const job = jobs.shift(); assert.ok(job); job() } }
}
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log(`PASS ${name}`) }

await check('normal legacy, duplicate/blank names, original strings and read-only initialization', () => {
  const original = state('  모임  '), saved = entry(original), raw = JSON.stringify([saved]), accountRaw = JSON.stringify('  합성 은행 123  ')
  const s = storage({ [RECENT]: raw, [ACCOUNT]: accountRaw })
  const r = readDutchPayRecent(s), a = readDutchPayAccount(s)
  assert.equal(r.ok, true); assert.equal(a.ok, true); assert.equal(s.writes.length, 0)
  if (r.ok) { assert.equal(r.raw, raw); assert.deepEqual(decodeState(r.value[0].d), original); r.value[0].title = 'changed'; assert.equal(s.getItem(RECENT), raw) }
  if (a.ok) assert.equal(a.value, '  합성 은행 123  ')
  assert.equal(saved.title, '모임'); assert.deepEqual(Object.keys(saved), ['d', 'title', 'total', 'n', 'at'])
})

await check('maximum escaped valid legacy is 339201 bytes and roundtrips all 100 items', () => {
  const entries = [1, 2, 3, 4, 5, 6, 7, 14, 15, 16].map(code => {
    const c = String.fromCharCode(code)
    const value: State = { mode: 't', title: c.repeat(30), leader: 29, unit: 1000, dir: 'floor', people: Array.from({ length: 30 }, () => ({ name: c.repeat(20), weight: 9.9 })), expenses: Array.from({ length: 100 }, () => ({ name: c.repeat(30), amount: 1e11, payer: 29, among: Array.from({ length: 29 }, (_, i) => i + 1) })) }
    const saved = entry(value, -8640000000000000)
    assert.equal(saved.d.length, 33667); assert.equal(Buffer.from(saved.d, 'base64url').byteLength, 25250)
    assert.deepEqual(decodeState(saved.d), value)
    return saved
  })
  const raw = JSON.stringify(entries)
  assert.equal(Buffer.byteLength(raw), 339201); assert.equal(parseDutchPayRecent(raw).ok, true)
  assert.equal(parseDutchPayAccount(JSON.stringify('\u0001'.repeat(60))).ok, true)
  assert.equal(Buffer.byteLength(JSON.stringify('\u0001'.repeat(60))), 362)
  assert.equal(parseDutchPayAccount(JSON.stringify('\ud800'.repeat(60))).ok, true)
})

await check('101 items and every lossy current-state value are rejected without changing the form', () => {
  const over = state(); over.expenses = Array.from({ length: 101 }, () => ({ ...over.expenses[0], among: [...over.expenses[0].among] }))
  assert.equal(decodeState(encodeState(over))?.expenses.length, 100)
  const raw = JSON.stringify(over); assert.deepEqual(prepareDutchPayRecent(over, 1), { ok: false, error: 'unsupportedState' }); assert.equal(JSON.stringify(over), raw)
  const cases = [
    { ...state(), title: 'x'.repeat(31) },
    { ...state(), people: [{ name: 'x', weight: 1.23 }] },
    { ...state(), expenses: [{ name: 'x', amount: 1.5, payer: 0, among: [0] }] },
    { ...state(), expenses: [{ name: 'x', amount: 1, payer: 0, among: [1, 0] }] },
    { ...state(), expenses: [{ name: 'x', amount: 1, payer: 0, among: [0, 0] }] },
    { ...state(), expenses: [{ name: 'x', amount: Infinity, payer: 0, among: [0] }] },
  ]
  for (const value of cases) assert.equal(prepareDutchPayRecent(value, 1).ok, false)
})

await check('strict original tuple/version/UTF8/canonical bits/metadata and bounds preserve raw', () => {
  const saved = entry(), future = Buffer.from(JSON.stringify([2])).toString('base64url')
  const tuple = JSON.parse(Buffer.from(saved.d, 'base64url').toString())
  const badD = [future, saved.d + '=', Buffer.from(JSON.stringify([...tuple, 'extra'])).toString('base64url'), Buffer.from([0xff]).toString('base64url')]
  for (const d of badD) {
    const raw = JSON.stringify([{ ...saved, d }]), parsed = parseDutchPayRecent(raw)
    assert.equal(parsed.ok, false); assert.equal(parsed.raw, raw)
  }
  assert.deepEqual(decodeDutchPaySavedState(future), { ok: false, error: 'unsupported' })
  const invalid = [null, {}, [saved, saved], [{ ...saved, total: saved.total + 1 }], [{ ...saved, n: 4 }], [{ ...saved, account: 'do not project away' }], [{ ...saved, at: 8640000000000001 }]]
  for (const value of invalid) assert.equal(parseDutchPayRecent(JSON.stringify(value)).ok, false)
  assert.equal(parseDutchPayRecent(' '.repeat(LIMIT.recent + 1)).ok, false)
  assert.deepEqual(decodeDutchPaySavedState('a'.repeat(LIMIT.encoded + 1)), { ok: false, error: 'tooLarge' })
  assert.deepEqual(decodeDutchPaySavedState(Buffer.from(' '.repeat(LIMIT.decoded + 1)).toString('base64url')), { ok: false, error: 'tooLarge' })
  for (const raw of ['null', '{}', '[]', JSON.stringify('x'.repeat(61)), ' '.repeat(LIMIT.account + 1)]) assert.equal(parseDutchPayAccount(raw).ok, false)
})

await check('save upsert/order/10 cap/delete keep legacy shape and capture before lock wait', async () => {
  const s = storage(), q = locks(); let raw: string | null = null
  for (let i = 0; i < 11; i++) {
    const result = await commitDutchPayRecent(raw, { kind: 'save', entry: entry(state(`모임${i}`), i) }, { storage: s })
    assert.equal(result.ok, true); if (result.ok) raw = result.raw
  }
  const read = parseDutchPayRecent(raw); assert.equal(read.ok, true); if (!read.ok) return
  assert.equal(read.value.length, 10); assert.equal(read.value[0].title, '모임10'); assert.equal(read.value.at(-1)?.title, '모임1')
  const snapshot = entry(state('스냅샷')), pending = commitDutchPayRecent(raw, { kind: 'save', entry: snapshot }, { storage: s, lock: q.lock })
  snapshot.title = 'late mutation'; q.next(); const result = await pending
  assert.equal(result.ok, true); if (!result.ok) return
  assert.equal(result.value[0].title, '스냅샷'); assert.equal(q.names[0], RECENT)
  const upsert = await commitDutchPayRecent(result.raw, { kind: 'save', entry: { ...result.value[0], at: 12 } }, { storage: s })
  assert.equal(upsert.ok, true); if (!upsert.ok) return
  assert.equal(upsert.value.length, 10); assert.equal(upsert.value[0].at, 12)
  const removed = await commitDutchPayRecent(upsert.raw, { kind: 'delete', d: upsert.value[0].d }, { storage: s })
  assert.equal(removed.ok, true); if (removed.ok) assert.equal(removed.value.length, 9)
})

await check('same-basis two writers serialize then CAS rejects second; cancelled locks write zero', async () => {
  const s = storage(), q = locks()
  const a = commitDutchPayRecent(null, { kind: 'save', entry: entry(state('A')) }, { storage: s, lock: q.lock })
  const b = commitDutchPayRecent(null, { kind: 'save', entry: entry(state('B')) }, { storage: s, lock: q.lock })
  q.next(); assert.equal((await a).ok, true); const first = s.getItem(RECENT)
  q.next(); assert.deepEqual(await b, { ok: false, error: 'conflict' }); assert.equal(s.getItem(RECENT), first)
  const controller = new AbortController()
  const stale = commitDutchPayAccount(null, '합성', { storage: s, lock: q.lock, signal: controller.signal })
  controller.abort(); q.next(); assert.deepEqual(await stale, { ok: false, error: 'cancelled' }); assert.equal(s.getItem(ACCOUNT), null)
})

await check('corrupt key blocks only itself; quota/readblock/readback mismatch never lies or rolls back', async () => {
  const s = storage({ [RECENT]: '{broken' })
  const blocked = await commitDutchPayRecent('{broken', { kind: 'save', entry: entry() }, { storage: s })
  assert.equal(blocked.ok, false); assert.equal(s.getItem(RECENT), '{broken'); assert.equal(s.writes.length, 0)
  assert.equal((await commitDutchPayAccount(null, '합성 계좌', { storage: s })).ok, true)
  const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' })
  assert.deepEqual(await commitDutchPayAccount(null, '', { storage: { getItem: () => null, setItem() { throw quota } } }), { ok: false, error: 'quota' })
  assert.equal(readDutchPayAccount({ getItem() { throw new Error('blocked') } }).ok, false)
  for (const throws of [true, false]) {
    let wrote = false, writes = 0, raw: string | null = null
    const result = await commitDutchPayAccount(null, '보존', { storage: { getItem() { if (wrote) { if (throws) throw new Error('readback'); return '"other"' } return raw }, setItem(_key, value) { wrote = true; writes++; raw = value } } })
    assert.deepEqual(result, { ok: false, error: 'unconfirmed' }); assert.equal(writes, 1); assert.equal(raw, JSON.stringify('보존'))
  }
})

await check('account latest edit wins pending lock; verified basis advances before continuation', async () => {
  const s = storage(), q = locks(), writer = createDutchPayAccountWriter({ storage: s, lock: q.lock })
  writer.initialize(); assert.equal(s.writes.length, 0)
  const first = writer.edit('첫 입력'), second = writer.edit('최신 입력')
  assert.equal(writer.snapshot().value, '최신 입력')
  q.next(); assert.deepEqual(await first, { ok: false, error: 'cancelled' }); assert.equal(s.writes.length, 0)
  q.next() // commit synchronously, do not await its Promise continuation yet
  const third = writer.edit('다음 입력')
  assert.equal(s.getItem(ACCOUNT), JSON.stringify('최신 입력'))
  q.next(); await second; assert.equal((await third).ok, true)
  assert.equal(s.getItem(ACCOUNT), JSON.stringify('다음 입력')); assert.equal(writer.snapshot().status, 'saved')
})

await check('account conflict blocks repeated edits; recheck preserves draft and requires an explicit write', async () => {
  const s = storage(), writer = createDutchPayAccountWriter({ storage: s })
  writer.initialize(); s.data.set(ACCOUNT, JSON.stringify('다른 탭'))
  assert.deepEqual(await writer.edit('내 입력'), { ok: false, error: 'conflict' })
  const writes = s.writes.length; await writer.edit('더 최신 입력'); assert.equal(s.writes.length, writes)
  writer.recheck(); assert.equal(writer.snapshot().value, '더 최신 입력'); assert.equal(writer.snapshot().savedValue, '다른 탭'); assert.equal(s.writes.length, writes)
  assert.equal((await writer.retry()).ok, true); assert.equal(s.getItem(ACCOUNT), JSON.stringify('더 최신 입력'))
})

await check('account unavailable/corrupt/unknown write never overwrites draft or retries automatically', async () => {
  let raw: string | null = null, failReadback = true, wrote = false, writes = 0
  const writer = createDutchPayAccountWriter({ storage: { getItem() { if (wrote && failReadback) throw new Error('readback'); return raw }, setItem(_key, value) { writes++; raw = value; wrote = true } } })
  writer.initialize(); assert.deepEqual(await writer.edit('합성 최신'), { ok: false, error: 'unconfirmed' })
  assert.equal(writer.snapshot().value, '합성 최신'); await writer.edit('추가 편집'); assert.equal(writes, 1)
  failReadback = false; writer.recheck(); assert.equal(writer.snapshot().value, '추가 편집'); assert.equal(writes, 1)
  await writer.retry(); assert.equal(writes, 2)
  const broken = storage({ [ACCOUNT]: '{}' }), bad = createDutchPayAccountWriter({ storage: broken })
  bad.initialize(); await bad.edit('메모리에서 사용'); assert.equal(bad.snapshot().value, '메모리에서 사용'); assert.equal(broken.writes.length, 0)
})

await check('account disposal/replay, reentrant latest edit and initialization protect user draft', async () => {
  const s = storage(), q = locks(), writer = createDutchPayAccountWriter({ storage: s, lock: q.lock })
  writer.initialize(); const pending = writer.edit('이탈 전'); writer.dispose(); q.next(); await pending; assert.equal(s.writes.length, 0)
  writer.activate(); const resumed = writer.edit('새 입력'); q.next(); assert.equal((await resumed).ok, true)
  const early = createDutchPayAccountWriter({ storage: storage({ [ACCOUNT]: '"저장본"' }) })
  await early.edit('초기 읽기 전 편집'); early.initialize(); assert.equal(early.snapshot().value, '초기 읽기 전 편집')
  const reentrantStorage = storage(); let nested: Promise<unknown> | undefined
  const reentrant = createDutchPayAccountWriter({ storage: reentrantStorage, onChange(view) { if (view.value === 'old' && view.status === 'dirty') nested = reentrant.edit('new') } })
  reentrant.initialize(); assert.deepEqual(await reentrant.edit('old'), { ok: false, error: 'cancelled' }); await nested
  assert.equal(reentrantStorage.getItem(ACCOUNT), '"new"'); assert.equal(reentrantStorage.writes.length, 1)
})

await check('Web Locks use the same legacy key and the unsupported browser fallback retains checks', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
    assert.equal(await withDutchPayLock(RECENT, () => 7), 7)
    let called = 0
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, options: { mode: string }, action: () => unknown) => { assert.equal(key, ACCOUNT); assert.equal(options.mode, 'exclusive'); called++; return action() } } } })
    assert.equal(await withDutchPayLock(ACCOUNT, () => 9), 9); assert.equal(called, 1)
    const controller = new AbortController(); controller.abort()
    await assert.rejects(withDutchPayLock(ACCOUNT, () => { throw new Error('must not run') }, controller.signal), { name: 'AbortError' })
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else Reflect.deleteProperty(globalThis, 'navigator') }
})

await check('account external storage event cancels queued write and preserves draft until explicit recheck', async () => {
  const s = storage(), q = locks(), writer = createDutchPayAccountWriter({ storage: s, lock: q.lock })
  writer.initialize(); const pending = writer.edit('memory')
  s.data.set(ACCOUNT, '"external"'); writer.externalChange(); q.next(); await pending
  assert.equal(s.writes.length, 0); assert.equal(writer.snapshot().value, 'memory'); assert.equal(writer.snapshot().error, 'conflict')
  await writer.edit('latest'); assert.equal(q.jobs.length, 0)
  writer.recheck(); assert.equal(writer.snapshot().value, 'latest'); assert.equal(writer.snapshot().savedValue, 'external')
  assert.equal(q.jobs.length, 0)
})

console.log(`DutchPay storage preparation: ${groups} groups passed; actual browser locks are separate`)
