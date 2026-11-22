// node scripts/check-quit-smoking.ts (Node 24) — 금연 계산기 경과 시간·아낀 돈·회복 단계·URL·저장 회귀 체크
// 기대값은 손으로 계산: 하루 비용 = 하루 개비 × 한 갑 가격 ÷ 한 갑 개비 수, 액상은 월 비용 × 12 ÷ 365
import assert from 'node:assert/strict'
import {
  elapsed, split, dday, perDay, savedWon, notSmoked, projection, lifeMinutes, withdrawal, manWon,
  STEPS, stepStatus, nextStep, formatD, parseD, parseState, toQuery, parseSaved,
  DEFAULT, PRICE, MIN, HOUR, DAY, YEAR, EXAMPLE_MS, type State,
} from '../src/utils/quitSmoking.ts'

let n = 0
const eq = (a: unknown, b: unknown, msg?: string) => { assert.deepEqual(a, b, msg); n++ }

// ── 경과 시간
const now = new Date(2026, 10, 22, 12, 0).getTime()
eq(elapsed(null, 0), 30 * DAY, '서버: 30일 예시')
eq(elapsed(null, now), EXAMPLE_MS, '시작일 없음: 30일 예시')
eq(elapsed(now - 5 * DAY, 0), EXAMPLE_MS, '시계 전(서버)은 예시')
eq(elapsed(now - 45 * DAY, now), 45 * DAY)
eq(elapsed(now, now), 0, '방금 시작')
eq(elapsed(now + HOUR, now), 0, '미래 시작은 0(음수 금지)')
eq(elapsed(now + 10 * YEAR, now), 0)
eq(split(30 * DAY), { d: 30, h: 0, m: 0 })
eq(split(30 * DAY - MIN), { d: 29, h: 23, m: 59 }, '경계 1분 전')
eq(split(DAY + HOUR + MIN), { d: 1, h: 1, m: 1 })
eq(split(0), { d: 0, h: 0, m: 0 })
eq(split(59 * MIN), { d: 0, h: 0, m: 59 })
eq(dday(335 * DAY), 335)
eq(dday(334 * DAY + HOUR), 335, '하루 미만 남은 부분은 올림')
eq(dday(DAY), 1)
eq(dday(DAY - MIN), 0, '하루 미만은 0(시간으로 표시)')

// ── 돈·개비: 기본 10개비, 4,500원/20개비 → 개비당 225원, 하루 2,250원
eq(perDay(DEFAULT), 2250)
eq(savedWon(DEFAULT, 30 * DAY), 67_500, '2,250 × 30')
eq(notSmoked(DEFAULT, 30 * DAY), 300)
eq(notSmoked(DEFAULT, 30 * DAY)! / DEFAULT.c, 15, '15갑')
eq(lifeMinutes(DEFAULT, 30 * DAY), 6000, '300개비 × 20분 = 4일 4시간')
eq(split(6000 * MIN), { d: 4, h: 4, m: 0 })
eq(savedWon(DEFAULT, 12 * HOUR), 1125, '반나절')
eq(notSmoked(DEFAULT, 12 * HOUR), 5)
eq(notSmoked(DEFAULT, DAY - MIN), 9, '하루 1분 전: 9.993 → 9')
eq(notSmoked(DEFAULT, DAY), 10)
eq(savedWon(DEFAULT, 0), 0)
eq(notSmoked(DEFAULT, 0), 0)
// 20개비, 45일 → 900개비, 202,500원
const pack: State = { ...DEFAULT, n: 20 }
eq(savedWon(pack, 45 * DAY), 202_500)
eq(notSmoked(pack, 45 * DAY), 900)
eq(manWon(savedWon(pack, 45 * DAY)), '20만 2,500')
// 궐련형: 10스틱, 4,800원/20스틱 → 스틱당 240원, 하루 2,400원, 30일 72,000원. 수명은 궐련만
const heat: State = { ...DEFAULT, k: 'heat', p: PRICE.heat }
eq(perDay(heat), 2400)
eq(savedWon(heat, 30 * DAY), 72_000)
eq(notSmoked(heat, 30 * DAY), 300)
eq(lifeMinutes(heat, 30 * DAY), null)
// 한 갑 10개비짜리: 하루 10개비 × 4,500 ÷ 10 = 4,500원
eq(perDay({ ...DEFAULT, c: 10 }), 4500)
// 액상: 월 10만 원 → 하루 1,200,000/365 = 3,287.67…, 30일 98,630.13… → 98,630. 개비·수명 없음
const liquid: State = { ...DEFAULT, k: 'liquid', p: PRICE.liquid }
eq(savedWon(liquid, 30 * DAY), 98_630)
eq(savedWon(liquid, YEAR), 1_200_000, '1년 = 12달')
eq(notSmoked(liquid, 30 * DAY), null)
eq(lifeMinutes(liquid, 30 * DAY), null)
// 이어 가면: 2,250 × 365 = 821,250 / 5년 4,106,250 / 10년 8,212,500. 액상 120만·600만·1,200만
eq([1, 5, 10].map((y) => projection(DEFAULT, y)), [821_250, 4_106_250, 8_212_500])
eq([1, 5, 10].map((y) => projection(liquid, y)), [1_200_000, 6_000_000, 12_000_000])
// 50년 같은 큰 값도 정수·음수 없음
eq(savedWon({ ...DEFAULT, n: 100, p: 100_000, c: 1 }, 50 * YEAR), 100 * 100_000 * 365 * 50)

// ── 금단 증상 시기
eq(withdrawal(0), 'peak')
eq(withdrawal(3 * DAY - MIN), 'peak')
eq(withdrawal(3 * DAY), 'easing')
eq(withdrawal(28 * DAY - MIN), 'easing')
eq(withdrawal(28 * DAY), null)

// ── 금액 표기
eq(manWon(0), '0')
eq(manWon(2500), '2,500')
eq(manWon(10_000), '1만')
eq(manWon(67_500), '6만 7,500')
eq(manWon(8_212_500), '821만 2,500')
eq(manWon(100_000_000), '1억')
eq(manWon(123_456_789), '1억 2,345만 6,789')
eq(manWon(-5), '0')

// ── 회복 단계(경계 시각이면 지난 것)
const st = (id: string) => STEPS.find((x) => x.id === id)!
eq(STEPS.length, 8)
eq(STEPS.every((x, i) => i === 0 || x.at > STEPS[i - 1].at), true, '시점 오름차순')
eq(stepStatus(st('min20'), 20 * MIN - 1), 'todo')
eq(stepStatus(st('min20'), 20 * MIN), 'done', '정확히 20분')
eq(stepStatus(st('h12'), 12 * HOUR), 'done')
eq(stepStatus(st('w2to12'), 14 * DAY - MIN), 'todo')
eq(stepStatus(st('w2to12'), 14 * DAY), 'now', '정확히 2주: 진행 중')
eq(stepStatus(st('w2to12'), 84 * DAY - MIN), 'now')
eq(stepStatus(st('w2to12'), 84 * DAY), 'done', '정확히 12주')
eq(stepStatus(st('m1to9'), 30 * DAY), 'now')
eq(stepStatus(st('m1to9'), 270 * DAY), 'done')
eq(stepStatus(st('y1'), 365 * DAY - MIN), 'todo')
eq(stepStatus(st('y1'), 365 * DAY), 'done')
eq(stepStatus(st('y15'), 15 * 365 * DAY), 'done')
eq(nextStep(0), { i: 0, step: st('min20'), left: 20 * MIN })
eq(nextStep(19 * MIN)?.left, MIN)
eq(nextStep(20 * MIN), { i: 1, step: st('h12'), left: 11 * HOUR + 40 * MIN }, '20분 정각 → 다음은 12시간')
eq(nextStep(30 * DAY), { i: 4, step: st('y1'), left: 335 * DAY }, '30일째 → 1년까지 335일')
eq(dday(nextStep(30 * DAY)!.left), 335)
eq(nextStep(365 * DAY)?.step.id, 'y5')
eq(nextStep(365 * DAY)?.left, 4 * 365 * DAY)
eq(nextStep(15 * YEAR - MIN)?.step.id, 'y15')
eq(nextStep(15 * YEAR), null, '모두 지남')

// ── 날짜 문자열
const t0 = new Date(2026, 9, 23, 9, 5).getTime()
eq(formatD(t0), '2026-10-23T09:05')
eq(parseD('2026-10-23T09:05'), t0)
eq(parseD('2026-10-23'), new Date(2026, 9, 23).getTime(), '시각 없으면 0시')
eq(parseD('2026-02-30T10:00'), null, '없는 날짜')
eq(parseD('2026-13-01'), null)
eq(parseD('2026-10-23T24:00'), null)
eq(parseD('1899-12-31'), null)
eq(parseD('abc'), null)
eq(parseD(null), null)
eq(parseD(formatD(now)), now, '왕복')

// ── URL
const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
eq(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
eq(parseState(() => null), DEFAULT, '키가 없으면 기본값')
const a: State = { d: t0, n: 20, k: 'cig', p: 4500, c: 20 }
eq(toQuery(a), 'd=2026-10-23T09:05&n=20', '콜론은 그대로')
eq(back(a), a)
const b: State = { d: null, n: 15, k: 'heat', p: 5000, c: 10 }
eq(toQuery(b), 'n=15&k=heat&p=5000&c=10')
eq(back(b), b)
eq(toQuery(heat), 'k=heat', '궐련형 기본 가격 4,800원은 생략')
eq(back(heat), heat)
eq(toQuery(liquid), 'k=liquid')
eq(back(liquid), liquid)
eq(toQuery({ ...liquid, p: 150_000, n: 30, c: 5 }), 'k=liquid&p=150000', '액상은 n·c 를 싣지 않는다')
eq(parseState((k) => ({ k: 'liquid', n: '30', c: '5' })[k] ?? null), liquid, '액상이면 n·c 무시')
// 종류에 맞지 않는 가격은 그 종류 기본값: 궐련 100,000원 초과, 액상 1,000원 미만
eq(parseState((k) => ({ p: '200000' })[k] ?? null).p, 4500)
eq(parseState((k) => ({ k: 'liquid', p: '200000' })[k] ?? null).p, 200_000)
eq(parseState((k) => ({ k: 'liquid', p: '500' })[k] ?? null).p, 100_000)
// 틀린 값은 기본값
const bad = new URLSearchParams('d=2026-02-30&n=0&k=pipe&p=-1&c=1.5')
eq(parseState((k) => bad.get(k)), DEFAULT)
const big = new URLSearchParams('n=101&c=101&p=abc')
eq(parseState((k) => big.get(k)), DEFAULT)
// 경계 허용
const edge = new URLSearchParams('n=100&c=1&p=100')
eq(parseState((k) => edge.get(k)), { ...DEFAULT, n: 100, c: 1, p: 100 })
// 미래 시작일도 받아서 경과 0
const future = new URLSearchParams(`d=${formatD(now + 3 * DAY)}`)
const fs = parseState((k) => future.get(k))
eq(fs.d, now + 3 * DAY)
eq(elapsed(fs.d, now), 0)
eq(savedWon(fs, elapsed(fs.d, now)), 0)
eq(notSmoked(fs, elapsed(fs.d, now)), 0)

// ── 저장
eq(parseSaved(null), { s: null, best: 0 })
eq(parseSaved('{bad'), { s: null, best: 0 })
eq(parseSaved('[1]'), { s: null, best: 0 }, '배열은 q 가 없어 비움')
eq(parseSaved(JSON.stringify({ q: toQuery(a), best: 40 * DAY })), { s: a, best: 40 * DAY })
eq(parseSaved(JSON.stringify({ q: '', best: -1 })), { s: DEFAULT, best: 0 }, '음수 기록 버림')
eq(parseSaved(JSON.stringify({ best: 5 * DAY })), { s: null, best: 5 * DAY })
eq(parseSaved(JSON.stringify({ q: 1, best: 'x' })), { s: null, best: 0 })

console.log(`check-quit-smoking: ${n} passed`)
