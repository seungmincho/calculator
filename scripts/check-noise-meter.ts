// 소음 측정 로직 회귀 체크: node scripts/check-noise-meter.ts
import assert from 'node:assert/strict'
import {
  meanSquare, msToDbfs, rmsToDbfs, leq, accAdd, accLeq, aWeightingDb, aWeightingBiquads, biquadGainDb,
  periodAt, floorLimits, stepPeak, newPeakState, countSince, histogram10, toCsv, formatDuration, DB_FLOOR,
  type PeakEvent,
} from '../src/utils/noiseMeter.ts'

const near = (a: number, b: number, tol: number, msg?: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} ≉ ${b} (±${tol})`)

// RMS → dBFS
near(rmsToDbfs(1), 0, 1e-9)
near(rmsToDbfs(0.1), -20, 1e-9)
assert.equal(rmsToDbfs(0), DB_FLOOR)
// 풀스케일 사인파 RMS = 1/√2 → -3.01 dBFS
const sine = Array.from({ length: 48000 }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / 48000))
near(msToDbfs(meanSquare(sine)), -3.01, 0.01)

// Leq는 에너지 평균: 60 dB와 70 dB 반반 → 67.4 dB (산술평균 65 아님)
near(leq([60, 70]), 67.4, 0.05)
near(leq([50, 50, 50]), 50, 1e-9)
const acc = { sum: 0, n: 0 }
;[60, 70].forEach(v => accAdd(acc, v))
near(accLeq(acc), leq([60, 70]), 1e-9)

// A-가중 기준 곡선 (IEC 61672 표 값)
near(aWeightingDb(1000), 0, 0.01)
near(aWeightingDb(100), -19.1, 0.1)
near(aWeightingDb(31.62), -39.4, 0.1) // 공칭 31.5 Hz = 10^1.5
near(aWeightingDb(4000), 1.0, 0.1)

// 디지털 biquad 근사가 기준 곡선을 따라가는지 (48k / 44.1k)
for (const fs of [48000, 44100]) {
  const q = aWeightingBiquads(fs)
  assert.equal(q.length, 3)
  near(biquadGainDb(q, 1000, fs), 0, 1e-6, `fs=${fs} 1k`)
  for (const f of [31.5, 63, 125, 250, 500, 2000, 4000]) near(biquadGainDb(q, f, fs), aWeightingDb(f), 0.3, `fs=${fs} ${f}Hz`)
  // 쌍선형 변환 고역 오차: 10 kHz에서 기준보다 더 깎이지만 3 dB 이내
  const d10k = biquadGainDb(q, 10000, fs) - aWeightingDb(10000)
  assert.ok(d10k < 0 && d10k > -3, `fs=${fs} 10k err ${d10k}`)
  // 안정성: 모든 구간의 극점이 단위원 안 (|a2| < 1, |a1| < 1 + a2)
  for (const { a } of q) assert.ok(Math.abs(a[2]) < 1 && Math.abs(a[1]) < 1 + a[2])
}

// 주간/야간 경계
assert.equal(periodAt(new Date(2026, 0, 1, 5, 59)), 'night')
assert.equal(periodAt(new Date(2026, 0, 1, 6, 0)), 'day')
assert.equal(periodAt(new Date(2026, 0, 1, 21, 59)), 'day')
assert.equal(periodAt(new Date(2026, 0, 1, 22, 0)), 'night')
// 층간소음 기준 (2023.1.2 개정) + 2005.6.30 이전 주택 +2dB (2025~)
assert.deepEqual(floorLimits('day', false), { leq1m: 39, max: 57 })
assert.deepEqual(floorLimits('night', false), { leq1m: 34, max: 52 })
assert.deepEqual(floorLimits('night', true), { leq1m: 36, max: 54 })

// 초과 이벤트 검출: 57 초과가 0.3초, 0.5초 쉬고 다시 → 한 이벤트, 1초 이상 조용하면 종료
const s = newPeakState()
const ends: PeakEvent[] = []
let starts = 0
const feed = (t: number, db: number) => { const r = stepPeak(s, t, db, 57); if (r.started) starts++; if (r.ended) ends.push(r.ended) }
feed(0, 40); feed(100, 60); feed(200, 65); feed(300, 58); feed(400, 50); feed(800, 59); feed(900, 45)
for (let t = 1000; t <= 2000; t += 100) feed(t, 40)
assert.equal(starts, 1)
assert.equal(ends.length, 1)
assert.deepEqual(ends[0], { start: 100, end: 800, peak: 65 })
feed(3000, 70) // 새 이벤트
assert.equal(starts, 2)
// 경계: 정확히 기준값은 초과 아님
const s2 = newPeakState()
assert.equal(stepPeak(s2, 0, 57, 57).started, undefined)

// 1시간 창 카운트
assert.equal(countSince([0, 1000, 3_600_000, 3_700_000], 3_700_000), 2)

// 분포: 10 dB 구간, 합 100%
const bins = new Map([[25, 1], [45, 2], [47, 1], [95, 1]])
const h = histogram10(bins)
near(h.reduce((a, b) => a + b.pct, 0), 100, 1e-9)
assert.equal(h[0].from, 20); near(h[0].pct, 20, 1e-9)           // <30 구간
near(h.find(b => b.from === 40)!.pct, 60, 1e-9)
near(h[h.length - 1].pct, 20, 1e-9)                               // 90+ 구간
assert.ok(histogram10(new Map()).every(b => b.pct === 0))

// CSV / 시간 포맷
assert.equal(toCsv([['a', 'b,c'], [1, 'x"y']]), 'a,"b,c"\n1,"x""y"')
assert.equal(formatDuration(65_000), '01:05')
assert.equal(formatDuration(3_725_000), '1:02:05')

console.log('noise-meter: all checks passed')
