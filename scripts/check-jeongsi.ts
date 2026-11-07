// node scripts/check-jeongsi.ts (Node 24) — 2027학년도 정시 일정·단계 판정 회귀 체크
// 기대값: 대교협 「2027학년도 대학입학전형시행계획 주요사항」(2025-04-30) 일정 표의 날짜·요일 원문
import assert from 'node:assert/strict'
import { STEPS, APPLY, YEAR, statusOf, describe, focusStep, upcoming, phaseStep, lastDay } from '../src/utils/jeongsi.ts'
import { weekday, isValidDate } from '../src/utils/dday.ts'

const W = '일월화수목금토'
const at = (key: string) => STEPS.find((s) => s.key === key)!

// 원문 날짜·요일 (시작, 끝)
const SRC: Record<string, [string, string?]> = {
  csat: ['2026-11-19 목'], score: ['2026-12-11 금'],
  susiResult: ['2026-12-18 금'], susiReg: ['2026-12-21 월', '2026-12-23 수'],
  susiExtra: ['2026-12-24 목', '2026-12-29 화'], susiExtraReg: ['2026-12-30 수'],
  apply: ['2027-01-04 월', '2027-01-07 목'],
  groupA: ['2027-01-11 월', '2027-01-17 일'], groupB: ['2027-01-18 월', '2027-01-24 일'], groupC: ['2027-01-25 월', '2027-01-31 일'],
  result: ['2027-02-05 금'], reg: ['2027-02-10 수', '2027-02-12 금'],
  extra: ['2027-02-13 토', '2027-02-17 수'], extraReg: ['2027-02-18 목'], addRecruit: ['2027-02-19 금', '2027-02-26 금'],
}
assert.deepEqual(STEPS.map((s) => s.key), Object.keys(SRC), '일정 순서·빠짐')
for (const s of STEPS) {
  const [a, b] = SRC[s.key]
  for (const [d, exp] of [[s.start, a], [s.end, b]] as const) {
    if (!exp) { assert.equal(d, undefined, `${s.key} 끝날 없음`); continue }
    const [date, w] = exp.split(' ')
    assert.ok(d && isValidDate(d), `${s.key} 날짜 형식`)
    assert.equal(d, date, `${s.key} 날짜`)
    assert.equal(W[weekday(d)], w, `${s.key} ${d} 요일`)
  }
}
assert.equal(YEAR, 2027)
// 시간 순서: 앞 일정이 끝나기 전에 다음 일정이 시작하지 않는다(겹침 없음)
for (let i = 1; i < STEPS.length; i++) assert.ok(STEPS[i].start > lastDay(STEPS[i - 1]), `${STEPS[i - 1].key} → ${STEPS[i].key} 순서`)
// 가·나·다군은 7일씩
for (const k of ['groupA', 'groupB', 'groupC']) assert.equal((Date.parse(at(k).end!) - Date.parse(at(k).start)) / 864e5 + 1, 7, `${k} 7일`)
assert.equal(at('extraReg').time, '22:00'); assert.equal(at('susiExtraReg').time, '22:00')

// 상태 경계: 시작일·마지막날 포함
assert.equal(statusOf(APPLY, '2027-01-03'), 'future')
assert.equal(statusOf(APPLY, '2027-01-04'), 'now')
assert.equal(statusOf(APPLY, '2027-01-07'), 'now')
assert.equal(statusOf(APPLY, '2027-01-08'), 'past')
assert.equal(statusOf(at('result'), '2027-02-05'), 'now', '마감일 당일은 진행 중')
assert.equal(statusOf(at('result'), '2027-02-06'), 'past')

// 머리 문구 종류·남은 날
assert.deepEqual(describe(APPLY, '2026-11-07'), { status: 'future', kind: 'future', days: 58 }, '기획 예시 D-58')
assert.deepEqual(describe(APPLY, '2027-01-04'), { status: 'now', kind: 'ongoing', days: 3 }, '첫날: 마감까지 3일')
assert.deepEqual(describe(APPLY, '2027-01-07'), { status: 'now', kind: 'lastDay', days: 0 }, '마지막 날')
assert.deepEqual(describe(at('result'), '2027-02-01'), { status: 'future', kind: 'futureUntil', days: 4 }, '발표 마감까지')
assert.deepEqual(describe(at('result'), '2027-02-05'), { status: 'now', kind: 'lastDay', days: 0 })
assert.deepEqual(describe(at('csat'), '2026-11-19'), { status: 'now', kind: 'today', days: 0 }, '하루짜리 당일')
assert.deepEqual(describe(at('csat'), '2026-11-18'), { status: 'future', kind: 'future', days: 1 })
assert.equal(describe(at('csat'), '2026-11-20').status, 'past')
assert.equal(describe(APPLY, '2026-12-31').days, 4, '해 넘김')

// 기준 일정
assert.equal(focusStep('2026-11-07'), APPLY, '수능 전에도 원서접수 기준')
assert.equal(focusStep('2027-01-03'), APPLY)
assert.equal(focusStep('2027-01-07'), APPLY, '원서 마감일까지 원서접수')
assert.equal(focusStep('2027-01-08')!.key, 'groupA', '원서 끝나면 가군')
assert.equal(focusStep('2027-02-01')!.key, 'result')
assert.equal(focusStep('2027-02-26')!.key, 'addRecruit')
assert.equal(focusStep('2027-02-27'), null, '모두 끝')

// 이어지는 일정: 기준 일정 빼고, 끝나지 않은 것만
assert.deepEqual(upcoming('2026-11-07').map((s) => s.key), ['csat', 'score', 'susiResult'])
assert.deepEqual(upcoming('2026-12-24').map((s) => s.key), ['susiExtra', 'susiExtraReg', 'groupA'], '진행 중 포함, 기준(원서) 제외')
assert.deepEqual(upcoming('2027-02-19').map((s) => s.key), [], '추가모집만 남음')
assert.deepEqual(upcoming('2027-02-18').map((s) => s.key), ['addRecruit'])

// 지금 단계
assert.equal(phaseStep('2026-11-18'), null, '수능 전')
assert.equal(phaseStep('2026-11-19')!.key, 'csat')
assert.equal(phaseStep('2026-12-10')!.key, 'csat')
assert.equal(phaseStep('2027-01-09')!.key, 'apply', '원서 끝~가군 전')
assert.equal(phaseStep('2027-03-01')!.key, 'addRecruit')

console.log('check-jeongsi: all passed')
