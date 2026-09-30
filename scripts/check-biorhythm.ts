// 바이오리듬 회귀 체크: node scripts/check-biorhythm.ts
import assert from 'node:assert/strict'
import { todayKST } from '../src/utils/dday.ts'
import {
  CYCLES, daysAlive, rhythm, crossing, band, dayPoint, series, monthPoints, bestWorst, upcomingCritical,
  match, compatibility, sanitizeProfiles,
} from '../src/utils/biorhythm.ts'

// 일수: 출생일 0일, 윤년 포함, 시간대 무관
assert.equal(daysAlive('2000-01-01', '2000-01-01'), 0)
assert.equal(daysAlive('2000-01-01', '2001-01-01'), 366)
assert.equal(daysAlive('1996-03-15', '2026-10-01'), 11157)
// KST 오늘: UTC 15:00 = 다음날 00:00 KST
assert.equal(todayKST(Date.UTC(2026, 8, 30, 15, 0)), '2026-10-01')
assert.equal(todayKST(Date.UTC(2026, 8, 30, 14, 59)), '2026-09-30')

// 값: 출생일 0, 1/4주기 최고
assert.equal(rhythm(0, 23), 0)
assert.ok(Math.abs(rhythm(7, 28) - 1) < 1e-12)
assert.ok(Math.abs(rhythm(21, 28) + 1) < 1e-12)

// 위험일(0점 통과): 23일 주기 → 0, 11.5(11일째), 23, 34.5(34일째) …
const crit23 = Array.from({ length: 47 }, (_, d) => crossing(d, 23)).map((c, d) => c && `${d}${c}`).filter(Boolean)
assert.deepEqual(crit23, ['0up', '11down', '23up', '34down', '46up'])
// 28일 주기: 0, 14, 28 (정확히 0인 날)
assert.deepEqual(Array.from({ length: 29 }, (_, d) => crossing(d, 28)).map((c, d) => c && d).filter(c => c !== null), [0, 14, 28])
// 모든 주기: 한 주기에 정확히 2번, 부호가 실제로 바뀌는 날과 일치
for (const c of Object.values(CYCLES)) {
  let n = 0
  for (let d = 1000; d < 1000 + c; d++) {
    const x = crossing(d, c)
    if (x) n++
    const a = rhythm(d, c), b = rhythm(d + 1, c)
    const flips = Math.abs(a) < 1e-9 || (a > 0) !== (b > 0) && Math.abs(b) > 1e-9
    assert.equal(!!x, flips, `cycle ${c} day ${d}`)
  }
  assert.equal(n, 2, `cycle ${c} 2 crossings`)
}

// 구간
assert.equal(band(1), 'high'); assert.equal(band(0.5), 'high'); assert.equal(band(0.2), 'up')
assert.equal(band(0), 'up'); assert.equal(band(-0.2), 'down'); assert.equal(band(-0.5), 'low')

// 차트/월
const s = series('1996-03-15', '2026-10-01')
assert.equal(s.length, 31); assert.equal(s[15].date, '2026-10-01'); assert.equal(s[0].date, '2026-09-16')
assert.deepEqual(dayPoint('2000-01-01', '2000-01-01').critical, ['physical', 'emotional', 'intellectual'])
const m = monthPoints('1996-03-15', '2026-02')
assert.equal(m.length, 28); assert.equal(m[27].date, '2026-02-28')
assert.equal(monthPoints('2026-10-20', '2026-10').length, 12, '출생 전 날짜 제외')
const bw = bestWorst(m)
assert.ok(bw.best[0].composite >= bw.best[2].composite && bw.worst[0].composite <= bw.worst[2].composite)
assert.ok(bw.best[0].composite === Math.max(...m.map(p => p.composite)))
assert.ok(upcomingCritical('1996-03-15', '2026-10-01', 30).every(u => u.keys.length > 0 && u.date > '2026-10-01'))

// 궁합: 대칭, 같은 생일 100, 반주기 차이 0, 주기 배수 100, 기준일 무관
assert.equal(match('1990-01-01', '1990-01-01', 23), 1)
assert.equal(match('1990-01-01', '1990-01-15', 28), 0)
assert.ok(Math.abs(match('1990-01-01', '1990-01-24', 23) - 1) < 1e-12)
for (const [a, b] of [['1990-05-03', '1993-11-21'], ['1985-02-28', '2001-07-07'], ['2000-02-29', '1999-12-31']]) {
  assert.deepEqual(compatibility(a, b), compatibility(b, a), `symmetric ${a} ${b}`)
  for (const c of [23, 28, 33]) {
    const v = match(a, b, c)
    assert.ok(v >= 0 && v <= 1)
    // 정의 확인: 두 곡선의 cos 위상차 = 여러 날 평균한 곱의 2배와 같다
    const da = daysAlive(a, '2026-10-01'), db = daysAlive(b, '2026-10-01')
    let sum = 0
    for (let i = 0; i < c * 4; i++) sum += rhythm(da + i, c) * rhythm(db + i, c)
    assert.ok(Math.abs((1 + 2 * sum / (c * 4)) / 2 - v) < 1e-9, `phase formula ${c}`)
  }
}
assert.equal(compatibility('1990-01-01', '1990-01-01').overall, 100)

// 프로필
assert.deepEqual(sanitizeProfiles([{ id: 'a', name: '엄마', date: '1965-04-02' }, { id: 'b', name: 'x', date: '2025-02-30' }, null, 'x']), [{ id: 'a', name: '엄마', date: '1965-04-02' }])
assert.deepEqual(sanitizeProfiles('bad'), [])

console.log('check-biorhythm: OK')
