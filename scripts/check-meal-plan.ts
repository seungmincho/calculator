// node scripts/check-meal-plan.ts
import assert from 'node:assert/strict'
import { MEAL_HISTORY_KEY } from '../src/utils/mealHistory.ts'
import {
  MEAL_PLAN_KEY, mealPlanWeekDates, mealPlanWeek, fillMealPlanBlanks, mealPlanText, mealPlanHistoryState,
  readMealPlan, writeMealPlanChanges, type MealPlanSnapshot,
} from '../src/utils/mealPlan.ts'

const entry = { date: '2026-11-16', menu: '김치찌개' }
const encode = (entries: unknown[], version = 1) => JSON.stringify({ version, entries })
const memory = (initial: string | null = null) => {
  let raw = initial, writes = 0
  return {
    get raw() { return raw }, get writes() { return writes }, replace(next: string | null) { raw = next },
    getItem(key: string) { assert.equal(key, MEAL_PLAN_KEY); return raw },
    setItem(key: string, next: string) { assert.equal(key, MEAL_PLAN_KEY); writes++; raw = next },
  }
}
const ready = (snapshot: MealPlanSnapshot) => {
  assert.equal(snapshot.status, 'ready')
  if (snapshot.status !== 'ready') throw new Error('Expected ready snapshot')
  return snapshot
}
const unchanged = <T>(items: T[]) => [...items]
let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

check('plans have a separate empty storage format from eaten meals', () => {
  assert.notEqual(MEAL_PLAN_KEY as string, MEAL_HISTORY_KEY)
  assert.deepEqual(readMealPlan(memory()), { status: 'ready', raw: null, entries: [] })
})
check('weeks cross month/year boundaries in exact chronological order', () => {
  assert.deepEqual(mealPlanWeekDates('2026-12-29'), ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04'])
  assert.deepEqual(mealPlanWeekDates('2199-12-29')?.slice(-4), ['2200-01-01', '2200-01-02', '2200-01-03', '2200-01-04'])
})
check('real leap years and century rules are validated', () => {
  assert.equal(mealPlanWeekDates('2000-02-27')?.[2], '2000-02-29')
  assert.equal(mealPlanWeekDates('2028-02-27')?.[2], '2028-02-29')
  assert.equal(mealPlanWeekDates('2100-02-27')?.[2], '2100-03-01')
  assert.equal(mealPlanWeekDates('2100-02-29'), null)
})
check('invalid dates and seven-day ranges outside 2000–2200 cannot produce NaN dates', () => {
  for (const start of ['', 'x', '0000-01-01', '0099-01-01', '1999-12-31', '2026-02-30', '2026-13-01', '2200-12-26', '2201-01-01', '9999-12-31']) {
    assert.equal(mealPlanWeekDates(start), null, start)
    assert.equal(mealPlanWeek(start, []), null, start)
  }
  assert.equal(mealPlanWeekDates('2200-12-25')?.[6], '2200-12-31')
})
check('draft edits survive week switches while blank drafts override stored menus', () => {
  const entries = [entry, { date: '2026-11-23', menu: '초밥' }]
  const draft = { '2026-11-16': '', '2026-11-17': '파스타', '2026-11-23': '국밥' }
  const first = mealPlanWeek('2026-11-16', entries, draft)!
  const second = mealPlanWeek('2026-11-23', entries, draft)!
  assert.equal(first[0].menu, '')
  assert.equal(first[1].menu, '파스타')
  assert.equal(second[0].menu, '국밥')
  assert.deepEqual(mealPlanWeek('2026-11-16', entries, draft), first)
  assert.equal(entries[0].menu, '김치찌개')
})
check('fill preserves chosen days and deduplicates candidates and already-used menus', () => {
  const week = mealPlanWeek('2026-11-16', [entry, { date: '2026-11-18', menu: 'Pizza' }])!
  const before = JSON.stringify(week)
  const result = fillMealPlanBlanks(week, ['김치찌개', '치킨', ' 치킨 ', 'ＰＩＺＺＡ', '초밥'], unchanged)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('Expected fill')
  assert.deepEqual(result.changes, [{ date: '2026-11-17', menu: '치킨' }, { date: '2026-11-19', menu: '초밥' }])
  assert.equal(result.filled, 2)
  assert.equal(result.remaining, 3)
  assert.equal(JSON.stringify(week), before)
})
check('insufficient or absent candidates leave remaining days empty without repetition', () => {
  const week = mealPlanWeek('2026-11-16', [])!
  const result = fillMealPlanBlanks(week, ['치킨'], unchanged)
  assert.equal(result.ok && result.remaining, 6)
  assert.equal(result.ok && result.changes.length, 1)
  const empty = fillMealPlanBlanks(week, [], unchanged)
  assert.equal(empty.ok && empty.remaining, 7)
})
check('invalid candidate names are counted; invalid drafts and nonconsecutive weeks are rejected', () => {
  const week = mealPlanWeek('2026-11-16', [])!
  const result = fillMealPlanBlanks(week, ['', '  ', '가'.repeat(81), 'a\nb', '초밥'], unchanged)
  assert.equal(result.ok && result.skippedCandidates, 4)
  assert.equal(result.ok && result.filled, 1)
  assert.deepEqual(fillMealPlanBlanks([{ ...week[0], menu: '가'.repeat(81) }, ...week.slice(1)], ['초밥']), { ok: false, error: 'invalidMenu' })
  assert.deepEqual(fillMealPlanBlanks([...week].reverse(), ['초밥']), { ok: false, error: 'invalidWeek' })
})
check('saving changed dates preserves all other weeks', () => {
  const other = { date: '2026-12-01', menu: '불고기' }
  const storage = memory(encode([entry, other]))
  assert.equal(writeMealPlanChanges(readMealPlan(storage), [{ ...entry, menu: '초밥' }, { date: '2026-11-17', menu: '치킨' }], storage).ok, true)
  assert.deepEqual(ready(readMealPlan(storage)).entries, [{ ...entry, menu: '초밥' }, { date: '2026-11-17', menu: '치킨' }, other])
})
check('blank changes delete only their own dates and typed names are trimmed', () => {
  const other = { date: '2026-12-01', menu: '불고기' }
  const storage = memory(encode([entry, other]))
  assert.equal(writeMealPlanChanges(readMealPlan(storage), [{ ...entry, menu: '   ' }, { date: '2026-11-17', menu: ' 초밥 ' }], storage).ok, true)
  assert.deepEqual(ready(readMealPlan(storage)).entries, [{ date: '2026-11-17', menu: '초밥' }, other])
})
check('90 saved dates are retained on overflow; deletion and addition can free a slot atomically', () => {
  const entries = Array.from({ length: 90 }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), menu: `메뉴 ${i}` }))
  const storage = memory(encode(entries)), before = storage.raw
  assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], storage), { ok: false, error: 'full' })
  assert.equal(storage.raw, before)
  assert.equal(writeMealPlanChanges(readMealPlan(storage), [{ ...entries[0], menu: '' }, entry], storage).ok, true)
  assert.equal(ready(readMealPlan(storage)).entries.length, 90)
})
check('invalid changed dates, duplicate dates and overlong/control menus never partly save', () => {
  for (const changes of [[{ date: '2026-02-30', menu: '치킨' }], [entry, entry], [{ ...entry, menu: '가'.repeat(81) }], [{ ...entry, menu: 'a\tb' }]]) {
    const storage = memory(), result = writeMealPlanChanges(readMealPlan(storage), changes, storage)
    assert.equal(result.ok, false)
    assert.equal(storage.writes, 0)
  }
  const storage = memory()
  assert.equal(writeMealPlanChanges(readMealPlan(storage), [{ ...entry, menu: '가'.repeat(80) }], storage).ok, true)
})
check('corrupt, duplicate-date, unsupported and oversized saves are preserved unchanged', () => {
  const invalid = ['', '{', 'null', '[]', '{}', encode([entry, entry]), encode([{ ...entry, date: '2201-01-01' }]), encode([{ ...entry, menu: '' }]), encode([{ ...entry, menu: ' x' }]), encode([{ ...entry, extra: 1 }]), ' '.repeat(100001)]
  for (const raw of invalid) {
    const storage = memory(raw)
    assert.equal(readMealPlan(storage).status, 'invalidData')
    assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], storage), { ok: false, error: 'invalidData' })
    assert.equal(storage.raw, raw)
  }
  const storage = memory(encode([entry], 2))
  assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], storage), { ok: false, error: 'unsupportedVersion' })
  assert.equal(storage.writes, 0)
})
check('stale edits and stale deletions cannot overwrite another tab', () => {
  const storage = memory(encode([entry])), stale = readMealPlan(storage)
  assert.equal(writeMealPlanChanges(readMealPlan(storage), [{ ...entry, menu: '다른 탭 메뉴' }], storage).ok, true)
  const newer = storage.raw
  for (const menu of ['오래된 메뉴', '']) {
    assert.deepEqual(writeMealPlanChanges(stale, [{ ...entry, menu }], storage), { ok: false, error: 'conflict' })
    assert.equal(storage.raw, newer)
  }
})
check('new corruption cannot be overwritten from an earlier healthy snapshot', () => {
  const storage = memory(), stale = readMealPlan(storage)
  storage.replace('{')
  assert.deepEqual(writeMealPlanChanges(stale, [entry], storage), { ok: false, error: 'invalidData' })
  assert.equal(storage.raw, '{')
})
check('quota and read failures never report a successful save', () => {
  const storage = memory()
  assert.deepEqual(readMealPlan({ ...storage, getItem() { throw new Error('SecurityError') } }), { status: 'unavailable' })
  assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], { ...storage, setItem() { throw new Error('QuotaExceededError') } }), { ok: false, error: 'unavailable' })
  assert.equal(storage.raw, null)
})
check('readback detects ignored writes or an intervening writer', () => {
  const storage = memory()
  assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], { ...storage, setItem() {} }), { ok: false, error: 'conflict' })
  const external = encode([{ ...entry, menu: '외부 메뉴' }])
  assert.deepEqual(writeMealPlanChanges(readMealPlan(storage), [entry], { ...storage, setItem() { storage.replace(external) } }), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, external)
})
check('copy/TXT uses chronological visible dates, pending edits and explicit undecided rows', () => {
  const week = mealPlanWeek('2026-11-16', [entry], { '2026-11-18': '초밥' })!
  const text = mealPlanText(week, '미정')
  assert.equal(text, '2026-11-16\t김치찌개\n2026-11-17\t미정\n2026-11-18\t초밥\n2026-11-19\t미정\n2026-11-20\t미정\n2026-11-21\t미정\n2026-11-22\t미정')
})
check('only today/past valid unique menus are eligible for explicit eaten-history linking', () => {
  assert.equal(mealPlanHistoryState(entry, '2026-11-16', []), 'ready')
  assert.equal(mealPlanHistoryState(entry, '2026-11-17', []), 'ready')
  assert.equal(mealPlanHistoryState(entry, '2026-11-15', []), 'future')
  assert.equal(mealPlanHistoryState(entry, '2026-11-16', [{ date: entry.date, name: entry.menu }]), 'duplicate')
  assert.equal(mealPlanHistoryState({ ...entry, menu: '' }, '2026-11-16', []), 'invalid')
  assert.equal(mealPlanHistoryState(entry, '', []), 'invalid')
})

console.log(`${count} meal plan checks passed`)
