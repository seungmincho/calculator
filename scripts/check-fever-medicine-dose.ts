// node scripts/check-fever-medicine-dose.ts (Node 24) — 어린이 해열제 용량 계산·허가 표·복용 기록·URL 회귀 체크
// 기대값은 손으로 계산: mL = mg ÷ 농도(mg/mL), 하한은 0.1 올림·상한은 0.1 내림
import assert from 'node:assert/strict'
import {
  doseRange, dailyMaxMg, gates, labelRow, rowWithin, resolve, parseState, toQuery, parseLog, nextDose, timeToEpoch,
  RULES, TABLES, PRODUCTS, INGS, DEFAULT, HOUR, DAY, ceil1, floor1, type Dose, type State,
} from '../src/utils/feverMedicineDose.ts'

// ── 반올림
assert.equal(ceil1(3.75), 3.8)
assert.equal(floor1(5.625), 5.6)
assert.equal(floor1(0.3 * 3), 0.9, '0.8999… 는 0.9')
assert.equal(ceil1(1.2), 1.2, '딱 맞으면 그대로')

// ── 기본값: 12kg 아세트아미노펜 32mg/mL → 120~180mg, 3.75→3.8 ~ 5.625→5.6 mL
{
  const r = doseRange('apap', 12, 32)
  assert.deepEqual(r.mg, [120, 180])
  assert.deepEqual(r.ml, [3.8, 5.6])
  assert.equal(r.capped, false)
  assert.equal(dailyMaxMg('apap', 12), 900, '5회 × 180mg = 75mg/kg')
}
// 이부프로펜 20mg/mL 12kg → 60~120mg, 3~6mL / 덱시부프로펜 12mg/mL 12kg → 60~84mg, 5~7mL
assert.deepEqual(doseRange('ibu', 12, 20).ml, [3, 6])
assert.deepEqual(doseRange('dexi', 12, 12).mg, [60, 84])
assert.deepEqual(doseRange('dexi', 12, 12).ml, [5, 7])
assert.equal(dailyMaxMg('ibu', 12), 480)
assert.equal(dailyMaxMg('dexi', 12), 336, '28mg/kg')

// ── 상한은 어떤 체중·농도에서도 1회 최대 mg 를 넘지 않는다
for (const ing of INGS) {
  for (let w = 2.5; w <= 60; w = Math.round((w + 0.1) * 10) / 10) {
    for (const conc of [RULES[ing].stdConc, 25, 33.3, 40, 100]) {
      const r = doseRange(ing, w, conc)
      const maxMg = Math.min(RULES[ing].mgPerKg[1] * w, RULES[ing].maxDoseMg ?? Infinity)
      assert.ok(r.ml[1] * conc <= maxMg + 1e-6, `${ing} ${w}kg ${conc}mg/mL: ${r.ml[1]}mL > ${maxMg}mg`)
      assert.ok(r.mg[1] <= maxMg + 1e-9)
      assert.ok(r.ml[0] <= r.ml[1], `${ing} ${w}kg 하한 ≤ 상한`)
      assert.ok(r.mg[0] <= r.mg[1])
    }
    assert.ok(dailyMaxMg(ing, w) <= RULES[ing].maxTimes * RULES[ing].mgPerKg[1] * w + 1e-9)
  }
}
// 1회 상한: 이부프로펜 400mg(50kg × 10 = 500 → 400), 덱시부프로펜 300mg(50kg × 7 = 350 → 300)
{
  const ibu = doseRange('ibu', 50, 20)
  assert.deepEqual(ibu.mg, [250, 400])
  assert.deepEqual(ibu.ml, [12.5, 20])
  assert.equal(ibu.capped, true)
  assert.equal(dailyMaxMg('ibu', 50), 1600)
  const dx = doseRange('dexi', 50, 12)
  assert.deepEqual(dx.mg, [250, 300])
  assert.deepEqual(dx.ml, [20.9, 25], '250/12=20.83→20.9, 300/12=25')
  assert.equal(dailyMaxMg('dexi', 50), 1200, '허가 표 최대 1200mg')
  // 덱시부프로펜 60kg: 하한도 300 으로 묶인다
  assert.deepEqual(doseRange('dexi', 60, 12).mg, [300, 300])
}
// 아세트아미노펜 하루 4,000mg: 55kg → 75×55 = 4125 → 4000
assert.equal(dailyMaxMg('apap', 55), 4000)
assert.equal(dailyMaxMg('apap', 53), 3975)
// 농도 직접 입력 100mg/mL, 2.5kg: 25~37.5mg → 0.3~0.3mL(하한 0.25→0.3, 상한 0.375→0.3)
assert.deepEqual(doseRange('apap', 2.5, 100).ml, [0.3, 0.3])

// ── 나이 기준(식약처: 아세트아미노펜 생후 4개월, 이부프로펜·덱시부프로펜 6개월)
assert.equal(gates('apap', 3).tooYoung, true)
assert.equal(gates('apap', 4).tooYoung, false)
assert.equal(gates('ibu', 5).tooYoung, true)
assert.equal(gates('ibu', 6).tooYoung, false)
assert.equal(gates('dexi', 5).tooYoung, true)
assert.deepEqual(gates('apap', 2), { tooYoung: true, under3m: true, under2: true })
assert.equal(gates('apap', 23).under2, true)
assert.equal(gates('apap', 24).under2, false)

// ── 허가 표 줄(경계)
const cell = (ing: 'apap' | 'ibu' | 'dexi', w: number, a: number) => {
  const i = labelRow(ing, w, a)
  return i === null ? null : TABLES[ing].rows[i].cells[0]
}
assert.equal(cell('apap', 6.9, 5), null, '7kg 미만은 표에 없음')
assert.equal(cell('apap', 7, 5), '4개월~6개월')
assert.equal(cell('apap', 7.9, 5), '4개월~6개월')
assert.equal(cell('apap', 8, 12), '7개월~23개월')
assert.equal(cell('apap', 11.9, 24), '7개월~23개월', '체중으로 고른다')
assert.equal(cell('apap', 12, 24), '만 2~3세')
assert.equal(cell('apap', 42.9, 132), '만 11세')
assert.equal(cell('apap', 43, 144), '만 12세')
assert.equal(cell('apap', 60, 155), '만 12세')
assert.equal(cell('apap', 60, 156), null, '만 13세부터는 만 12세 이하 표 밖')
assert.equal(cell('apap', 12, 3), null, '4개월 미만은 표 밖')
assert.equal(cell('ibu', 9, 11), null, '이부프로펜 표는 1세부터')
assert.equal(cell('ibu', 9, 12), '1~2세')
assert.equal(cell('ibu', 14, 35), '1~2세')
assert.equal(cell('ibu', 14, 36), '3~6세')
assert.equal(cell('ibu', 30, 131), '7~10세')
assert.equal(cell('ibu', 30, 132), '11~14세')
assert.equal(cell('ibu', 30, 168), '11~14세')
assert.equal(cell('dexi', 7.8, 8), null, '7.9kg 미만')
assert.equal(cell('dexi', 7.9, 8), '6-11개월')
assert.equal(cell('dexi', 9.95, 12), '6-11개월', '9.9 와 10.0 사이')
assert.equal(cell('dexi', 10, 12), '12-23개월')
assert.equal(cell('dexi', 20.95, 60), '4-5세')
assert.equal(cell('dexi', 21, 60), '6-8세')
assert.equal(cell('dexi', 50, 150), '12세')
assert.equal(cell('dexi', 12, 5), null, '6개월 미만')
// 표 줄 mL 와 체중 범위 비교: 12kg 아세트아미노펜 5mL ⊂ 3.8~5.6 / 이부프로펜 1~2세 2.5~5mL ⊄ 3~6
assert.equal(rowWithin(TABLES.apap.rows[2], doseRange('apap', 12, 32).ml), true)
assert.equal(rowWithin(TABLES.ibu.rows[0], doseRange('ibu', 12, 20).ml), false)
// 표 데이터: mL × 농도 = mg (아세트아미노펜 칸, 덱시부프로펜 상한 칸)
// 허가 표 원문 그대로라 7개월~23개월 줄만 3.5mL(112mg) ≠ 120mg(3.75mL) — mL 가 mg 보다 많지 않고 0.5mL 안쪽
for (const row of TABLES.apap.rows) {
  const ml = parseFloat(row.cells[3]) * 32, mg = parseFloat(row.cells[2])
  assert.ok(ml <= mg && mg - ml < 0.5 * 32, row.cells[0])
}
for (const row of TABLES.ibu.rows) assert.match(row.cells[1], new RegExp(`\\(${row.ml[0]}~${row.ml[1]}mL\\)`), row.cells[0])
for (const row of TABLES.dexi.rows) assert.ok(row.cells[2].startsWith(`${row.ml[0]}~${row.ml[1]} mL`), row.cells[0])
for (const tb of Object.values(TABLES)) assert.equal(tb.rows.every((r) => r.cells.length === tb.cols.length), true)

// ── 제품·성분 선택
for (const p of PRODUCTS) {
  assert.equal(p.conc, RULES[p.ing].stdConc, `${p.name} 농도`)
  assert.match(p.url, /^https:\/\/nedrug\.mfds\.go\.kr\/pbp\/CCBBB01\/getItemDetail\?itemSeq=\d{9}$/)
}
assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length)
assert.deepEqual(resolve('maxibufen', 99), { ing: 'dexi', conc: 12, product: PRODUCTS.find((p) => p.id === 'maxibufen'), std: true })
assert.equal(resolve('apap', 25).std, false)
assert.equal(resolve('ibu', 20).std, true)

// ── 복용 기록
{
  const now = new Date(2026, 10, 20, 12, 0).getTime()
  const d = (hAgo: number, ing: Dose['ing'], mg: number): Dose => ({ t: now - hAgo * HOUR, ing, ml: mg / 32, mg })
  // 기록 없음 → 지금
  assert.equal(nextDose([], 'apap', now, 12).at, null)
  // 아세트아미노펜 3시간 전 → 4시간 간격까지 1시간
  let r = nextDose([d(3, 'apap', 160)], 'apap', now, 12)
  assert.equal(r.at, now + HOUR)
  assert.equal(r.reason, 'interval')
  // 정확히 4시간 전 → 지금
  assert.equal(nextDose([d(4, 'apap', 160)], 'apap', now, 12).at, null)
  // 이부프로펜 5시간 전 → 덱시부프로펜도 같은 계열이라 6시간까지 1시간
  r = nextDose([d(5, 'ibu', 120)], 'dexi', now, 12)
  assert.equal(r.at, now + HOUR)
  assert.equal(r.reason, 'interval')
  // 이부프로펜 1시간 전 → 아세트아미노펜은 2시간 간격까지 1시간(교차)
  r = nextDose([d(1, 'ibu', 120)], 'apap', now, 12)
  assert.equal(r.at, now + HOUR)
  assert.equal(r.reason, 'cross')
  // 이부프로펜 2.5시간 전 → 아세트아미노펜 지금
  assert.equal(nextDose([d(2.5, 'ibu', 120)], 'apap', now, 12).at, null)
  // 시계가 분 단위라 방금 적은 기록이 now 보다 30초 뒤여도 센다
  r = nextDose([{ t: now + 30_000, ing: 'apap', ml: 5, mg: 160 }], 'apap', now, 12)
  assert.equal(r.count, 1)
  assert.equal(r.at, now + 30_000 + 4 * HOUR)
  // 아세트아미노펜 24시간 안 5회(23,18,13,8,4시간 전, 각 160mg=800mg) → 5회째 이후: 가장 오래된 기록(23시간 전)+24h = 1시간 뒤
  const five = [23, 18, 13, 8, 4.5].map((h) => d(h, 'apap', 160))
  r = nextDose(five, 'apap', now, 12)
  assert.equal(r.count, 5)
  assert.equal(r.at, now + HOUR)
  assert.equal(r.reason, 'count')
  // 24시간이 지난 기록은 세지 않는다
  assert.equal(nextDose([d(25, 'apap', 160), ...five.slice(1)], 'apap', now, 12).count, 4)
  // 총량: 12kg 하루 900mg, 1회 하한 120mg. 3회 × 260mg = 780 → 780+120=900 은 허용
  assert.equal(nextDose([d(20, 'apap', 260), d(14, 'apap', 260), d(8, 'apap', 260)], 'apap', now, 12).at, null)
  // 3회 × 270mg = 810 → 930 > 900: 가장 오래된(20시간 전) 기록이 빠지는 4시간 뒤
  r = nextDose([d(20, 'apap', 270), d(14, 'apap', 270), d(8, 'apap', 270)], 'apap', now, 12)
  assert.equal(r.at, now + 4 * HOUR)
  assert.equal(r.reason, 'total')
  assert.equal(r.mg, 810)
  assert.equal(r.maxMg, 900)
  // 여러 조건이면 가장 늦은 시각
  r = nextDose([d(20, 'apap', 270), d(14, 'apap', 270), d(3.5, 'apap', 270)], 'apap', now, 12)
  assert.equal(r.at, now + 4 * HOUR, 'total(20h 전+24h) > interval(3.5h 전+4h)')
  // 이부프로펜 4회(같은 계열 덱시부프로펜 포함)
  r = nextDose([d(22, 'ibu', 100), d(15, 'dexi', 70), d(9, 'ibu', 100), d(6.5, 'ibu', 100)], 'ibu', now, 12)
  assert.equal(r.count, 4)
  assert.equal(r.at, now + 2 * HOUR)
  assert.equal(r.reason, 'count')
}

// 기록 파싱: 틀린 항목·72시간 넘은 항목 버림, 시간순
{
  const now = Date.UTC(2026, 10, 20, 3)
  const ok = { t: now - HOUR, ing: 'ibu', ml: 5, mg: 100 }
  const raw = JSON.stringify([ok, { t: now - 2 * HOUR, ing: 'apap', ml: 5, mg: 160 }, { t: now - 73 * HOUR, ing: 'apap', ml: 5, mg: 160 },
    { t: now, ing: 'aspirin', ml: 1, mg: 1 }, { t: 'x', ing: 'apap', ml: 1, mg: 1 }, { t: now, ing: 'apap', ml: 0, mg: 0 }, null])
  const log = parseLog(raw, now)
  assert.deepEqual(log.map((x) => x.ing), ['apap', 'ibu'])
  assert.deepEqual(parseLog(null, now), [])
  assert.deepEqual(parseLog('{bad', now), [])
  assert.deepEqual(parseLog('{"a":1}', now), [])
}
// 시각 입력: 미래면 어제
{
  const now = new Date(2026, 10, 20, 0, 30).getTime()
  assert.equal(timeToEpoch('00:10', now), now - 20 * 60_000)
  assert.equal(timeToEpoch('23:00', now), now - 90 * 60_000, '23:00 은 어제')
  assert.equal(timeToEpoch('24:00', now), null)
  assert.equal(timeToEpoch('abc', now), null)
}

// ── URL
{
  const q = (s: State) => new URLSearchParams(toQuery(s))
  const back = (s: State) => { const p = q(s); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a: State = { w: 9.5, a: 10, p: 'tylenol', c: 32 }
  assert.equal(toQuery(a), 'w=9.5&a=10&p=tylenol')
  assert.deepEqual(back(a), a)
  const b: State = { w: 20, a: 60, p: 'ibu', c: 40 }
  assert.equal(toQuery(b), 'w=20&a=60&p=ibu&c=40')
  assert.deepEqual(back(b), b)
  assert.deepEqual(back({ w: 12, a: 24, p: 'dexi', c: 12 }), { w: 12, a: 24, p: 'dexi', c: 12 })
  for (const p of PRODUCTS) assert.deepEqual(back({ ...DEFAULT, p: p.id, c: p.conc }), { ...DEFAULT, p: p.id, c: p.conc })
  // 제품이면 c 는 무시하고 허가 농도
  assert.equal(parseState((k) => ({ p: 'brufen', c: '50' })[k] ?? null).c, 20)
  // 틀린 값은 기본값
  const bad = new URLSearchParams('w=0&a=-1&p=aspirin&c=500')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  const frac = new URLSearchParams('a=2.5&w=12.34')
  assert.deepEqual(parseState((k) => frac.get(k)), { ...DEFAULT, w: 12.3 }, '나이는 정수 개월, 체중은 0.1kg')
  // 경계 허용
  const edge = new URLSearchParams('w=2.5&a=168')
  assert.deepEqual(parseState((k) => edge.get(k)), { ...DEFAULT, w: 2.5, a: 168 })
  assert.equal(DAY, 24 * HOUR)
}

console.log('check-fever-medicine-dose: all passed')
