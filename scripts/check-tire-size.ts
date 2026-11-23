// node scripts/check-tire-size.ts (Node 24) — 타이어 규격 해석·외경 비교·인치업 후보·DOT·URL 회귀 체크
// 기대값은 손으로 계산: 사이드월 = 폭 × 편평비/100, 외경 = 림 × 25.4 + 2 × 사이드월
import assert from 'node:assert/strict'
import {
  parseSize, formatSize, dims, compare, bandOf, inchUps, parseDot, parseState, toQuery,
  LOAD_KG, SPEED_KMH, DEFAULT, PRESETS, type Size, type State,
} from '../src/utils/tireSize.ts'

const size = (s: string): Size => { const r = parseSize(s); assert.ok(r.ok, s); return r.size }
const near = (a: number, b: number, eps = 1e-3, msg?: string) => assert.ok(Math.abs(a - b) < eps, msg ?? `${a} ≈ ${b}`)

// ── 하중지수·속도기호(자동차규칙 별표 1의2)
assert.equal(LOAD_KG.length, 258, 'LI 0~257')
assert.equal(LOAD_KG[0], 45)
assert.equal(LOAD_KG[91], 615)
assert.equal(LOAD_KG[94], 670)
assert.equal(LOAD_KG[100], 800)
assert.equal(LOAD_KG[121], 1450)
assert.equal(LOAD_KG[257], 73000)
for (let i = 1; i < LOAD_KG.length; i++) assert.ok(LOAD_KG[i] > LOAD_KG[i - 1], `LI ${i} 증가`)
assert.equal(SPEED_KMH.H, 210)
assert.equal(SPEED_KMH.V, 240)
assert.equal(SPEED_KMH.W, 270)
assert.equal(SPEED_KMH.Y, 300)
assert.equal(SPEED_KMH.T, 190)
assert.equal(Object.keys(SPEED_KMH).length, 21)

// ── 파서
assert.deepEqual(size('205/55R16 91V'), { prefix: '', width: 205, aspect: 55, cons: 'R', rim: 16, li: 91, speed: 'V', xl: false })
assert.deepEqual(size('205/55 R16'), { prefix: '', width: 205, aspect: 55, cons: 'R', rim: 16, li: null, speed: null, xl: false })
assert.equal(formatSize(size('p215/65r15')), 'P215/65R15')
assert.equal(formatSize(size('LT235/75R15 104/101S')), 'LT235/75R15 104S', '복륜 하중지수는 버리고 단륜만')
assert.equal(formatSize(size('225/40ZR18 92Y XL')), '225/40ZR18 92Y XL')
assert.equal(formatSize(size(' 225/40 ZR 18 (92Y) ')), '225/40ZR18 92Y')
assert.equal(formatSize(size('225/45R17 94W EXTRA LOAD')), '225/45R17 94W XL')
assert.equal(formatSize(size('205/55/16')), '205/55R16', '구조 생략은 R 로')
assert.equal(formatSize(size('205 55 16')), '205/55R16')
assert.equal(formatSize(size('205/55R16 91')), '205/55R16 91', '속도기호 없이 하중지수만')
assert.equal(formatSize(size('T125/70R17 98M')), 'T125/70R17 98M')
assert.equal(size('225/65R17 102H M+S').li, 102)
assert.equal(formatSize(size('215/70R16C 108/106T')), '215/70R16 108T', '상용(C) 표기는 림 숫자에 붙여 쓴다')
const err = (s: string) => { const r = parseSize(s); assert.equal(r.ok, false, s); return r.ok ? null : r.err }
assert.equal(err(''), 'empty')
assert.equal(err('   '), 'empty')
assert.equal(err('abc'), 'format')
assert.equal(err('2055516'), 'format')
assert.equal(err('205/55R16 91VX'), 'format')
assert.equal(err('505/55R16'), 'width')
assert.equal(err('095/55R16'), 'width')
assert.equal(err('205/15R16'), 'aspect')
assert.equal(err('205/55R30'), 'rim')
assert.equal(err('205/55R09'), 'rim')
assert.equal(err('205/55R16 300V'), 'li')
assert.equal(err('205/55R16 91X'), 'speed')
for (const p of PRESETS) assert.equal(formatSize(size(p)), p, `프리셋 ${p}`)

// ── 치수: 205/55R16 → 사이드월 112.75, 외경 406.4 + 225.5 = 631.9, 둘레 π × 631.9 = 1985.17, km당 503.7회
{
  const d = dims(size('205/55R16'))
  near(d.sidewall, 112.75)
  near(d.diameter, 631.9)
  near(d.circumference, 1985.172, 0.01)
  near(d.revsPerKm, 503.735, 0.01)
  near(dims(size('225/45R17')).diameter, 634.3)
  near(dims(size('195/65R15')).diameter, 634.5)
  near(dims(size('245/45R18')).diameter, 677.7)
}
// 기본값 비교: 225/45R17 은 2.4mm(+0.380%) 크다 → 속도계 100 일 때 실제 100.38
{
  const c = compare(size(DEFAULT.a), size(DEFAULT.b))
  near(c.diffMm, 2.4)
  near(c.pct, 0.37981, 1e-4)
  assert.equal(c.band, 'tight')
  near(c.actualAt(100), 100.37981, 1e-4)
  near(c.actualAt(60), 60.22789, 1e-4)
}
// 205/55R16 → 215/55R17: +36.4mm, +5.760% → 기준 밖
{
  const c = compare(size('205/55R16'), size('215/55R17'))
  near(c.pct, 5.76041, 1e-4)
  assert.equal(c.band, 'over')
  // 거꾸로면 작아진다: 668.3 → 631.9 = -5.4467%
  near(compare(size('215/55R17'), size('205/55R16')).pct, -5.44665, 1e-4)
}
// 구간 경계
assert.equal(bandOf(0), 'tight')
assert.equal(bandOf(1.5), 'tight')
assert.equal(bandOf(-2), 'tight')
assert.equal(bandOf(1.51), 'common')
assert.equal(bandOf(-2.01), 'common')
assert.equal(bandOf(3), 'common')
assert.equal(bandOf(-3), 'common')
assert.equal(bandOf(3.01), 'over')
assert.equal(bandOf(-3.01), 'over')

// ── 인치업 후보: 205/55R16(631.9)
// 17인치: 225/45R17 634.3(+0.380%), 205/50R17 636.8(+0.775%) / 18인치: 215/40R18 629.2(-0.427%), 225/40R18 637.2(+0.839%)
{
  const r = inchUps(size('205/55R16'))
  assert.deepEqual(r.map((x) => x.rim), [17, 18])
  assert.deepEqual(r[0].sizes.map((x) => x.label), ['225/45R17', '205/50R17'])
  assert.deepEqual(r[1].sizes.map((x) => x.label), ['215/40R18', '225/40R18'])
  near(r[0].sizes[1].pct, 0.77544, 1e-4)
  near(r[1].sizes[0].pct, -0.42728, 1e-4)
  for (const g of r) for (const s of g.sizes) assert.ok(Math.abs(s.pct) <= 1.5)
  assert.deepEqual(inchUps(size('255/35R25')).map((x) => x.rim), [26], '림 26 까지만')
}

// ── DOT 제조일(오늘 2026-11-22)
{
  const today = Date.UTC(2026, 10, 22)
  const ok = (s: string) => { const r = parseDot(s, today); assert.ok(r.ok, s); return r }
  // 2524 = 2024년 25주 → 1/1 + 168일 = 6/17, 888일 = 2.431년
  const a = ok('2524')
  assert.deepEqual([a.year, a.week, a.month, a.status], [2024, 25, 6, 'ok'])
  near(a.age, 888 / 365.2425, 1e-6)
  // 마지막 숫자 묶음
  assert.equal(ok('DOT 4B9X 2524').year, 2024)
  // 0116 = 2016년 1주 → 10년 넘음
  assert.equal(ok('0116').status, 'replace')
  // 4720 = 2020-11-18 → 6년 → 점검
  const c = ok('4720')
  assert.equal(c.month, 11)
  assert.equal(c.status, 'check')
  // 5년 경계: 4721 = 2021-11-19(5년 3일) 점검, 4821 = 2021-11-26(4.99년) 정상
  assert.equal(ok('4721').status, 'check')
  assert.equal(ok('4821').status, 'ok')
  // 10년 경계: 4616 = 2016-11-11 → 10.03년 교체, 4816 = 2016-11-25 → 9.99년 점검
  assert.equal(ok('4616').status, 'replace')
  assert.equal(ok('4816').status, 'check')
  // 이번 주까지는 된다, 미래는 오류
  assert.equal(ok('4726').year, 2026)
  const bad = (s: string) => { const r = parseDot(s, today); assert.equal(r.ok, false, s); return r.ok ? null : r.err }
  assert.equal(bad('4926'), 'future', '2026-12-03')
  assert.equal(bad('0127'), 'future')
  assert.equal(bad('0024'), 'week')
  assert.equal(bad('5424'), 'week')
  assert.equal(bad('259'), 'old')
  assert.equal(bad('12345'), 'format')
  assert.equal(bad(''), 'empty')
  assert.equal(bad('abc'), 'format')
}

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const s: State = { a: '195/65R15', b: '205/55R16 91V' }
  assert.equal(toQuery(s), 'a=195%2F65R15&b=205%2F55R16+91V')
  assert.deepEqual(back(s), s)
  assert.deepEqual(back({ ...DEFAULT, b: '225/40ZR18 92Y XL' }), { ...DEFAULT, b: '225/40ZR18 92Y XL' })
  assert.equal(toQuery({ ...DEFAULT, b: '235/55R19' }), 'b=235%2F55R19')
  // 받는 쪽은 표준 표기로, 틀리면 기본값
  const p = new URLSearchParams('a=p215%2F65r15&b=zzz')
  assert.deepEqual(parseState((k) => p.get(k)), { a: 'P215/65R15', b: DEFAULT.b })
}

console.log('check-tire-size: all passed')
