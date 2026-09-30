// 자동차 소모품 교체주기 회귀 체크: node scripts/check-car-maintenance.ts
import assert from 'node:assert/strict'
import { ITEMS, computeDue, schedule, intervalFor, annualCost, autoTax, buildIcs, icsFold, addMonths, daysBetween, encodeCar, decodeCar, type Car } from '../src/utils/carMaintenance.ts'

const spec = (id: string) => ITEMS.find((s) => s.id === id)!
const today = '2026-10-01'
const base: Car = { id: 'a', name: '', fuel: 'gasoline', severe: false, km: 40000, monthlyKm: 1000, reg: '2023-01', records: {} }

// 날짜 산술
assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
assert.equal(addMonths('2025-11-15', 3), '2026-02-15')
assert.equal(daysBetween('2026-10-01', '2026-10-24'), 23)

// 가혹조건 배수: 엔진오일 15,000km/12개월 → 7,500km/6개월
assert.deepEqual(intervalFor(spec('engineOil'), 'gasoline', false), { km: 15000, months: 12 })
assert.deepEqual(intervalFor(spec('engineOil'), 'gasoline', true), { km: 7500, months: 6 })
assert.deepEqual(intervalFor(spec('coolant'), 'gasoline', true), { km: 40000, months: 24 }) // 배수 1
assert.equal(intervalFor(spec('sparkPlugs'), 'lpg', false).km, 40000) // 연료별 예외

// km가 먼저: 월 3,000km → 1.5만km는 5개월에 도달, 12개월보다 빠름
const kmFirst = computeDue(spec('engineOil'), { ...base, monthlyKm: 3000, records: { engineOil: { km: 30000, date: '2026-09-01' } } }, today)
assert.equal(kmFirst.by, 'km')
assert.equal(kmFirst.dueKm, 45000)
assert.equal(kmFirst.kmLeft, 5000)
assert.ok(Math.abs(kmFirst.daysLeft! - Math.round(5000 / (3000 * 12 / 365))) <= 1)
assert.equal(kmFirst.overdue, false)

// 개월이 먼저: 월 300km → 12개월 만기(2027-03-01)가 km보다 빠름
const timeFirst = computeDue(spec('engineOil'), { ...base, monthlyKm: 300, records: { engineOil: { km: 38000, date: '2026-03-01' } } }, today)
assert.equal(timeFirst.by, 'time')
assert.equal(timeFirst.dueDate, '2027-03-01')
assert.equal(timeFirst.daysLeft, daysBetween(today, '2027-03-01'))
assert.equal(timeFirst.overdue, false)

// 가혹조건이면 같은 기록이 6개월 → 2026-09-01 만기, 이미 지남
const sev = computeDue(spec('engineOil'), { ...base, severe: true, monthlyKm: 300, records: { engineOil: { km: 38000, date: '2026-03-01' } } }, today)
assert.equal(sev.dueDate, '2026-09-01')
assert.equal(sev.overdue, true)
assert.ok(sev.daysLeft! < 0)

// km 초과 → 지남
const overKm = computeDue(spec('engineOil'), { ...base, records: { engineOil: { km: 20000, date: '2026-08-01' } } }, today)
assert.equal(overKm.overdue, true)
assert.equal(overKm.kmLeft, -5000)

// 기록 없음 → 주기대로 교체 가정, 지남 아님
for (const d of schedule(base, today)) {
  assert.equal(d.estimated, true, d.id)
  assert.equal(d.overdue, false, d.id)
}
// 저주행(월 200km) 기록 없음도 지남 아님 (시간 주기 반복 가정)
for (const d of schedule({ ...base, monthlyKm: 200, km: 8000 }, today)) assert.equal(d.overdue, false, d.id)

// 냉각수 최초 20만km/10년: 3년차 4만km 차량은 등록일 +10년
const cool = computeDue(spec('coolant'), base, today)
assert.equal(cool.dueDate! <= '2033-01-01', true)
assert.equal(cool.intervalKm, 200000)

// 전기차: 엔진오일·점화플러그·미션오일 없음
const ev = schedule({ ...base, fuel: 'electric' }, today).map((d) => d.id)
assert.ok(!ev.includes('engineOil') && !ev.includes('sparkPlugs') && !ev.includes('transmissionFluid') && !ev.includes('airFilter'))
assert.ok(ev.includes('tires') && ev.includes('cabinFilter'))
// 디젤: 점화플러그 없음
assert.ok(!schedule({ ...base, fuel: 'diesel' }, today).some((d) => d.id === 'sparkPlugs'))

// 정렬: 급한 순
const s = schedule(base, today)
for (let i = 1; i < s.length; i++) assert.ok((s[i - 1].daysLeft ?? 1e9) <= (s[i].daysLeft ?? 1e9))

// 연간 비용: 가혹 > 일반, 전기 < 가솔린, 엔진오일 연 교체 횟수 = max(1.5만km 기준, 12개월 기준)
const n = annualCost('gasoline', false, 1250), sv = annualCost('gasoline', true, 1250)
assert.ok(sv.lo > n.lo && n.hi > n.lo)
assert.equal(n.items.find((i) => i.id === 'engineOil')!.perYear, 1)
assert.equal(annualCost('gasoline', false, 500).items.find((i) => i.id === 'engineOil')!.perYear, 1) // 시간 기준
assert.ok(annualCost('electric', false, 1250).mid < n.mid)

// 자동차세: 2,000cc 신차 = 2000×200×1.3 = 520,000 / 3년차 5% / 12년차 이상 50%
assert.equal(autoTax(1998, 2026, 2026), Math.round(1998 * 200 * 1.3))
assert.equal(autoTax(2000, 2025, 2026), 520000) // 2년차 경감 없음
assert.equal(autoTax(2000, 2024, 2026), Math.round(2000 * 200 * 0.95 * 1.3)) // 3년차 5%
assert.equal(autoTax(2000, 2010, 2026), Math.round(2000 * 200 * 0.5 * 1.3))
assert.equal(autoTax(998, 2026, 2026), Math.round(998 * 80 * 1.3))
assert.equal(autoTax(0, 2026, 2026, true), 130000)

// ICS 형식
const ics = buildIcs([
  { uid: 'engineOil-1', date: '2026-10-24', title: '엔진오일 교체 (내 차, 쏘나타; 흰색)', description: '예정 45,000km\n일반 권장치', alarmDays: 3 },
  { uid: 'tires-1', date: '2027-12-31', title: '타이어'.repeat(20) },
], today)
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
assert.ok(!/[^\r]\n/.test(ics), 'CRLF only')
const enc = new TextEncoder()
for (const line of ics.split('\r\n')) assert.ok(enc.encode(line).length <= 75, `fold: ${line}`)
const unfolded = ics.replace(/\r\n /g, '')
assert.equal((unfolded.match(/BEGIN:VEVENT/g) ?? []).length, 2)
assert.equal((unfolded.match(/END:VEVENT/g) ?? []).length, 2)
assert.ok(unfolded.includes('DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261025'))
assert.ok(unfolded.includes('DTEND;VALUE=DATE:20280101')) // 연말 넘김
assert.ok(unfolded.includes('SUMMARY:엔진오일 교체 (내 차\\, 쏘나타\\; 흰색)'))
assert.ok(unfolded.includes('DESCRIPTION:예정 45\\,000km\\n일반 권장치'))
assert.ok(unfolded.includes('TRIGGER:-P3D'))
assert.ok(unfolded.includes('SUMMARY:' + '타이어'.repeat(20)))
assert.equal(icsFold('a'.repeat(75)), 'a'.repeat(75))
assert.equal(icsFold('a'.repeat(76)), 'a'.repeat(75) + '\r\n a')

// URL 왕복 (이름·날짜 제외)
const car: Car = { ...base, name: '비밀', severe: true, fuel: 'hybrid', records: { engineOil: { km: 35000, date: '2026-05-01' }, wiperBlades: { date: '2026-01-01' } } }
const p = encodeCar(car)
assert.ok(!p.toString().includes('2026-05') && !p.toString().includes(encodeURIComponent('비밀')))
const back = decodeCar((k) => p.get(k))!
assert.deepEqual(back, { km: 40000, monthlyKm: 1000, fuel: 'hybrid', severe: true, reg: '2023-01', records: { engineOil: { km: 35000 } } })
assert.equal(decodeCar(() => null), null)
const junk = decodeCar((k) => ({ km: '99999999', f: 'rocket', r: 'nope.1_engineOil.50000000' } as Record<string, string>)[k] ?? null)!
assert.equal(junk.km, 2000000)
assert.equal(junk.fuel, 'gasoline')
assert.deepEqual(junk.records, { engineOil: { km: 2000000 } })

console.log('check-car-maintenance: OK')
