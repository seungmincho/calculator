// 색각 테스트 회귀 체크: node scripts/check-color-blind-test.ts
// 1) 색 수학(Viénot 1999 투영, Machado 2009 독립 모형) 2) 판마다 "대상 결손형에겐 사라지고 정상에겐 보이는지"
// 3) 판 세트 구성·색역(클리핑 없음) 4) 채점·분류
import assert from 'node:assert/strict'
import {
  simulate, simulateMachado, oklab, deltaE, CONFUSION_AXIS, MACHADO, generatePlates, plateDots, packDots, scoreTest,
  expectedAnswer, normalizeAnswer, hexToLinear, linearToHex, NONE, PLATE_COUNT,
  type Observer, type Plate, type Dot, type Vec3,
} from '../src/utils/colorBlindTest.ts'

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

// ── 1. 색 수학 ──
assert.equal(linearToHex(hexToLinear('#8e875a')), '#8e875a')
for (const o of ['protan', 'deutan', 'tritan'] as const) {
  const w = simulate([1, 1, 1], o)
  assert.ok(w.every((v) => close(v, 1, 2e-3)), `${o}: 흰색 보존`)
  const c: Vec3 = [0.3, 0.5, 0.2]
  const once = simulate(c, o), twice = simulate(once, o)
  assert.ok(once.every((v, i) => close(v, twice[i])), `${o}: 투영은 멱등`)
  // 혼동축 방향 변화는 시뮬 후 0
  const moved = simulate([c[0] + CONFUSION_AXIS[o][0] * 1e-3, c[1] + CONFUSION_AXIS[o][1] * 1e-3, c[2] + CONFUSION_AXIS[o][2] * 1e-3], o)
  assert.ok(moved.every((v, i) => close(v, once[i], 1e-9)), `${o}: 혼동축 불가시`)
}
// Viénot 혼동축 ≈ Machado(severity 1) 행렬의 영공간 (두 모형이 같은 혼동선을 가리키는지)
for (const o of ['protan', 'deutan'] as const) {
  const m = MACHADO[o], a = CONFUSION_AXIS[o]
  const n: Vec3 = [m[0][1] * m[1][2] - m[0][2] * m[1][1], m[0][2] * m[1][0] - m[0][0] * m[1][2], m[0][0] * m[1][1] - m[0][1] * m[1][0]]
  const cos = Math.abs(n[0] * a[0] + n[1] * a[1] + n[2] * a[2]) / Math.hypot(...n) / Math.hypot(...a)
  assert.ok(cos > 0.998, `${o}: Viénot 축과 Machado 영공간 각도 ${Math.acos(cos) * 57.3}°`)
}

// ── 2. 판별 색 검증 도구 ──
type Sim = (c: Vec3, o: Observer) => Vec3
const MODELS: [string, Sim][] = [['Viénot', simulate], ['Machado', simulateMachado]]
function regionStats(dots: Dot[], o: Observer, sim: Sim) {
  const by = new Map<number, Vec3[]>()
  for (const d of dots) by.set(d.region, [...(by.get(d.region) ?? []), oklab(sim(d.color, o))])
  const mean = new Map<number, Vec3>(), spreadAB = new Map<number, number>()
  for (const [r, cs] of by) {
    const m: Vec3 = [0, 0, 0]
    for (const c of cs) { m[0] += c[0] / cs.length; m[1] += c[1] / cs.length; m[2] += c[2] / cs.length }
    mean.set(r, m)
    spreadAB.set(r, Math.sqrt(cs.reduce((s, c) => s + (c[1] - m[1]) ** 2 + (c[2] - m[2]) ** 2, 0) / cs.length))
  }
  return { mean, spreadAB, by }
}
// 영역 기준색(밝기 노이즈 전)끼리의 지각 거리 — 점 표본 수에 따른 흔들림 없이 결정적
type Stats = ReturnType<typeof regionStats> & { base: (r: number) => Vec3 }
const dE = (s: Stats, a: number, b: number) => deltaE(s.base(a), s.base(b))
// 이상적 관찰자 근사: 두 영역 중심 중 가까운 쪽으로 분류한 정확도 (0.5 = 구분 불가)
function centroidAcc(s: Stats, a: number, b: number) {
  const ma = s.mean.get(a)!, mb = s.mean.get(b)!
  let ok = 0, n = 0
  for (const [r, pts] of [[a, s.by.get(a)!], [b, s.by.get(b)!]] as const) {
    for (const p of pts) { n++; if ((deltaE(p, ma) < deltaE(p, mb)) === (r === a)) ok++ }
  }
  return ok / n
}

const OBS: Observer[] = ['normal', 'protan', 'deutan', 'tritan']
const worst: Record<string, number> = {}
const track = (k: string, v: number, mode: 'max' | 'min') => {
  worst[k] = worst[k] === undefined ? v : mode === 'max' ? Math.max(worst[k], v) : Math.min(worst[k], v)
}

function checkPlate(p: Plate) {
  const dots = plateDots(p)
  const tag = `#${p.id} ${p.kind}/${p.target} (${p.normal}→${p.deficient})`
  for (const d of dots) assert.ok(d.color.every((v) => v >= 0 && v <= 1), `${tag}: 색역 밖 점 ${d.color} region ${d.region} (클리핑하면 혼동선이 깨짐)`)
  const regions = new Set(dots.map((d) => d.region))
  assert.ok(regions.has(0) && regions.size >= 2, `${tag}: 숫자 점 없음`)
  for (const [model, sim] of MODELS) {
    const S = Object.fromEntries(OBS.map((o) => [o, { ...regionStats(dots, o, sim), base: (r: number) => oklab(sim(p.regions[r].base, o)) }])) as Record<Observer, Stats>
    const k = (s: string) => `${p.kind}:${model}:${s}`
    // 결손형 불가시 허용치: Viénot 모형은 설계상 0(양자화 오차만), Machado 는 독립 모형이라 약간의 잔차
    const HIDE = model === 'Viénot' ? 0.012 : 0.02
    switch (p.kind) {
      case 'demo':
        for (const o of OBS) { assert.ok(dE(S[o], 0, 1) > 0.15, `${tag} ${model} ${o}: 누구나 보여야 함`); track(k(o), dE(S[o], 0, 1), 'min') }
        break
      case 'vanishing': {
        const t = p.target!, other = t === 'protan' ? 'deutan' : 'protan'
        assert.ok(dE(S.normal, 0, 1) > 0.1, `${tag} ${model}: 정상에게 보여야 함`)
        assert.ok(centroidAcc(S.normal, 0, 1) > 0.95, `${tag} ${model}: 정상 분류 정확도`)
        assert.ok(dE(S[t], 0, 1) < HIDE, `${tag} ${model}: ${t}에게 사라져야 함 (${dE(S[t], 0, 1)})`)
        assert.ok(dE(S[other], 0, 1) > 0.04, `${tag} ${model}: ${other}에게는 보여야 함`)
        // 이상적 관찰자도 점 색만으로는 숫자/배경을 거의 못 가름 (0.5 = 우연)
        assert.ok(centroidAcc(S[t], 0, 1) < (model === 'Viénot' ? 0.65 : 0.75), `${tag} ${model}: ${t} 중심분류 ${centroidAcc(S[t], 0, 1)}`)
        track(k(`${t}-hidden-dE`), dE(S[t], 0, 1), 'max'); track(k(`${t}-centroidAcc`), centroidAcc(S[t], 0, 1), 'max')
        track(k('normal-dE'), dE(S.normal, 0, 1), 'min')
        break
      }
      case 'tritan':
        assert.ok(dE(S.normal, 0, 1) > 0.09, `${tag} ${model}: 정상`)
        assert.ok(dE(S.protan, 0, 1) > 0.07 && dE(S.deutan, 0, 1) > 0.07, `${tag} ${model}: 적록 이상에겐 보임`)
        // Machado tritan 행렬은 완전 투영이 아니라(행렬식≠0) 잔차가 큼 → 정상 대비 1/3 이하만 요구
        assert.ok(dE(S.tritan, 0, 1) < (model === 'Viénot' ? HIDE : dE(S.normal, 0, 1) / 3), `${tag} ${model}: tritan에게 사라짐 (${dE(S.tritan, 0, 1)})`)
        track(k('tritan-hidden-dE'), dE(S.tritan, 0, 1), 'max')
        break
      case 'classify':
        // 왼쪽(영역1)=protan 불가시, 오른쪽(영역2)=deutan 불가시
        assert.ok(dE(S.normal, 0, 1) > 0.1 && dE(S.normal, 0, 2) > 0.1, `${tag} ${model}: 정상은 두 숫자`)
        assert.ok(dE(S.protan, 0, 1) < HIDE && dE(S.protan, 0, 2) > 0.04, `${tag} ${model}: protan은 오른쪽만`)
        assert.ok(dE(S.deutan, 0, 2) < HIDE && dE(S.deutan, 0, 1) > 0.04, `${tag} ${model}: deutan은 왼쪽만`)
        track(k('protan-left-dE'), dE(S.protan, 0, 1), 'max'); track(k('deutan-right-dE'), dE(S.deutan, 0, 2), 'max')
        break
      case 'transform': {
        // 영역: 1=공통(u+v) 2=정상만(u) 3=결손형만(v)
        const t = p.target!
        const has3 = regions.has(3)
        assert.ok(dE(S[t], 0, 2) < HIDE, `${tag} ${model}: ${t}에게 '정상만' 세그먼트는 배경과 같아야 함`)
        assert.ok(dE(S[t], 0, 1) > 0.035, `${tag} ${model}: ${t}에게 공통 세그먼트 보임`)
        if (has3) {
          assert.ok(dE(S[t], 1, 3) < HIDE, `${tag} ${model}: ${t}에게 공통=결손형만 ${dE(S[t], 1, 3)} n3=${S[t].by.get(3)!.length}`)
          // 정상: u 차이(0.16)가 v 차이(0.055)보다 훨씬 커서 {공통, 정상만} vs {배경, 결손형만} 으로 묶임
          const ratio = Math.min(dE(S.normal, 0, 2), dE(S.normal, 3, 1)) / Math.max(dE(S.normal, 0, 3), dE(S.normal, 1, 2))
          assert.ok(ratio > 2.5, `${tag} ${model}: 정상 묶음 비 ${ratio}`)
          track(k('normal-grouping-ratio'), ratio, 'min')
        }
        track(k(`${t}-hidden-dE`), dE(S[t], 0, 2), 'max')
        break
      }
      case 'hidden': {
        // 가림(masking) 비 = 숫자-배경 색도 차 / 영역 안 색도 흩어짐. 대상은 u 흩어짐이 사라져 커짐.
        const t = p.target!
        const mask = (o: Observer) => Math.hypot(S[o].mean.get(1)![1] - S[o].mean.get(0)![1], S[o].mean.get(1)![2] - S[o].mean.get(0)![2]) /
          Math.max(S[o].spreadAB.get(0)!, S[o].spreadAB.get(1)!)
        assert.ok(mask(t) > 2 * mask('normal'), `${tag} ${model}: 대상 ${mask(t)} vs 정상 ${mask('normal')}`)
        assert.ok(mask('normal') < 1, `${tag} ${model}: 정상에겐 흩어짐보다 작은 차이`)
        track(k(`${t}-mask`), mask(t), 'min'); track(k('normal-mask'), mask('normal'), 'max')
        break
      }
    }
  }
  return dots.length
}

// ── 3. 판 세트 ──
let dotMin = Infinity
for (let seed = 1; seed <= 25; seed++) {
  const plates = generatePlates(seed * 7919)
  assert.equal(plates.length, PLATE_COUNT)
  assert.equal(plates[0].kind, 'demo', '첫 판은 시범판')
  const count = (k: string) => plates.filter((p) => p.kind === k).length
  assert.deepEqual([count('vanishing'), count('transform'), count('hidden'), count('classify'), count('tritan')], [5, 2, 2, 2, 2])
  const answers = plates.flatMap((p) => [p.normal, p.deficient]).filter((a) => a && a !== NONE && a.length === 2)
  assert.equal(new Set(plates.filter((p) => p.kind !== 'transform').map((p) => p.normal === NONE ? p.deficient : p.normal)).size, PLATE_COUNT - 2, '숫자 중복 없음')
  assert.ok(answers.length > 0)
  for (const p of plates) dotMin = Math.min(dotMin, checkPlate(p))
}
assert.deepEqual(generatePlates(5), generatePlates(5), '같은 시드 = 같은 판')
assert.notDeepEqual(generatePlates(5).map((p) => p.normal), generatePlates(6).map((p) => p.normal))
// 점 겹침 없음
const pk = packDots(123)
for (let i = 0; i < pk.length; i++) for (let j = i + 1; j < pk.length; j++) {
  assert.ok(Math.hypot(pk[i].x - pk[j].x, pk[i].y - pk[j].y) >= pk[i].r + pk[j].r, '점 겹침')
}
assert.ok(dotMin > 450, `점 수 ${dotMin}`)

// ── 4. 채점 ──
assert.equal(normalizeAnswer('07'), '7')
assert.equal(normalizeAnswer(' 1a2'), '12')
assert.equal(normalizeAnswer(NONE), NONE)
const plates = generatePlates(2026)
const as = (o: Observer) => plates.map((p) => expectedAnswer(p, o))
const n = scoreTest(plates, as('normal'))
assert.equal(n.verdict, 'normal'); assert.equal(n.confidence, 'high'); assert.equal(n.correct, PLATE_COUNT)
const pr = scoreTest(plates, as('protan'))
assert.equal(pr.verdict, 'protan'); assert.equal(pr.confidence, 'high'); assert.ok(pr.rgFails >= 5)
const de = scoreTest(plates, as('deutan'))
assert.equal(de.verdict, 'deutan'); assert.equal(de.confidence, 'high')
assert.equal(scoreTest(plates, as('tritan')).verdict, 'tritan')
// 정상인이 한 판 실수 → 정상(보통)
const slip = as('normal'); slip[plates.findIndex((p) => p.kind === 'vanishing')] = '99'
assert.deepEqual([scoreTest(plates, slip).verdict, scoreTest(plates, slip).confidence], ['normal', 'medium'])
// 시범판을 틀림 / 전부 "안 보임" → 판정 어려움
const demoMiss = as('normal'); demoMiss[0] = NONE
assert.equal(scoreTest(plates, demoMiss).verdict, 'unclear')
const allNone = plates.map((_, i) => (i === 0 ? plates[0].normal : NONE))
assert.equal(scoreTest(plates, allNone).verdict, 'unclear')
// 적록 판을 틀리지만 유형 신호가 섞임 → 적록 이상(유형 불명확)
const mixed = as('normal')
plates.forEach((p, i) => { if (p.kind === 'vanishing') mixed[i] = '99' })
assert.equal(scoreTest(plates, mixed).verdict, 'redGreen')
// 약한 protan (소실판 3개만 "안 보임") → protan, 확신 보통
const weak = as('normal')
let left = 3
plates.forEach((p, i) => { if (p.kind === 'vanishing' && p.target === 'protan' && left-- > 0) weak[i] = NONE })
assert.deepEqual([scoreTest(plates, weak).verdict, scoreTest(plates, weak).confidence], ['protan', 'medium'])

console.log('worst cases:', Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(4)])))
console.log(`OK color-blind-test (min dots ${dotMin})`)
