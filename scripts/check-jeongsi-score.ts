// node scripts/check-jeongsi-score.ts (Node 24) — 정시 환산점수 계산·검증·URL 회귀 체크
// 기대값은 손으로 계산: 영역 점수 = 비율% × (백분위/100 또는 표준점수/기준 최고점) × 만점
import assert from 'node:assert/strict'
import {
  compute, toQuery, parseScores, parseFormula, templateOf, sanitizeFormula, cloneFormula, parseSaved,
  TEMPLATES, DEFAULT_SCORES, MAX_SAVED, NAME_MAX, type Formula, type Scores,
} from '../src/utils/jeongsiScore.ts'

const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`)
const pts = (r: ReturnType<typeof compute>) => Object.fromEntries(r.parts.map((p) => [p.area, p.points]))
const S = DEFAULT_SCORES
const edit = (f: Formula, patch: Partial<Formula>): Formula => ({ ...cloneFormula(f), ...patch })
const q = (s: Scores, f: Formula) => new URLSearchParams(toQuery(s, f))

// ── 템플릿별 손 계산 (기본 점수: 국 128/91 · 수 127/88 확통 · 영 2 · 한 3 · 탐 65/92, 62/85 사탐)
{
  // 백분위 균등형: 0.25×91×10=227.5, 0.25×88×10=220, 영 2등급 95/100 → 237.5, 탐 (92+85)/2=88.5 → 221.25, 한 3등급 +10
  const r = compute(S, TEMPLATES.pct)
  assert.deepEqual(pts(r), { kor: 227.5, math: 220, eng: 237.5, inq: 221.25, hist: 10 })
  near(r.score, 916.25, '백분위 균등형 총점')
  assert.deepEqual(r.issues, [])
  assert.equal(r.parts[0].max, 250)
}
{
  // 표준점수 인문형: 0.4×128/150×1000, 0.3×127/150×1000=254, 영 2등급 -3, 탐 0.3×(65+62)/160×1000=238.125, 한 +10
  const r = compute(S, TEMPLATES.hum)
  near(pts(r).kor, 400 * 128 / 150, '인문형 국어')
  near(pts(r).math, 254, '인문형 수학')
  assert.equal(pts(r).eng, -3)
  near(pts(r).inq, 238.125, '인문형 탐구')
  near(r.score, 400 * 128 / 150 + 254 - 3 + 238.125 + 10, '인문형 총점')
  assert.equal(r.parts[2].max, null, '영어 가감점은 만점 없음')
  assert.deepEqual(r.issues, [])
}
{
  // 표준점수 자연형(확통·사탐이라 가산 없음): 170.666…, 296.333…, 영 0.15×97/100×1000=145.5, 탐 238.125, 한 +10 = 860.625
  const r = compute(S, TEMPLATES.sci)
  near(r.score, 860.625, '자연형 총점')
  assert.ok(r.parts.every((p) => !p.bonus), '확통·사탐은 가산 없음')
  // 미적·과탐 2과목: 수 0.35×127×1.05/150×1000=311.15, 탐 0.3×0.79375×1.05×1000=250.03125
  const r2 = compute({ ...S, ms: 'calc', t1s: 'sci', t2s: 'sci' }, TEMPLATES.sci)
  near(pts(r2).math, 311.15, '미적 5% 가산')
  near(pts(r2).inq, 250.03125, '과탐 5% 가산')
  near(r2.score, 400 * 128 / 150 * 0.5 + 311.15 + 145.5 + 250.03125 + 10, '자연형 가산 총점')
  assert.ok(r2.parts[1].bonus && r2.parts[3].bonus)
  near(pts(compute({ ...S, ms: 'geo' }, TEMPLATES.sci)).math, 311.15, '기하도 가산')
  // 과탐 1과목만: ((65×1.05/80)+(62/80))/2 × 300 = 244.21875
  near(pts(compute({ ...S, t1s: 'sci' }, TEMPLATES.sci)).inq, 244.21875, '과탐 1과목 가산')
  // 가산 % 0 이면 미적이어도 없음
  const r3 = compute({ ...S, ms: 'calc' }, edit(TEMPLATES.sci, { mathBonus: 0 }))
  near(pts(r3).math, 296.33333333333337, '가산 0%')
  assert.equal(r3.parts[1].bonus, false)
}

// ── 탐구 2과목 평균 vs 상위 1과목
{
  near(pts(compute(S, edit(TEMPLATES.pct, { inq: 'top1' }))).inq, 230, '상위 1과목 = 92 백분위')
  // 가산을 곱한 뒤 고른다: 65/80=0.8125(사탐) < 62×1.1/80=0.8525(과탐) → 과탐 과목
  const r = compute({ ...S, t2s: 'sci' }, edit(TEMPLATES.hum, { inq: 'top1', sciBonus: 10 }))
  near(pts(r).inq, 255.75, '가산 반영 후 상위 1과목')
  assert.equal(r.parts[3].bonus, true)
  // 상위 과목이 사탐이면 가산 표시 없음
  assert.equal(compute({ ...S, t2s: 'sci' }, edit(TEMPLATES.hum, { inq: 'top1', sciBonus: 1 })).parts[3].bonus, false)
}

// ── 영어: 비율 반영 vs 가감점
{
  near(pts(compute({ ...S, e: 4 }, TEMPLATES.pct)).eng, 200, '비율 반영 4등급 80/100')
  // 환산표 최고값으로 정규화: 1등급 200점표면 200/200
  near(pts(compute({ ...S, e: 1 }, edit(TEMPLATES.pct, { engTable: [200, 190, 180, 160, 140, 120, 100, 80, 60] }))).eng, 250, '환산표 정규화')
  assert.equal(pts(compute({ ...S, e: 1 }, TEMPLATES.hum)).eng, 0)
  assert.equal(pts(compute({ ...S, e: 5 }, TEMPLATES.hum)).eng, -15, '가감점 5등급')
  // 가감점 방식이면 영어 비율 칸은 무시하고 합계도 국·수·탐만
  const add = compute(S, edit(TEMPLATES.hum, { ratio: [40, 30, 10, 30] }))
  assert.equal(add.ratioSum, 100)
  assert.deepEqual(add.issues, [])
  // 같은 비율을 비율 반영으로 바꾸면 110%
  const inRatio = compute(S, edit(TEMPLATES.hum, { ratio: [40, 30, 10, 30], eng: 'ratio', engTable: TEMPLATES.pct.engTable }))
  assert.equal(inRatio.ratioSum, 110)
  assert.deepEqual(inRatio.issues, ['ratioSum'])
  near(pts(inRatio).eng, 95, '0.1×95/100×1000')
  // 비율 반영인데 환산표가 모두 0 이하
  assert.deepEqual(compute(S, edit(TEMPLATES.pct, { engTable: Array(9).fill(0) })).issues, ['engTable'])
}

// ── 비율 합 검증
{
  const r = compute(S, edit(TEMPLATES.pct, { ratio: [25, 25, 25, 20] }))
  assert.equal(r.ratioSum, 95)
  assert.deepEqual(r.issues, ['ratioSum'])
  assert.deepEqual(compute(S, edit(TEMPLATES.hum, { ratio: [33.3, 33.3, 0, 33.4] })).issues, [], '소수 비율 합 100')
  // 비율이 틀려도 점수는 계산한다(경고만)
  near(r.score, 916.25 - 221.25 + 0.2 * 885, '경고와 함께 계산')
}

// ── 만점·기준 최고점
{
  near(compute(S, edit(TEMPLATES.pct, { total: 100 })).score, 90.625 + 10, '만점 100 (한국사 가산은 그대로)')
  near(pts(compute(S, edit(TEMPLATES.hum, { base: [128, 150, 80] }))).kor, 400, '기준 = 내 점수면 비율 만점')
  // 백분위 반영이면 기준 최고점은 안 쓴다
  near(compute(S, edit(TEMPLATES.pct, { base: [1, 1, 1] })).score, 916.25, '백분위는 기준 무시')
}

// ── URL
{
  assert.equal(toQuery(S, TEMPLATES.pct), '', '모두 기본이면 쿼리 없음')
  assert.equal(toQuery(S, cloneFormula(TEMPLATES.pct)), '')
  assert.equal(toQuery(S, TEMPLATES.hum), 'tpl=hum')
  const f = edit(TEMPLATES.hum, { ratio: [40, 35, 0, 25], total: 600 })
  assert.equal(toQuery(S, f), 'tpl=hum&fr=40_35_0_25&fn=600')
  const s: Scores = { ...S, k: 131, kp: 95, ms: 'calc', e: 1, t2s: 'sci', t1: 67.5 }
  assert.equal(toQuery(s, TEMPLATES.pct), 'k=131&kp=95&ms=calc&e=1&t1=67.5&t2s=sci')
  // 왕복
  const g = edit(TEMPLATES.sci, {
    idx: 'pct', inq: 'top1', eng: 'add', engTable: [0, -0.5, -1, -2.5, -4, -6, -8, -10, -12],
    histTable: [0, 0, 0, -0.2, -0.4, -0.6, -0.8, -1, -1.2], mathBonus: 7.5, sciBonus: 0, total: 800, base: [147, 139, 72],
  })
  const back = q(s, g)
  assert.deepEqual(parseScores((k) => back.get(k)), s, '점수 왕복')
  assert.deepEqual(parseFormula((k) => back.get(k)), g, '공식 왕복')
  for (const id of ['pct', 'hum', 'sci'] as const) {
    const p = q(S, TEMPLATES[id])
    assert.deepEqual(parseFormula((k) => p.get(k)), TEMPLATES[id], `${id} 템플릿 왕복`)
  }
  // 빈 쿼리 = 기본
  const none = () => null
  assert.deepEqual(parseScores(none), S)
  assert.deepEqual(parseFormula(none), TEMPLATES.pct)
  // 틀린 값은 버리고 기본값
  const bad = new URLSearchParams('k=250&kp=-1&e=1.5&h=10&ms=foo&t1s=x&tpl=nope&fr=1_2_3&fi=abc&fn=0&fet=a_b')
  assert.deepEqual(parseScores((k) => bad.get(k)), S, '범위 밖 점수 무시')
  assert.deepEqual(parseFormula((k) => bad.get(k)), TEMPLATES.pct, '틀린 공식 필드 무시')
  // 경계값 허용
  const edge = new URLSearchParams('k=200&kp=0&e=9&h=1')
  assert.deepEqual(parseScores((k) => edge.get(k)), { ...S, k: 200, kp: 0, e: 9, h: 1 })
  // /csat-grade 가 점수만 넘기면 공식은 기본 템플릿
  const link = new URLSearchParams('k=131&kp=95&m=135&mp=96&ms=calc&e=1&h=2&t1=68&t1p=97&t1s=sci&t2=64&t2p=90&t2s=sci')
  assert.deepEqual(parseScores((k) => link.get(k)), { k: 131, kp: 95, m: 135, mp: 96, ms: 'calc', e: 1, h: 2, t1: 68, t1p: 97, t1s: 'sci', t2: 64, t2p: 90, t2s: 'sci' })
}

// ── 템플릿 판별·저장값 검증
{
  assert.equal(templateOf(cloneFormula(TEMPLATES.hum)), 'hum')
  assert.equal(templateOf(edit(TEMPLATES.hum, { total: 999 })), null)
  assert.deepEqual(sanitizeFormula(JSON.parse(JSON.stringify(TEMPLATES.sci))), TEMPLATES.sci)
  assert.equal(sanitizeFormula({ ...TEMPLATES.sci, ratio: [101, 0, 0, 0] }), null, '비율 범위')
  assert.equal(sanitizeFormula({ ...TEMPLATES.sci, engTable: [1, 2] }), null, '등급표 9칸')
  const { total: _t, ...noTotal } = TEMPLATES.sci
  void _t
  assert.equal(sanitizeFormula(noTotal), null, '필드 빠짐')
  assert.equal(sanitizeFormula(null), null)

  assert.deepEqual(parseSaved(null), [])
  assert.deepEqual(parseSaved('{oops'), [])
  assert.deepEqual(parseSaved('{"a":1}'), [])
  const item = { name: '  가군 A대  ', group: 'ga', formula: TEMPLATES.hum }
  const many = JSON.stringify([...Array(8)].map(() => item).concat([{ ...item, group: 'zz' }]))
  const saved = parseSaved(many)
  assert.equal(saved.length, MAX_SAVED, '최대 6개')
  assert.equal(saved[0].name, '가군 A대', '이름 trim')
  assert.equal(parseSaved(JSON.stringify([{ ...item, group: 'zz' }, { ...item, name: '' }, { ...item, formula: {} }])).length, 0, '틀린 항목 버림')
  assert.equal(parseSaved(JSON.stringify([{ ...item, name: 'x'.repeat(60) }]))[0].name.length, NAME_MAX)
}

console.log('check-jeongsi-score: all passed')
