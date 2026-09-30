// 인터넷 속도 측정 계산 회귀 체크: node scripts/check-speed-test.ts
import assert from 'node:assert/strict'
import {
  mbps, percentile, median, jitter, nextSize, bandwidth, gaugeRatio, downloadSeconds,
  verdict, speedClass, planGuarantee, fmtMbps, DOWN_STEPS, UP_STEPS, type Sample,
  serverTimeFromHeader, pingMs, downSample, upSample,
} from '../src/utils/speedTest.ts'

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≈ ${b}`)

// Mbps: 1,000,000 bytes in 1000ms = 8 Mbps / 12.5MB in 100ms = 1000 Mbps
near(mbps(1e6, 1000), 8)
near(mbps(12.5e6, 100), 1000)
assert.equal(mbps(1e6, 0), 0)
assert.equal(mbps(0, 10), 0)

// 퍼센타일 (선형 보간)
near(percentile([1, 2, 3, 4, 5], 0.5), 3)
near(percentile([5, 1, 4, 2, 3], 0.9), 4.6)
near(percentile([10], 0.9), 10)
assert.ok(Number.isNaN(percentile([], 0.5)))
near(median([3, 1, 2, 100]), 2.5)

// 지터 = 연속 차이 평균
near(jitter([10, 12, 10, 14]), (2 + 2 + 4) / 3)
assert.ok(Number.isNaN(jitter([5])))

// 스케줄: 빈 상태 → 100KB 워밍업
assert.equal(nextSize(DOWN_STEPS, [], 0), 1e5)
const fast = (bytes: number): Sample => ({ bytes, ms: 50 })
const slow = (bytes: number): Sample => ({ bytes, ms: 1500 })
// 워밍업 1 + 100KB 9 → 1MB
let done: Sample[] = Array.from({ length: 10 }, () => fast(1e5))
assert.equal(nextSize(DOWN_STEPS, done, 500), 1e6)
// 1MB 8개 빠름 → 10MB
done = [...done, ...Array.from({ length: 8 }, () => fast(1e6))]
assert.equal(nextSize(DOWN_STEPS, done, 900), 1e7)
// 10MB 단계에서 하나라도 1초 넘으면 25MB 생략
done = [...done, ...Array.from({ length: 5 }, () => fast(1e7)), slow(1e7)]
assert.equal(nextSize(DOWN_STEPS, done, 5000), null)
// 모든 단계 완료 → 종료
const all = DOWN_STEPS.flatMap(s => Array.from({ length: s.count }, () => fast(s.bytes)))
assert.equal(nextSize(DOWN_STEPS, all, 3000), null)
// 시간 예산 초과 → 종료
assert.equal(nextSize(DOWN_STEPS, [fast(1e5)], 10_000), null)
// 저속 회선: 워밍업이 1초 넘어도 100KB 본측정은 진행
assert.equal(nextSize(DOWN_STEPS, [slow(1e5)], 1500), 1e5)
// 업로드: 100KB 8개 → 1MB
assert.equal(nextSize(UP_STEPS, Array.from({ length: 8 }, () => fast(1e5)), 400), 1e6)
// 최대 요청 25MB (서버 50MB 한도 이하)
assert.ok(Math.max(...DOWN_STEPS.map(s => s.bytes), ...UP_STEPS.map(s => s.bytes)) <= 25e6)

// 대역폭: 워밍업 제외 + 10ms 미만 제외 + p90
const samples: Sample[] = [
  { bytes: 1e5, ms: 400 },          // 워밍업 (제외)
  { bytes: 1e5, ms: 5 },            // 10ms 미만 (제외)
  { bytes: 1e6, ms: 80 },           // 100 Mbps
  { bytes: 1e6, ms: 40 },           // 200 Mbps
  { bytes: 1e7, ms: 400 },          // 200 Mbps
  { bytes: 1e7, ms: 320 },          // 250 Mbps
]
near(bandwidth(samples, 1), percentile([100, 200, 200, 250], 0.9))
assert.ok(Number.isNaN(bandwidth([], 0)))

// 게이지
assert.equal(gaugeRatio(0), 0)
near(gaugeRatio(250), 0.5)
assert.equal(gaugeRatio(5000), 1)

// 50GB @ 400Mbps = 1000초
near(downloadSeconds(50, 400), 1000)
assert.equal(downloadSeconds(1, 0), Infinity)

// 판정
const m = { down: 300, up: 50, ping: 10, jitter: 2 }
assert.equal(verdict({ down: 15 }, m), 'good')
assert.equal(verdict({ down: 500 }, m), 'ok')          // 300 ≥ 250
assert.equal(verdict({ down: 1000 }, m), 'bad')
assert.equal(verdict({ down: 3, ping: 8 }, m), 'ok')    // 핑 10 ≤ 16
assert.equal(verdict({ down: 3, ping: 4 }, m), 'bad')
assert.equal(verdict({ down: 3, up: 60 }, { ...m, up: NaN }), 'good') // 업로드 미측정은 판정 제외

assert.equal(speedClass(10), 'slow')
assert.equal(speedClass(99.9), 'moderate')
assert.equal(speedClass(100), 'fast')
assert.equal(speedClass(940), 'veryFast')
assert.equal(planGuarantee(1000), 500)

assert.equal(fmtMbps(482.4), '482')
assert.equal(fmtMbps(91.26), '91.3')
assert.equal(fmtMbps(3.456), '3.46')
assert.equal(fmtMbps(NaN), '—')

// ── 타이밍 해석 (Cloudflare 엔진 동작) ──
assert.equal(serverTimeFromHeader('cfSpeedEdge;dur=3, cfSpeedWorker;dur=13'), 16)
assert.equal(serverTimeFromHeader('cfRequestDuration;dur=5.5, cfSpeedEdge;dur=3'), 5.5)
assert.equal(serverTimeFromHeader('cfL4;desc="?proto=TCP&rtt=2118"'), 0)
assert.equal(serverTimeFromHeader(null), 0)
assert.equal(pingMs(21, 16), 5)
assert.equal(pingMs(10, 16), 0)
const ds = downSample(1e7, 25, 395, 16)            // 핑 9 + 전송 395 = 404ms
near(ds.ms, 404); near(ds.bytes, 1.005e7)
near(mbps(ds.bytes, ds.ms), (1.005e7 * 8) / 404000)
const us = upSample(1e6, 100)
near(us.ms, 100); near(mbps(us.bytes, us.ms), 80.4)
console.log('check-speed-test: OK')
