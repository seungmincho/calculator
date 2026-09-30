// 주차 요금 회귀 체크: node scripts/check-parking-fee.ts
import assert from 'node:assert/strict'
import { calcFee, nextIncrease, timeline, parseLocal, minutesBetween, clockAt, encodeRule, decodeRule, PRESETS, type FeeRule } from '../src/utils/parkingFee.ts'

const wed10 = { dow: 3, mod: 600 } // 수 10:00
const p = PRESETS.private as FeeRule // 30분 3,000 + 10분 1,000, 일 최대 30,000, 회차 10분

// 기본 구조: 2시간 30분 = 3,000 + 12 × 1,000
assert.equal(calcFee(p, 150, wed10).fee, 15000)
assert.equal(calcFee(p, 150, wed10).extraUnits, 12)
assert.equal(calcFee(p, 30, wed10).fee, 3000)
assert.equal(calcFee(p, 31, wed10).fee, 4000)
// 회차 10분 이내 무료, 11분부터 기본요금
assert.equal(calcFee(p, 10, wed10).fee, 0)
assert.equal(calcFee(p, 10, wed10).grace, true)
assert.equal(calcFee(p, 11, wed10).fee, 3000)
// 일 최대: 10시간 → 30,000 (원래 3,000+57,000)
const long = calcFee(p, 600, wed10)
assert.equal(long.fee, 30000)
assert.equal(long.capSaving, 60000 - 30000)
// 2일 연속(48시간) → 일 최대 × 2
assert.equal(calcFee(p, 2880, wed10).fee, 60000)
// 경차 50% / 장애인 80%, 10원 절사
assert.equal(calcFee(p, 150, wed10, 50).fee, 7500)
assert.equal(calcFee(PRESETS.seoul3, 25, wed10, 50).fee, 370) // 750 × 0.5 = 375 → 370
assert.equal(calcFee(p, 150, wed10, 80).fee, 3000)
// 서울 공영 1급지 5분 500원: 1시간 = 6,000원
assert.equal(calcFee(PRESETS.seoul1, 60, wed10).fee, 6000)
assert.equal(calcFee(PRESETS.seoul1, 61, wed10).fee, 6500)

// 마트: 구매 3만원 → 1시간 무료, 1시간 30분 주차 → 과금 30분 = 1,000 + 2 × 1,000
const mart = PRESETS.mart as FeeRule
assert.equal(calcFee(mart, 60, wed10).fee, 0)
assert.equal(calcFee(mart, 90, wed10).fee, 3000)
assert.equal(calcFee({ ...mart, spend: 50000 }, 90, wed10).fee, 0)
assert.equal(calcFee({ ...mart, spend: 10000 }, 90, wed10).fee, 9000)

// 다음 인상 시점: 2시간 30분에서 private → 1분 뒤 16,000 (단위 경계 직후)
assert.deepEqual(nextIncrease(p, 150, wed10), { after: 1, fee: 16000 })
assert.deepEqual(nextIncrease(p, 145, wed10), { after: 6, fee: 16000 })
// 회차 안: 5분 → 6분 뒤(11분) 3,000원
assert.deepEqual(nextIncrease(p, 5, wed10), { after: 6, fee: 3000 })
// 마트 무료 1시간 안: 40분 → 21분 뒤(61분) 1,000원
assert.deepEqual(nextIncrease(mart, 40, wed10), { after: 21, fee: 1000 })
// 일 최대 도달 후엔 다음 날(입차 24시간 뒤) 첫 단위에서 오름
const ni = nextIncrease(p, 600, wed10)!
assert.equal(ni.after, 1440 - 600 + 1)
assert.equal(ni.fee, 31000)

// 야간 무료(22~8시) — 수 21:00 입차 2시간 → 21:00~22:00만 과금
const nightFree: FeeRule = { ...(PRESETS.seoul2 as FeeRule), nightStart: 22, nightEnd: 8, nightPct: 100 }
const wed21 = { dow: 3, mod: 21 * 60 }
assert.equal(calcFee(nightFree, 120, wed21).fee, 3000)
assert.equal(calcFee(nightFree, 120, wed21).timeSaving, 3000)
// 주말 50% (토 10:00)
const wk: FeeRule = { ...(PRESETS.seoul2 as FeeRule), weekendPct: 50 }
assert.equal(calcFee(wk, 60, { dow: 6, mod: 600 }).fee, 1500)
assert.equal(calcFee(wk, 60, wed10).fee, 3000)

// 시간 파싱: 자정 넘김, 여러 날
assert.equal(minutesBetween('2026-10-01T22:30', '2026-10-02T01:00'), 150)
assert.equal(minutesBetween('2026-10-01T10:00', '2026-10-03T10:00'), 2880)
assert.equal(minutesBetween('2026-10-01T10:00', '2026-10-01T09:00'), null)
assert.equal(parseLocal('2026-10-01T10:00')!.start.dow, 4) // 2026-10-01 목요일
assert.equal(parseLocal('2026-10-04T00:00')!.start.dow, 0) // 일요일
assert.equal(parseLocal('bad'), null)
assert.deepEqual(clockAt({ dow: 3, mod: 23 * 60 }, 90), { hhmm: '00:30', plusDays: 1 })

// 누적표 마지막 = 실제 요금
const tl = timeline(p, 150, wed10)
assert.equal(tl[tl.length - 1].min, 150)
assert.equal(tl[tl.length - 1].fee, 15000)

// URL 왕복
assert.deepEqual(decodeRule(encodeRule(mart)), mart)
assert.deepEqual(decodeRule(encodeRule(PRESETS.office as FeeRule)), PRESETS.office)
assert.equal(decodeRule('1_2_3'), null)
assert.equal(decodeRule(null), null)
// 0분 / 음수
assert.equal(calcFee(p, 0, wed10).fee, 0)
assert.equal(calcFee(p, -5, wed10).fee, 0)
// unitMin 0 방어
assert.equal(calcFee({ ...p, unitMin: 0 }, 32, wed10).fee, 5000)

console.log('check-parking-fee: OK')
