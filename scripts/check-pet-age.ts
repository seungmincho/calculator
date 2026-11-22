// node scripts/check-pet-age.ts (Node 24) — 강아지·고양이 사람 나이·생애 단계·칼로리·사료량·URL 회귀 체크
// 기대값은 손으로 계산: RER = 70 × kg^0.75 (7^0.75 = 4.303517, 4^0.75 = 2.828427, 5^0.75 = 3.343702, 10^0.75 = 5.623413, 2^0.75 = 1.681793)
import assert from 'node:assert/strict'
import {
  humanAge, ucsdAge, sizeOf, stageOf, rer, factorOf, feeding, monthsFromBirth, parseState, toQuery, sizeFor,
  DOG_TABLE, CAT_POINTS, LB, DEFAULT, DEF_W, type State, type Size,
} from '../src/utils/petAge.ts'

const near = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 0.01, `${msg ?? ''} ${a} ≠ ${b}`)
const dog = (z: Size, months: number) => humanAge('dog', z, months)

// ── 개 표 값(AKC 1~16살, IDEXX 17~20살)
const expect: Record<Size, Record<number, number>> = {
  small: { 1: 15, 2: 24, 5: 36, 10: 56, 15: 76, 16: 80, 17: 84, 20: 96 },
  medium: { 1: 15, 2: 24, 5: 36, 10: 60, 15: 83, 16: 87, 17: 92, 20: 105 },
  large: { 1: 15, 2: 24, 5: 36, 10: 66, 15: 93, 16: 99, 17: 104, 20: 120 },
  giant: { 1: 12, 2: 22, 5: 45, 10: 79, 15: 114, 16: 121 },
}
for (const z of Object.keys(expect) as Size[]) {
  for (const [y, v] of Object.entries(expect[z])) {
    const r = dog(z, Number(y) * 12)
    assert.equal(r.value, v, `${z} ${y}살`)
    assert.equal(r.estimated, false, `${z} ${y}살은 표 값`)
  }
}
assert.equal(DOG_TABLE.small.length, 20)
assert.equal(DOG_TABLE.giant.length, 16, '초대형은 AKC 16살까지만')
// 표 안에서 해마다 늘어난다
for (const z of Object.keys(DOG_TABLE) as Size[]) DOG_TABLE[z].forEach((v, i, a) => i && assert.ok(v > a[i - 1], `${z} ${i + 1}살`))

// 표 밖: 초대형 17살 = 121 + 7(15→16 증가폭) = 128, 20살 = 149 — 추정
assert.deepEqual(dog('giant', 17 * 12), { value: 128, estimated: true })
assert.deepEqual(dog('giant', 20 * 12), { value: 149, estimated: true })
assert.deepEqual(dog('small', 21 * 12), { value: 100, estimated: true })
assert.equal(dog('large', 20 * 12).estimated, false)

// ── 개월 보간: 5살 6개월 소형 36→40 의 절반 = 38, 중형 36→42 = 39, 대형 36→45 = 40.5, 초대형 45→49 = 47
assert.equal(dog('small', 66).value, 38)
assert.equal(dog('medium', 66).value, 39)
assert.equal(dog('large', 66).value, 40.5)
assert.equal(dog('giant', 66).value, 47)
// 1살 3개월 소형: 15 + 9 × 3/12 = 17.25
assert.equal(dog('small', 15).value, 17.25)
// 1살 미만: 원문 표가 없어 0(출생)→1살 값 직선 보간, 추정 표시. 6개월 소형 7.5, 초대형 6
assert.deepEqual(dog('small', 6), { value: 7.5, estimated: true })
assert.deepEqual(dog('giant', 6), { value: 6, estimated: true })
assert.deepEqual(dog('small', 0), { value: 0, estimated: true })
assert.equal(dog('small', 12).estimated, false)

// ── 크기 경계(AKC: 20lb 이하 · 21-50 · 51-100 · 100+). 20lb = 9.0718kg, 50lb = 22.6796kg, 100lb = 45.3592kg
near(20 * LB, 9.0718)
assert.equal(sizeOf(7), 'small', '기본 7kg')
assert.equal(sizeOf(9.07), 'small')
assert.equal(sizeOf(20 * LB), 'small', '20lb 는 소형')
assert.equal(sizeOf(9.08), 'medium')
assert.equal(sizeOf(22.67), 'medium')
assert.equal(sizeOf(22.68), 'large')
assert.equal(sizeOf(45.35), 'large')
assert.equal(sizeOf(100 * LB), 'large', '100lb 는 대형')
assert.equal(sizeOf(45.36), 'giant')
assert.equal(sizeFor({ ...DEFAULT, w: 30 }), 'large')
assert.equal(sizeFor({ ...DEFAULT, w: 30, z: 'medium' }), 'medium', '직접 지정이 우선')

// ── UCSD: 16·ln(살)+31. 1살 31, 2살 42.09, 5살 56.75, 10살 67.84, 6개월 19.91, 1개월은 음수라 null
near(ucsdAge(12)!, 31)
near(ucsdAge(24)!, 42.0904)
near(ucsdAge(60)!, 56.7510)
near(ucsdAge(120)!, 67.8414)
near(ucsdAge(6)!, 19.9096)
assert.equal(ucsdAge(1), null)
assert.equal(ucsdAge(0), null)
assert.ok(ucsdAge(2)! > 0 && ucsdAge(2)! < 3, '2개월 = 2.33')

// ── 고양이(iCatCare): 1개월 1, 6개월 10, 9개월 12+3×2/5 = 13.2, 1살 15, 15개월 18, 2살 24, 5살 36, 10살 56, 15살 76, 20살 96, 25살 116
const cat = (months: number) => humanAge('cat', 'small', months)
for (const [mo, v] of [[1, 1], [6, 10], [12, 15], [15, 18], [24, 24], [60, 36], [120, 56], [180, 76], [240, 96], [300, 116]] as const) {
  assert.deepEqual(cat(mo), { value: v, estimated: false }, `고양이 ${mo}개월`)
}
near(cat(9).value, 13.2)
assert.deepEqual(cat(26 * 12), { value: 120, estimated: true }, '25살 뒤는 +4 연장, 추정')
assert.equal(CAT_POINTS[CAT_POINTS.length - 1][0], 300)
// 2살 이후 매년 +4
for (let y = 3; y <= 25; y++) assert.equal(cat(y * 12).value - cat((y - 1) * 12).value, 4)

// ── 생애 단계
const stg = (s: 'dog' | 'cat', z: Size, y: number) => stageOf(s, z, Math.round(y * 12))
// 개(AAHA 2019): puppy ~6-9개월, young ~3-4살, senior = AKC 평균 수명의 마지막 25%
assert.deepEqual(stg('dog', 'small', 5), { from: 2, to: 2 }, '기본 5살 소형 = mature adult')
assert.deepEqual(stg('dog', 'small', 0.25), { from: 0, to: 0 })
assert.deepEqual(stg('dog', 'small', 7 / 12), { from: 0, to: 1 }, '7개월 puppy→young')
assert.deepEqual(stg('dog', 'small', 0.75), { from: 1, to: 1 })
assert.deepEqual(stg('dog', 'small', 3.5), { from: 1, to: 2 })
assert.deepEqual(stg('dog', 'small', 4), { from: 2, to: 2 })
// 소형 수명 10-15 → senior 7.5~11.25살
assert.deepEqual(stg('dog', 'small', 7), { from: 2, to: 2 })
assert.deepEqual(stg('dog', 'small', 7.5), { from: 2, to: 3 })
assert.deepEqual(stg('dog', 'small', 11.25), { from: 3, to: 3 })
// 대형 8-12 → 6~9살, 초대형 8-10 → 6~7.5살, 중형 10-13 → 7.5~9.75살
assert.deepEqual(stg('dog', 'large', 9), { from: 3, to: 3 })
assert.deepEqual(stg('dog', 'giant', 6), { from: 2, to: 3 })
assert.deepEqual(stg('dog', 'giant', 7.5), { from: 3, to: 3 })
assert.deepEqual(stg('dog', 'medium', 9.75), { from: 3, to: 3 })
// 고양이(AAHA/AAFP 2021): kitten <1, young 1-6, mature 7-10, senior >10(10살대는 넘어가는 중)
assert.deepEqual(stg('cat', 'small', 0.5), { from: 0, to: 0 })
assert.deepEqual(stg('cat', 'small', 1), { from: 1, to: 1 })
assert.deepEqual(stg('cat', 'small', 6 + 11 / 12), { from: 1, to: 1 })
assert.deepEqual(stg('cat', 'small', 7), { from: 2, to: 2 })
assert.deepEqual(stg('cat', 'small', 10), { from: 2, to: 3 })
assert.deepEqual(stg('cat', 'small', 11), { from: 3, to: 3 })

// ── RER·MER
near(rer(7), 301.2462)
near(rer(4), 197.9899)
near(rer(10), 393.6389)
assert.deepEqual(factorOf('dog', 60, true, 'normal'), { range: [1.4, 1.6], key: 'neutered' })
assert.deepEqual(factorOf('dog', 60, false, 'normal'), { range: [1.6, 1.8], key: 'intact' })
assert.deepEqual(factorOf('dog', 60, true, 'inactive'), { range: [1.0, 1.4], key: 'inactive' })
assert.deepEqual(factorOf('dog', 60, false, 'loss'), { range: [1.0, 1.0], key: 'loss' })
assert.deepEqual(factorOf('dog', 60, true, 'active'), { range: [1.6, 2.0], key: 'active' })
assert.deepEqual(factorOf('dog', 3, true, 'loss'), { range: [3.0, 3.0], key: 'under4m' }, '4개월 미만은 상태 무시')
assert.deepEqual(factorOf('dog', 4, true, 'normal'), { range: [2.0, 2.0], key: 'growth' })
assert.deepEqual(factorOf('dog', 11, false, 'normal'), { range: [2.0, 2.0], key: 'growth' })
assert.deepEqual(factorOf('cat', 36, true, 'normal'), { range: [1.2, 1.4], key: 'neutered' })
assert.deepEqual(factorOf('cat', 36, false, 'normal'), { range: [1.4, 1.6], key: 'intact' })
assert.deepEqual(factorOf('cat', 36, true, 'loss'), { range: [0.8, 0.8], key: 'loss' })
assert.deepEqual(factorOf('cat', 36, true, 'inactive'), { range: [1.0, 1.0], key: 'inactive' })
assert.deepEqual(factorOf('cat', 36, true, 'active'), { range: [1.2, 1.4], key: 'neutered' }, '고양이는 활동 계수 없음')
assert.deepEqual(factorOf('cat', 6, true, 'normal'), { range: [2.5, 2.5], key: 'growth' })

// ── 사료량. 기본: 7kg 중성화 성견 → MER 421.74~481.99 → 422~482kcal, 380kcal/100g → 110.99~126.84 → 111~127g, 2회 → 55.49·63.42 → 55~63g, 간식 42~48kcal
{
  const r = feeding(DEFAULT)
  assert.deepEqual(r.kcal, [422, 482])
  assert.deepEqual(r.g, [111, 127])
  assert.deepEqual(r.meal, [55, 63])
  assert.deepEqual(r.treat, [42, 48])
}
// 고양이 4kg 3살 중성화: 237.59~277.19 → 238~277kcal, 62.52~72.94 → 63~73g, 2회 31~36g
{
  const r = feeding({ ...DEFAULT, s: 'cat', y: 3, w: 4 })
  assert.deepEqual(r.kcal, [238, 277])
  assert.deepEqual(r.g, [63, 73])
  assert.deepEqual(r.meal, [31, 36])
}
// 개 10kg 중성화 안 함, 350kcal/100g, 3회: 629.82~708.55 → 630~709kcal, 179.95~202.44 → 180~202g, 59.98~67.48 → 60~67g
{
  const r = feeding({ ...DEFAULT, w: 10, n: false, k: 350, f: 3 })
  assert.deepEqual(r.kcal, [630, 709])
  assert.deepEqual(r.g, [180, 202])
  assert.deepEqual(r.meal, [60, 67])
}
// 강아지 3개월 5kg: 234.06 × 3 = 702.18 → 702kcal, 380 → 184.78 → 185g
assert.deepEqual(feeding({ ...DEFAULT, y: 0, m: 3, w: 5 }).kcal, [702, 702])
assert.deepEqual(feeding({ ...DEFAULT, y: 0, m: 3, w: 5 }).g, [185, 185])
// 고양이 감량 5kg: 234.06 × 0.8 = 187.25 → 187 / 새끼 고양이 6개월 2kg: 117.73 × 2.5 = 294.31 → 294
assert.deepEqual(feeding({ ...DEFAULT, s: 'cat', y: 4, w: 5, a: 'loss' }).kcal, [187, 187])
assert.deepEqual(feeding({ ...DEFAULT, s: 'cat', y: 0, m: 6, w: 2 }).kcal, [294, 294])

// ── 생일 → 개월(오늘 2026-11-22)
{
  const today = new Date(2026, 10, 22)
  assert.equal(monthsFromBirth('2021-11-22', today), 60)
  assert.equal(monthsFromBirth('2021-11-23', today), 59, '생일 전날까지는 한 달 덜')
  assert.equal(monthsFromBirth('2026-11-22', today), 0)
  assert.equal(monthsFromBirth('2026-05-10', today), 6)
  assert.equal(monthsFromBirth('2026-11-23', today), null, '미래')
  assert.equal(monthsFromBirth('', today), null)
  assert.equal(monthsFromBirth('2021/11/22', today), null)
}

// ── URL
{
  const back = (st: State) => { const p = new URLSearchParams(toQuery(st)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a: State = { s: 'dog', y: 8, m: 3, w: 30.5, z: 'medium', n: false, a: 'active', k: 410, f: 3 }
  assert.equal(toQuery(a), 'y=8&m=3&w=30.5&z=medium&n=0&a=active&k=410&f=3')
  assert.deepEqual(back(a), a)
  const c: State = { s: 'cat', y: 3, m: 0, w: 4, z: null, n: true, a: 'loss', k: 380, f: 2 }
  assert.equal(toQuery(c), 's=cat&y=3&a=loss', '고양이 기본 체중 4kg 은 생략')
  assert.deepEqual(back(c), c)
  assert.deepEqual(parseState((k) => ({ s: 'cat' })[k] ?? null), { ...DEFAULT, s: 'cat', w: DEF_W.cat })
  // 고양이에는 크기·활동 계수 없음
  assert.deepEqual(parseState((k) => ({ s: 'cat', z: 'giant', a: 'active' })[k] ?? null), { ...DEFAULT, s: 'cat', w: 4 })
  assert.equal(toQuery({ ...DEFAULT, s: 'cat', w: 4, z: 'giant' }), 's=cat')
  // 틀린 값은 기본값
  const bad = new URLSearchParams('s=bird&y=31&m=12&w=0.4&z=huge&n=x&a=run&k=40&f=7')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  const frac = new URLSearchParams('y=2.5&m=1.5&w=7.26&k=355.6&f=2.5')
  assert.deepEqual(parseState((k) => frac.get(k)), { ...DEFAULT, w: 7.3, k: 356 })
  const edge = new URLSearchParams('y=0&m=11&w=100&k=700&f=6')
  assert.deepEqual(parseState((k) => edge.get(k)), { ...DEFAULT, y: 0, m: 11, w: 100, k: 700, f: 6 })
  assert.equal(toQuery({ ...DEFAULT, w: 8 }), 'w=8')
}

console.log('check-pet-age: all passed')
