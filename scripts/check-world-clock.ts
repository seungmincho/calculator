// 세계 시계 회귀 체크: node scripts/check-world-clock.ts
import assert from 'node:assert/strict'
import {
  offsetMin, isDST, fmtOffset, fmtDiff, dayDiff, zonedToUtc, localParts, hm, daySlots, inWork, overlap, ranges,
  shareLine, marketSession, MARKETS, searchCities, resolveCity, CITIES, DEFAULT_IDS,
} from '../src/utils/worldClock.ts'

const U = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const NY = 'America/New_York', LON = 'Europe/London', SYD = 'Australia/Sydney', SEL = 'Asia/Seoul'

// 오프셋 + DST (2026: 미국 3/8~11/1, 영국 3/29~10/25, 시드니 4/5 종료·10/4 시작)
assert.equal(offsetMin(SEL, U(2026, 1, 15)), 540)
assert.equal(offsetMin('Asia/Kolkata', U(2026, 1, 15)), 330)
assert.equal(offsetMin('Asia/Kathmandu', U(2026, 1, 15)), 345)
assert.equal(offsetMin(NY, U(2026, 1, 15)), -300); assert.equal(isDST(NY, U(2026, 1, 15)), false)
assert.equal(offsetMin(NY, U(2026, 7, 1)), -240); assert.equal(isDST(NY, U(2026, 7, 1)), true)
// 미국 DST 시작: 2026-03-08 02:00 EST(=07:00Z)
assert.equal(offsetMin(NY, U(2026, 3, 8, 6, 59)), -300)
assert.equal(offsetMin(NY, U(2026, 3, 8, 7, 0)), -240)
// 미국 DST 종료: 2026-11-01 02:00 EDT(=06:00Z)
assert.equal(offsetMin(NY, U(2026, 11, 1, 5, 59)), -240)
assert.equal(offsetMin(NY, U(2026, 11, 1, 6, 0)), -300)
// 영국: 3/29 01:00Z 시작, 10/25 01:00Z 종료
assert.equal(offsetMin(LON, U(2026, 3, 29, 0, 59)), 0)
assert.equal(offsetMin(LON, U(2026, 3, 29, 1, 0)), 60); assert.equal(isDST(LON, U(2026, 6, 1)), true)
assert.equal(offsetMin(LON, U(2026, 10, 25, 1, 0)), 0); assert.equal(isDST(LON, U(2026, 12, 1)), false)
// 시드니(남반구): 1월 AEDT +11(DST), 7월 AEST +10
assert.equal(offsetMin(SYD, U(2026, 1, 15)), 660); assert.equal(isDST(SYD, U(2026, 1, 15)), true)
assert.equal(offsetMin(SYD, U(2026, 7, 1)), 600); assert.equal(isDST(SYD, U(2026, 7, 1)), false)
// 4/5 03:00 AEDT(=4/4 16:00Z) 종료, 10/4 02:00 AEST(=10/3 16:00Z) 시작
assert.equal(offsetMin(SYD, U(2026, 4, 4, 15, 59)), 660)
assert.equal(offsetMin(SYD, U(2026, 4, 4, 16, 0)), 600)
assert.equal(offsetMin(SYD, U(2026, 10, 3, 16, 0)), 660)
assert.equal(isDST(SEL, U(2026, 7, 1)), false)
assert.equal(isDST('UTC', U(2026, 7, 1)), false)

assert.equal(fmtOffset(540), 'UTC+9'); assert.equal(fmtOffset(330), 'UTC+5:30'); assert.equal(fmtOffset(-180), 'UTC-3'); assert.equal(fmtOffset(0), 'UTC±0')
assert.equal(fmtDiff(-780), '-13'); assert.equal(fmtDiff(-210), '-3:30'); assert.equal(fmtDiff(0), '0')

// 날짜 차이: 서울 10/15 09:00(=10/15 00:00Z) → 뉴욕 10/14 20:00 (어제), 서울 23:00 → 시드니 10/16 01:00 (내일)
assert.equal(dayDiff(NY, SEL, U(2026, 10, 15, 0)), -1)
assert.equal(dayDiff(LON, SEL, U(2026, 10, 15, 0)), 0) // 런던 01:00 BST 같은 날
assert.equal(dayDiff(LON, SEL, U(2026, 10, 14, 22)), -1) // 서울 07:00 = 런던 전날 23:00
assert.equal(dayDiff(SYD, SEL, U(2026, 10, 15, 14)), 1)
assert.equal(dayDiff(SEL, SEL, U(2026, 10, 15, 14)), 0)
assert.equal(dayDiff('Pacific/Kiritimati', 'Pacific/Honolulu', U(2026, 10, 15, 0)), 1) // 둘 다 UTC-10/+14, 날짜선

// 벽시계 → UTC
assert.equal(zonedToUtc(SEL, 2026, 10, 15, 21), U(2026, 10, 15, 12))
assert.equal(zonedToUtc(NY, 2026, 7, 1, 9, 30), U(2026, 7, 1, 13, 30))
assert.equal(zonedToUtc(NY, 2026, 1, 15, 9, 30), U(2026, 1, 15, 14, 30))
assert.equal(hm(localParts(NY, zonedToUtc(NY, 2026, 11, 1, 12))), '12:00') // DST 종료일 낮
assert.equal(hm(localParts(NY, zonedToUtc(NY, 2026, 3, 8, 12))), '12:00') // DST 시작일 낮

// 미팅 플래너: 서울 10/15(목) 하루 24칸
const slots = daySlots(SEL, '2026-10-15')
assert.equal(slots.length, 24); assert.equal(slots[0], U(2026, 10, 14, 15))
assert.equal(inWork(SEL, slots[9], 9, 18), true); assert.equal(inWork(SEL, slots[18], 9, 18), false)
assert.equal(inWork(SEL, daySlots(SEL, '2026-10-17')[10], 9, 18), false) // 토요일
// 서울+런던(BST, -8h): 서울 17시 = 런던 09시 → 겹침 17:00~18:00 1칸
assert.deepEqual(ranges(overlap([SEL, LON], slots, 9, 18)), [[17, 18]])
// 11월(런던 GMT, -9h) → 겹침 없음
assert.deepEqual(ranges(overlap([SEL, LON], daySlots(SEL, '2026-11-12'), 9, 18)), [])
// 서울+뉴욕 9–18: 겹침 없음. 근무 7–22로 넓히면 서울 07–11시(뉴욕 전날 18–22시), 20–22시(뉴욕 07–09시)
assert.deepEqual(ranges(overlap([SEL, NY], slots, 9, 18)), [])
assert.deepEqual(ranges(overlap([SEL, NY], slots, 7, 22)), [[7, 11], [20, 22]])
assert.deepEqual(ranges([true, true, false, true]), [[0, 2], [3, 4]])

const wd = ['일', '월', '화', '수', '목', '금', '토']
assert.equal(shareLine(slots[21], [{ tz: SEL, name: '서울' }, { tz: NY, name: '뉴욕' }, { tz: LON, name: '런던' }], wd),
  '10/15(목) 21:00 서울 = 08:00 뉴욕 = 13:00 런던')
assert.equal(shareLine(slots[9], [{ tz: SEL, name: '서울' }, { tz: NY, name: '뉴욕' }], wd), '10/15(목) 09:00 서울 = 20:00 뉴욕(10/14(수))')

// 증시: 미국장 한국시간 서머타임 22:30~05:00, 표준시 23:30~06:00
const nyse = MARKETS.find(m => m.id === 'nyse')!, krx = MARKETS.find(m => m.id === 'krx')!
let s = marketSession(nyse, U(2026, 10, 15, 0)) // 서울 10/15 09:00 → 뉴욕 10/14 20:00 장 마감 후
assert.equal(s.isOpen, false); assert.equal(hm(localParts(SEL, s.open)), '22:30'); assert.equal(hm(localParts(SEL, s.close)), '05:00')
s = marketSession(nyse, U(2026, 11, 20, 0))
assert.equal(hm(localParts(SEL, s.open)), '23:30'); assert.equal(hm(localParts(SEL, s.close)), '06:00')
s = marketSession(nyse, U(2026, 10, 15, 14)) // 뉴욕 10:00 목
assert.equal(s.isOpen, true)
s = marketSession(nyse, U(2026, 10, 17, 14)) // 토요일 → 월요일 10/19 개장
assert.equal(s.isOpen, false); assert.equal(localParts(NY, s.open).d, 19)
s = marketSession(krx, U(2026, 10, 15, 1)) // 서울 10:00
assert.equal(s.isOpen, true); assert.equal(hm(localParts(SEL, s.close)), '15:30')

// 검색·해석
assert.ok(searchCities('뉴욕', []).some(c => c.id === 'newYork'))
assert.ok(searchCities('new york', []).some(c => c.id === 'newYork'))
assert.ok(searchCities('미국', []).length >= 5)
assert.ok(!searchCities('뉴욕', ['newYork']).some(c => c.id === 'newYork'))
assert.ok(searchCities('bogo', [], ['America/Bogota']).some(c => c.id === 'bogota'))
assert.equal(searchCities('reykjavik', [], ['Atlantic/Reykjavik'])[0]?.tz, 'Atlantic/Reykjavik')
assert.equal(resolveCity('Atlantic/Reykjavik')?.ko, 'Reykjavik')
assert.equal(resolveCity('Not/AZone'), null)
assert.equal(resolveCity('seoul')?.tz, SEL)
assert.equal(new Set(CITIES.map(c => c.id)).size, CITIES.length, 'id 중복')
for (const c of CITIES) assert.ok(resolveCity(c.tz) || c.tz === 'UTC', c.tz)
for (const id of DEFAULT_IDS) assert.ok(resolveCity(id), id)

console.log('world-clock: all checks passed')
