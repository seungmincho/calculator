// 중소기업 취업자 소득세 감면 계산기(/sme-tax-exemption) 회귀 체크: node scripts/check-sme-tax-exemption.ts
// page.tsx 본문·FAQ 숫자는 EXAMPLES로 렌더링되므로 여기서 값을 고정한다.
import assert from 'node:assert/strict'
import { calc, DEFAULT_INPUT } from '../src/utils/yearEndTax.ts'
import { analyze, ageMonths, youthUntil, endMonth, yearTax, isDate, EXAMPLES, type SmeInput } from '../src/utils/smeTaxExemption.ts'

const base = EXAMPLES.d
const run = (patch: Partial<SmeInput>) => analyze({ ...base, ...patch })

// ── 날짜 ──
assert.equal(isDate('2025-02-29'), false)
assert.equal(isDate('2024-02-29'), true)
assert.equal(isDate('2025-3-2'), false)

// ── 나이: 근로계약 체결일 현재 만 나이, 병역 6년 한도 차감 (조특령 §27①1호) ──
assert.equal(ageMonths('1991-03-15', '2026-03-14'), 35 * 12 - 1) // 생일 전날 만 34세
assert.equal(ageMonths('1991-03-15', '2026-03-15'), 35 * 12) // 생일 당일 만 35세
assert.equal(ageMonths('2000-01-31', '2000-02-29'), 0) // 해당 일 없는 달은 다음 달 1일에 한 달
assert.equal(ageMonths('2000-01-31', '2000-03-01'), 1)
assert.deepEqual(run({ birth: '1991-03-15', start: '2026-03-14', military: 0 }).reasons, [])
assert.deepEqual(run({ birth: '1991-03-15', start: '2026-03-15', military: 0 }).reasons, ['old'])
assert.deepEqual(run({ birth: '1991-03-15', start: '2026-03-15', military: 1 }).reasons, []) // 병역 1개월 빼면 34세 11개월
assert.equal(youthUntil('1991-03-15', 0), '2026-03-14')
assert.equal(youthUntil('1991-03-15', 1), '2026-04-14')
assert.equal(youthUntil('1991-03-15', 100), youthUntil('1991-03-15', 72)) // 6년 한도
assert.equal(youthUntil('1991-01-31', 1), '2026-02-28') // 2026-02-31 없음 → 3월 1일에 도달
{ // 병역 9년도 6년만: 1984-06-01생, 2026-03-03 계약(만 41세 9개월) − 72개월 = 35세 9개월 → 탈락
  const r = run({ birth: '1984-06-01', start: '2026-03-03', military: 108 })
  assert.deepEqual([r.age, r.military, r.adjAge, r.reasons], [41, 72, 35, ['old']])
}
assert.deepEqual(run({ birth: '2011-06-01', start: '2026-03-03' }).reasons, ['young'])
assert.deepEqual(run({ kind: 'senior', birth: '1966-04-01', start: '2026-03-03' }).reasons, ['senior'])
assert.deepEqual(run({ kind: 'senior', birth: '1966-03-03', start: '2026-03-03' }).reasons, [])
// 적용 기한·시작일 (§30①): 2026-12-31까지 취업, 60세 이상·장애인은 2014년부터
assert.deepEqual(run({ start: '2027-01-04' }).reasons, ['deadline'])
assert.deepEqual(run({ start: '2026-12-31' }).reasons, [])
assert.deepEqual(run({ kind: 'disabled', start: '2013-05-02', birth: '1980-01-01' }).reasons, ['early'])
assert.deepEqual(run({ kind: 'careerBreak', start: '2013-05-02', birth: '1980-01-01' }).reasons, [])
assert.deepEqual(run({ excluded: true }).reasons, ['industry'])

// ── 종료: 취업일 + N년 − 1일이 속하는 달 말일 ──
assert.equal(endMonth('2025-03-02', 5).date, '2030-03-31')
assert.equal(endMonth('2022-03-15', 5).date, '2027-03-31')
assert.equal(endMonth('2025-03-01', 5).date, '2030-02-28')
assert.equal(endMonth('2024-01-01', 3).date, '2026-12-31')
assert.equal(endMonth('2024-02-29', 3).date, '2027-02-28')

// ── 이직: 기간·나이는 처음 감면받은 취업일 기준 (§30① 후단) ──
{
  const r = run({ start: '2026-02-02', prev: '2023-07-03', birth: '1990-01-10', military: 0 })
  assert.deepEqual([r.moved, r.first, r.end.date, r.endIfNew.date, r.age, r.reasons], [true, '2023-07-03', '2028-07-31', '2031-02-28', 33, []])
  assert.equal(run({ prev: '2026-01-01' }).moved, false) // 지금 회사보다 늦은 날은 무시
}

// ── 세금: 기간 100%·90%면 연말정산 계산기(calc sme)와 같다 (결정적 난수 300건) ──
let seed = 7
const rnd = (n: number) => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) % n
const BASE = { ...DEFAULT_INPUT, credit: 0, debit: 0, culture: 0, market: 0, transport: 0 }
for (let i = 0; i < 300; i++) {
  const salary = rnd(150) * 1_000_000 + rnd(1_000_000)
  assert.equal(yearTax(salary, 90, 12, 12).after, calc({ ...BASE, salary, sme: true }).totalTax, `calc ${salary}`)
}
// 감면 0개월이면 그대로
assert.equal(yearTax(36_000_000, 90, 0, 12).saving, 0)

// ── 연중 종료 비율 (§27⑧ 감면대상 총급여/총급여): 2030년 3/12 ──
{
  const r = analyze(base)
  const last = r.rows.at(-1)!
  assert.deepEqual([last.year, last.work, last.months, last.gross], [2030, 12, 3, 36_000_000])
  assert.equal(last.reduction, Math.floor((last.computedTax * 90 * 3) / 1200))
  const first = r.rows[0] // 2025년 3월 취업: 10개월 근무, 10개월 모두 감면
  assert.deepEqual([first.year, first.work, first.months, first.gross], [2025, 10, 10, 30_000_000])
}

// ── EXAMPLES (page.tsx 본문·FAQ에 찍히는 숫자) ──
{ // 기본값: 청년 90%, 2030-03-31 종료. 2026년 감면세액 185.49만이지만 근로소득세액공제가 줄고 원래 세금이 118만이라 117.9만 감소
  const r = analyze(EXAMPLES.d)
  assert.deepEqual([r.status, r.pct, r.end.date, r.age, r.adjAge], ['ok', 90, '2030-03-31', 25, 24])
  assert.deepEqual([r.reduction, r.now!.earnedCut, r.now!.before, r.now!.after, r.saving], [1_854_900, 644_401, 1_184_437, 4_951, 1_179_486])
  assert.deepEqual([r.remaining, r.past, r.rows.length], [4_984_442, 530_337, 6])
}
{ // 병역 차감: 만 35세 → 21개월 빼면 33세, 청년 인정 계약일 2025-01-09 → 2026-10-09
  const r = analyze(EXAMPLES.army)
  assert.deepEqual([r.eligible, r.age, r.adjAge, r.untilNoMil, r.until], [true, 35, 33, '2025-01-09', '2026-10-09'])
  assert.deepEqual(analyze({ ...EXAMPLES.army, military: 0 }).reasons, ['old'])
}
{ // 60세 이상 70%·3년: 2026-03-03 → 2029-03-31. 2027년 감면 = 133.875만 × 70%
  const r = analyze(EXAMPLES.senior)
  assert.deepEqual([r.pct, r.years, r.end.date, r.age], [70, 3, '2029-03-31', 61])
  const y27 = r.rows.find((x) => x.year === 2027)!
  assert.deepEqual([y27.computedTax, y27.reduction, y27.saving], [1_338_750, 937_125, 471_336])
  assert.deepEqual([r.saving, r.remaining], [252_381, 1_312_886])
}
{ // 연봉 6,000만: 산출세액 × 90%가 200만을 넘어 200만 한도
  const r = analyze(EXAMPLES.high)
  assert.deepEqual([r.reduction, r.saving, r.end.date], [2_000_000, 1_892_889, '2031-01-31'])
}

console.log('check-sme-tax-exemption OK')
