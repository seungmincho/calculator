// node scripts/check-taxi-saved-trips.ts
import assert from 'node:assert/strict'
import { computeFare, estimateMinutes, perPerson } from '../src/utils/taxiFare.ts'
import {
  TAXI_SAVED_TRIPS_KEY, isTaxiTripConditions, parseTaxiSavedTrips, readTaxiSavedTrips, writeTaxiTripAction,
  type TaxiTripConditions, type TaxiTripsAction, type TaxiTripsSnapshot,
} from '../src/utils/taxiSavedTrips.ts'

const conditions: TaxiTripConditions = {
  distance: 12.3, time: 47, timeAuto: false, traffic: 'heavy', region: 'busan',
  taxiType: 'deluxe', hour: 23, outOfCity: true, people: 3,
}
const trip = { id: 'trip-a', name: '회사에서 집', conditions }
const encode = (trips: unknown[], version = 1) => JSON.stringify({ version, trips })
const memory = (initial: string | null = null) => {
  let raw = initial
  let writes = 0
  return {
    get raw() { return raw },
    get writes() { return writes },
    replace(value: string | null) { raw = value },
    getItem(key: string) { assert.equal(key, TAXI_SAVED_TRIPS_KEY); return raw },
    setItem(key: string, value: string) { assert.equal(key, TAXI_SAVED_TRIPS_KEY); writes++; raw = value },
  }
}
let count = 0
const check = (name: string, run: () => void) => {
  run()
  count++
  console.log(`PASS ${name}`)
}
const ready = (snapshot: TaxiTripsSnapshot) => {
  assert.equal(snapshot.status, 'ready')
  if (snapshot.status !== 'ready') throw new Error('Expected ready snapshot')
  return snapshot
}
const add: TaxiTripsAction = { kind: 'add', ...trip }

check('empty storage is a writable empty list', () => {
  assert.deepEqual(readTaxiSavedTrips(memory()), { status: 'ready', raw: null, trips: [] })
})
check('all nine conditions persist, including manual time, passengers and out-of-city', () => {
  const storage = memory()
  const result = writeTaxiTripAction(readTaxiSavedTrips(storage), add, storage)
  assert.equal(result.ok, true)
  assert.deepEqual(ready(readTaxiSavedTrips(storage)).trips, [trip])
  assert.equal(storage.writes, 1)
  assert.deepEqual(Object.keys(JSON.parse(storage.raw!).trips[0]).sort(), ['conditions', 'id', 'name'])
})
check('reopened trips calculate with the existing calculation functions', () => {
  const restored = ready(readTaxiSavedTrips(memory(encode([trip])))).trips[0].conditions
  const fare = computeFare(restored.distance, restored.time, restored.hour, restored.region, restored.taxiType, restored.outOfCity)
  assert.deepEqual(fare, computeFare(12.3, 47, 23, 'busan', 'deluxe', true))
  assert.equal(perPerson(fare.total, restored.people), perPerson(fare.total, 3))
  const automatic = { ...trip, conditions: { ...conditions, timeAuto: true, time: 999 } }
  const auto = ready(parseTaxiSavedTrips(encode([automatic]))).trips[0].conditions
  assert.equal(auto.timeAuto, true)
  assert.equal(estimateMinutes(auto.distance, auto.traffic), 57)
})
check('condition boundaries are accepted without silently rounding', () => {
  assert.equal(isTaxiTripConditions({ ...conditions, distance: 0, time: 0, hour: 0, people: 1 }), true)
  assert.equal(isTaxiTripConditions({ ...conditions, distance: 1000, time: 10000, hour: 23, people: 4 }), true)
  assert.equal(isTaxiTripConditions({ ...conditions, distance: 0.01, time: 0.5 }), true)
})
check('out-of-range, nonfinite and wrong-type conditions are rejected', () => {
  const changes = [
    { distance: -1 }, { distance: 1000.1 }, { distance: Infinity }, { distance: Number.NaN }, { distance: '5' },
    { time: -1 }, { time: 10001 }, { time: null }, { hour: -1 }, { hour: 24 }, { hour: 1.5 },
    { people: 0 }, { people: 5 }, { people: 2.5 }, { people: '2' }, { timeAuto: 1 }, { outOfCity: 'false' },
    { traffic: 'unknown' }, { region: 'unknown' }, { taxiType: 'unknown' }, { fare: 1234 },
  ]
  for (const change of changes) assert.equal(isTaxiTripConditions({ ...conditions, ...change }), false, JSON.stringify(change))
  for (const key of Object.keys(conditions)) {
    const missing = { ...conditions } as Record<string, unknown>
    delete missing[key]
    assert.equal(isTaxiTripConditions(missing), false, key)
  }
})
check('invalid conditions never get saved', () => {
  const storage = memory()
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), { ...add, conditions: { ...conditions, distance: -1 } }, storage), { ok: false, error: 'invalidConditions' })
  assert.equal(storage.writes, 0)
})
check('empty, whitespace-only, long and control-character names fail', () => {
  for (const name of ['', '   ', '가'.repeat(41), '집\n회사', '집\u0000회사']) {
    const storage = memory()
    assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), { ...add, name }, storage), { ok: false, error: 'invalidName' })
    assert.equal(storage.raw, null)
  }
})
check('names are trimmed and a 40-character name is allowed', () => {
  const storage = memory()
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { ...add, name: ` ${'가'.repeat(40)} ` }, storage).ok, true)
  assert.equal(ready(readTaxiSavedTrips(storage)).trips[0].name, '가'.repeat(40))
})
check('duplicate names are not silently overwritten, including normalized names', () => {
  const storage = memory(encode([{ ...trip, name: 'Office' }]))
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), { ...add, id: 'b', name: 'ＯＦＦＩＣＥ' }, storage), { ok: false, error: 'duplicateName' })
  assert.equal(storage.writes, 0)
})
check('ten trips survive a rejected eleventh, and deletion frees a slot', () => {
  const trips = Array.from({ length: 10 }, (_, i) => ({ ...trip, id: `trip-${i}`, name: `이동 ${i}` }))
  const storage = memory(encode(trips))
  const before = storage.raw
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), add, storage), { ok: false, error: 'limit' })
  assert.equal(storage.raw, before)
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { kind: 'delete', id: 'trip-0' }, storage).ok, true)
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), add, storage).ok, true)
  assert.equal(ready(readTaxiSavedTrips(storage)).trips.length, 10)
})
check('renaming preserves all settings and deletion persists an empty list', () => {
  const storage = memory(encode([trip]))
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { kind: 'rename', id: trip.id, name: '새 이름' }, storage).ok, true)
  assert.deepEqual(ready(readTaxiSavedTrips(storage)).trips, [{ ...trip, name: '새 이름' }])
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { kind: 'delete', id: trip.id }, storage).ok, true)
  assert.deepEqual(ready(readTaxiSavedTrips(storage)).trips, [])
})
check('rename cannot use another trip name and missing records cannot be mutated', () => {
  const storage = memory(encode([trip, { ...trip, id: 'b', name: '다른 이름' }]))
  const snapshot = readTaxiSavedTrips(storage)
  assert.deepEqual(writeTaxiTripAction(snapshot, { kind: 'rename', id: 'b', name: trip.name }, storage), { ok: false, error: 'duplicateName' })
  assert.deepEqual(writeTaxiTripAction(snapshot, { kind: 'rename', id: 'absent', name: '새 이름' }, storage), { ok: false, error: 'missingTrip' })
  assert.deepEqual(writeTaxiTripAction(snapshot, { kind: 'delete', id: 'absent' }, storage), { ok: false, error: 'missingTrip' })
  assert.equal(storage.writes, 0)
})
check('damaged lists are preserved in full, including one invalid entry among valid ones', () => {
  const invalid = [
    '', '{', 'null', '[]', '{}', encode([trip, { ...trip, id: 'b', name: 'bad', conditions: { ...conditions, hour: 24 } }]),
    encode([{ ...trip, price: 5000 }]), encode([trip, trip]), encode([{ ...trip, id: '' }]),
    encode([{ ...trip, name: 'bad\nname' }]), encode([{ ...trip, name: ' x' }]),
    JSON.stringify({ version: 1, trips: [trip], extra: true }), ' '.repeat(100001),
    encode(Array.from({ length: 11 }, (_, i) => ({ ...trip, id: `trip-${i}`, name: `이동 ${i}` }))),
  ]
  for (const raw of invalid) {
    const storage = memory(raw)
    const snapshot = readTaxiSavedTrips(storage)
    assert.equal(snapshot.status, 'invalidData')
    assert.deepEqual(writeTaxiTripAction(snapshot, add, storage), { ok: false, error: 'invalidData' })
    assert.equal(storage.raw, raw)
    assert.equal(storage.writes, 0)
  }
})
check('unsupported versions are preserved even when their shape differs', () => {
  const raw = JSON.stringify({ version: 2, routes: [trip] })
  const storage = memory(raw)
  assert.deepEqual(readTaxiSavedTrips(storage), { status: 'unsupportedVersion' })
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), add, storage), { ok: false, error: 'unsupportedVersion' })
  assert.equal(storage.raw, raw)
})
check('stale tab cannot add, rename or delete over another tab', () => {
  const storage = memory(encode([trip]))
  const stale = readTaxiSavedTrips(storage)
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { kind: 'rename', id: trip.id, name: '다른 탭 이름' }, storage).ok, true)
  const newer = storage.raw
  for (const action of [add, { kind: 'rename', id: trip.id, name: '오래된 이름' }, { kind: 'delete', id: trip.id }] as TaxiTripsAction[]) {
    assert.deepEqual(writeTaxiTripAction(stale, action, storage), { ok: false, error: 'conflict' })
    assert.equal(storage.raw, newer)
  }
  assert.equal(writeTaxiTripAction(readTaxiSavedTrips(storage), { kind: 'rename', id: trip.id, name: '목록 확인 후 이름' }, storage).ok, true)
})
check('new corruption or a future version blocks writes from an earlier healthy view', () => {
  for (const [raw, error] of [['{', 'invalidData'], [encode([trip], 2), 'unsupportedVersion']] as const) {
    const storage = memory()
    const stale = readTaxiSavedTrips(storage)
    storage.replace(raw)
    assert.deepEqual(writeTaxiTripAction(stale, add, storage), { ok: false, error })
    assert.equal(storage.raw, raw)
  }
})
check('an unavailable read and a quota failure never report success', () => {
  const storage = memory()
  assert.deepEqual(readTaxiSavedTrips({ ...storage, getItem() { throw new Error('SecurityError') } }), { status: 'unavailable' })
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), add, { ...storage, setItem() { throw new Error('QuotaExceededError') } }), { ok: false, error: 'unavailable' })
  assert.equal(storage.raw, null)
})
check('write readback detects an ineffective write or intervening writer', () => {
  const storage = memory()
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), add, { ...storage, setItem() {} }), { ok: false, error: 'conflict' })
  const external = encode([{ ...trip, id: 'external', name: '다른 탭' }])
  assert.deepEqual(writeTaxiTripAction(readTaxiSavedTrips(storage), add, { ...storage, setItem() { storage.replace(external) } }), { ok: false, error: 'conflict' })
  assert.equal(storage.raw, external)
})
check('mutating a returned in-memory snapshot cannot inject unvalidated data into storage', () => {
  const storage = memory(encode([trip]))
  const snapshot = ready(readTaxiSavedTrips(storage))
  snapshot.trips[0].conditions.people = 100
  assert.equal(writeTaxiTripAction(snapshot, { kind: 'rename', id: trip.id, name: '안전한 이름' }, storage).ok, true)
  assert.equal(ready(readTaxiSavedTrips(storage)).trips[0].conditions.people, 3)
})

console.log(`${count} taxi saved-trip checks passed`)
