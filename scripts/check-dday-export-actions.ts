import assert from 'node:assert/strict'
import { createDdayExportRequests, ddayExportUrl, captureDdayEvents, sameDdayEvents } from '../src/utils/ddayExportActions.ts'

let groups = 0
function check(name: string, run: () => void) { run(); groups++; console.log('PASS', name) }
check('output ownership supersedes requests and never revives ABA or replay tokens', () => {
  const owner = createDdayExportRequests('A'); assert.equal(owner.begin(), null); owner.activate()
  const first = owner.begin()!, second = owner.begin()!; assert.equal(owner.current(first), false); assert.equal(owner.current(second), true)
  owner.invalidate(); assert.equal(owner.current(second), false); const third = owner.begin()!
  owner.dispose(); assert.equal(owner.current(third), false); owner.activate(); assert.equal(owner.current(third), false)
  assert.equal(owner.current(owner.begin()!), true)
})
check('different output owners reject each other even with equal context/request counters', () => {
  const a = createDdayExportRequests('same'), b = createDdayExportRequests('same'); a.activate(); b.activate()
  const first = a.begin()!, second = b.begin()!; assert.equal(a.current(second), false); assert.equal(b.current(first), false)
})
check('explicit event URL preserves observed unrelated query/hash and omits other mode/private identity', () => {
  const href = 'https://toolhub.ai.kr/dday-calculator/?utm=one&utm=two&mode=add&base=2020-01-01&value=100&target=1999-01-01&event=OLD#calendar'
  const url = new URL(ddayExportUrl(href, { title: '한글 & = ?# \n', date: '2028-02-29' }))
  assert.equal(url.searchParams.get('mode'), 'dday'); assert.equal(url.searchParams.get('title'), '한글 & = ?# \n'); assert.equal(url.searchParams.get('date'), '2028-02-29')
  assert.deepEqual(url.searchParams.getAll('utm'), ['one', 'two']); assert.equal(url.hash, '#calendar')
  assert.equal(['base', 'value', 'target', 'event'].some(key => url.searchParams.has(key)), false)
})
check('URL does not normalize invalid dates and still represents explicit empty titles', () => {
  assert.throws(() => ddayExportUrl('https://toolhub.ai.kr/', { title: 'x', date: '2027-02-29' }))
  assert.throws(() => ddayExportUrl('javascript:alert(1)', { title: 'x', date: '2028-02-29' }))
  const url = new URL(ddayExportUrl('https://toolhub.ai.kr/dday-calculator/', { title: '', date: '2028-02-29' })); assert.equal(url.searchParams.has('title'), true); assert.equal(url.searchParams.get('title'), '')
})
check('event capture owns every selected row and excludes unrelated fields', () => {
  const original = [{ id: 'saved', date: '2028-02-29', title: 'A', pinned: true }, { date: '2029-03-01', title: 'B' }]
  const captured = captureDdayEvents(original); original[0].title = 'changed'; original.reverse()
  assert.deepEqual(captured, [{ id: 'saved', date: '2028-02-29', title: 'A' }, { date: '2029-03-01', title: 'B' }]); assert.equal(Object.isFrozen(captured[0]), true)
})
check('saved recheck includes ordered identity/title/date and permits no partial match', () => {
  const values = [{ id: 'one', date: '2028-02-29', title: 'A' }, { id: 'two', date: '2029-03-01', title: 'B' }]
  assert.equal(sameDdayEvents(values, captureDdayEvents(values)), true)
  for (const changed of [[...values].reverse(), values.slice(0, 1), [{ ...values[0], title: 'other' }, values[1]], [{ ...values[0], id: 'new' }, values[1]], [{ ...values[0], date: '2028-03-01' }, values[1]]]) assert.equal(sameDdayEvents(values, changed), false)
})
console.log(`D-day output actions: ${groups} groups passed`)
