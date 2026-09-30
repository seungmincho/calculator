// 프레젠테이션 타이머 회귀 체크: node scripts/check-presentation-timer.ts
import assert from 'node:assert/strict'
import {
  parseSegments, serializeSegments, timerState, alertsBetween, formatClock, splitDuration, adjustSegment, defaultWarnMin,
} from '../src/utils/presentationTimer.ts'

// URL 파싱/직렬화 왕복
const agenda = parseSegments('도입:2,본론:8,Q&A:5')!
assert.deepEqual(agenda, [{ name: '도입', sec: 120 }, { name: '본론', sec: 480 }, { name: 'Q&A', sec: 300 }])
assert.equal(serializeSegments(agenda), '도입:2,본론:8,Q&A:5')
assert.deepEqual(parseSegments('10'), [{ name: '', sec: 600 }])
assert.deepEqual(parseSegments('a:b:1.5'), [{ name: 'a:b', sec: 90 }])
assert.equal(serializeSegments([{ name: 'a,b:c', sec: 90 }]), 'a b c:1.5')
assert.equal(parseSegments('x,0,-3,abc'), null)
assert.equal(parseSegments(null), null)
assert.equal(parseSegments('999'), null) // 6시간 초과
assert.equal(parseSegments('300,300')!.length, 1) // 합계 6시간 초과분 버림

// 상태: 15분(도입2/본론8/QnA5), 경고 3분 전
const W = 180
let st = timerState(agenda, 0, W)
assert.equal(st.phase, 'normal'); assert.equal(st.segIndex, 0); assert.equal(st.segRemainingMs, 120_000)
st = timerState(agenda, 125_000, W)
assert.equal(st.segIndex, 1); assert.equal(st.segRemainingMs, 475_000)
st = timerState(agenda, 12 * 60_000, W) // 남은 3분 = 경고 시작
assert.equal(st.phase, 'warning'); assert.equal(st.segIndex, 2)
st = timerState(agenda, 16 * 60_000, W)
assert.equal(st.phase, 'overtime'); assert.equal(st.remainingMs, -60_000); assert.equal(st.segIndex, 2)
assert.equal(st.segRemainingMs, -60_000); assert.equal(st.progress, 1)

// 알림: 지점을 넘을 때 한 번, 백그라운드로 몰아서 넘어도 잡음
assert.deepEqual(alertsBetween(agenda, W, 119_000, 120_500), ['segment'])
assert.deepEqual(alertsBetween(agenda, W, 120_500, 121_000), [])
assert.deepEqual(alertsBetween(agenda, W, 0, 20 * 60_000), ['end', 'warning', 'segment'])
assert.deepEqual(alertsBetween(agenda, W, 5000, 5000), [])
assert.deepEqual(alertsBetween([{ name: '', sec: 60 }], 120, 0, 70_000), ['end']) // 경고 ≥ 전체면 경고 없음

// 표시
assert.equal(formatClock(600_000), '10:00')
assert.equal(formatClock(599_001), '10:00') // 올림
assert.equal(formatClock(1), '00:01')
assert.equal(formatClock(0), '00:00')
assert.equal(formatClock(-500), '00:00')
assert.equal(formatClock(-61_000), '+01:01')
assert.equal(formatClock(3_725_000), '1:02:05')
assert.deepEqual(splitDuration(754_900), { m: 12, s: 34 })
assert.deepEqual(splitDuration(-26_000), { m: 0, s: 26 })

// ±1분
assert.equal(adjustSegment(agenda, 1, 60)[1].sec, 540)
assert.equal(adjustSegment([{ name: '', sec: 60 }], 0, -60)[0].sec, 60) // 최소 30초 미만 거부
assert.equal(adjustSegment([{ name: '', sec: 90 }], 0, -60)[0].sec, 30)
assert.equal(adjustSegment(agenda, 9, 60), agenda)

assert.equal(defaultWarnMin(180), 1); assert.equal(defaultWarnMin(600), 2); assert.equal(defaultWarnMin(900), 3)

console.log('presentation-timer: all checks passed')
