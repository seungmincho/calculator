// 혈당 판정 회귀 체크: node scripts/check-blood-sugar.ts
import {
  classify, classifyA1c, eAG, a1cFromEag, toMmol, toMg, fmt, validMg,
  sanitizeRecords, inPeriod, stats, sortRecords, csvCell, type Ctx,
} from '../src/utils/bloodSugar.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const k = (v: number, c: Ctx) => classify(v, c).key

// 저혈당: <54 2단계, 54–69 1단계 (모든 시점)
eq([53.9, 54, 69, 69.9, 70].map(v => k(v, 'fasting')), ['low2', 'low', 'low', 'low', 'fNormal'], '저혈당 경계')
eq(k(60, 'afterMeal'), 'low', '식후 저혈당')
eq(k(50, 'random'), 'low2', '무작위 저혈당')

// 공복: <100 정상, 100–125 공복혈당장애, ≥126 당뇨
eq([99, 99.9, 100, 125, 125.9, 126].map(v => k(v, 'fasting')), ['fNormal', 'fNormal', 'fIFG', 'fIFG', 'fIFG', 'fDM'], '공복 경계')
eq(classify(126, 'fasting').tone, 'danger', '공복 126 톤')
eq(classify(110, 'fasting').tone, 'warn', '공복 110 톤')

// 식후 2시간: <140 정상, 140–199 내당능장애, ≥200 당뇨
eq([139, 139.9, 140, 199, 199.9, 200].map(v => k(v, 'afterMeal')), ['pNormal', 'pNormal', 'pIGT', 'pIGT', 'pIGT', 'pDM'], '식후 경계')

// 식전·취침 전·무작위: 진단 기준 없음, ≥200만 high
for (const c of ['beforeMeal', 'bedtime', 'random'] as Ctx[]) {
  eq([70, 130, 199, 200].map(v => k(v, c)), ['ok', 'ok', 'ok', 'high'], `${c} 경계`)
}

// HbA1c: <5.7 정상, 5.7–6.4 전단계, ≥6.5 당뇨
eq([5.6, 5.69, 5.7, 6.4, 6.49, 6.5].map(classifyA1c), ['normal', 'normal', 'pre', 'pre', 'pre', 'diabetes'], 'A1c 경계')
// ADAG: A1c 6% → 126, 7% → 154, 8% → 183 (ADA eAG 표)
eq([5, 6, 7, 8, 9, 10].map(a => Math.round(eAG(a))), [97, 126, 154, 183, 212, 240], 'eAG 표')
eq(Math.round(a1cFromEag(154) * 10) / 10, 7, 'eAG 역산')

// 단위 변환 ÷18.016
eq(toMmol(126).toFixed(1), '7.0', '126 mg = 7.0 mmol')
eq(toMmol(100).toFixed(1), '5.6', '100 mg = 5.6 mmol')
eq(Math.round(toMg(7)), 126, '7.0 mmol = 126 mg')
eq([fmt(99.6, 'mg'), fmt(70, 'mmol')], ['100', '3.9'], 'fmt')
eq(k(toMg(7.0), 'fasting'), 'fDM', 'mmol 7.0 공복 당뇨')
eq(k(toMg(6.9), 'fasting'), 'fIFG', 'mmol 6.9 공복 장애')
eq([validMg(9), validMg(10), validMg(600), validMg(601), validMg(NaN)], [false, true, true, false, false], '입력 범위')

// 저장값 정리: 예전 형식 그대로 유지, 깨진 값만 제외
const old = [
  { id: 'a', value: 95, timing: 'fasting', date: '2026-09-30', time: '07:10', note: '', createdAt: 1 },
  { id: 'b', value: 150, timing: 'afterMeal', date: '2026-09-30', time: '13:00', note: 'x', createdAt: 2 },
  { id: 'c', value: 'abc', timing: 'fasting', date: '2026-09-30', time: '08:00', note: '', createdAt: 3 },
  { id: 'd', value: 120, timing: 'weird', date: '2026-09-24', time: '08:00', note: '', createdAt: 4 },
  null,
]
const s = sanitizeRecords(old)
eq(s.map(r => r.id), ['a', 'b', 'd'], '정리 개수')
eq(s[0], old[0], '예전 레코드 무변경')
eq(s[2].timing, 'random', '알 수 없는 시점 → 무작위')
eq(sanitizeRecords('nope'), [], '배열 아님')
eq(sortRecords(s).map(r => r.id), ['b', 'a', 'd'], '측정 일시 정렬')

// 기간: 오늘 포함 7일
eq(inPeriod(s, 7, '2026-09-30').map(r => r.id), ['a', 'b', 'd'], '7일 포함(9/24)')
eq(inPeriod(s, 7, '2026-10-01').map(r => r.id), ['a', 'b'], '7일 제외(9/24)')

// 통계·TIR(70–180 경계 포함)
const mk = (v: number, timing: Ctx = 'random') => ({ id: String(v), value: v, timing, date: '2026-10-01', time: '09:00', note: '', createdAt: 0 })
const st = stats([mk(69), mk(70), mk(180), mk(181), mk(100, 'fasting')])!
eq(st.tir, { below: 20, inRange: 60, above: 20 }, 'TIR 경계')
eq([st.count, st.min, st.max, st.avg], [5, 69, 181, 120], '기본 통계')
eq(st.byCtx.fasting, { avg: 100, count: 1 }, '시점별 평균')
eq(stats([]), null, '빈 통계')

eq([csvCell('a"b'), csvCell('=1+1')], ['"a""b"', `"'=1+1"`], 'CSV')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-blood-sugar: all passed')
