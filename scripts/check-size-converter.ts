// node scripts/check-size-converter.ts (Node 24) — 해외 사이즈 변환 표·추천·URL 회귀 체크
// 기대값은 손으로 계산: US 남성 = (mm − 180)/10, US 여성 = (mm − 170)/10, UK = (mm − 190)/10, EU = (2mm + 100)/15 를 0.5 내림
import assert from 'node:assert/strict'
import {
  TABLES, TABS, DEFAULT, options, rowOf, recommend, parseState, toQuery, selectedRow, cellsOf, defaultOf,
  usMenOf, usWomenOf, unisexW, euOf, kidFoot, ringDia, ukLetter, type State, type TabId,
} from '../src/utils/sizeConverter.ts'
import { limitUsd } from '../src/utils/customsDuty.ts'

const col = (t: TabId, key: string) => TABLES[t].cols.indexOf(key)
const cells = (t: TabId, key: string, v: string) => { const i = rowOf(t, col(t, key), v); assert.notEqual(i, null, `${t} ${key}=${v}`); return cellsOf(t, i!) }

// ── 기본값: 남성 270mm = US 9 · UK 8 · EU 42.5 · JP 27
assert.deepEqual(DEFAULT, { t: 'm', s: 'mm', v: '270' })
assert.deepEqual(cellsOf('m', selectedRow(DEFAULT)), { mm: '270', usM: '9', uk: '8', eu: '42.5', jpcm: '27' })
// 대표값(나이키 남성 표와 같은 줄): 250 = US 7 · UK 6 · EU 40, 280 = US 10 · UK 9 · EU 44, 265 = 8.5 · 7.5 · 42
assert.deepEqual(cells('m', 'mm', '250'), { mm: '250', usM: '7', uk: '6', eu: '40', jpcm: '25' })
assert.deepEqual(cells('m', 'mm', '280'), { mm: '280', usM: '10', uk: '9', eu: '44', jpcm: '28' })
assert.deepEqual(cells('m', 'mm', '265'), { mm: '265', usM: '8.5', uk: '7.5', eu: '42', jpcm: '26.5' })
// 여성 240 = US 7 · UK 5 · EU 38.5 · JP 24 / 230 = US 6 · UK 4 · EU 37
assert.deepEqual(cells('w', 'mm', '240'), { mm: '240', usW: '7', uk: '5', eu: '38.5', jpcm: '24' })
assert.deepEqual(cells('w', 'mm', '230'), { mm: '230', usW: '6', uk: '4', eu: '37', jpcm: '23' })

// ── 왕복: mm → US → mm (반 사이즈 포함)
for (const t of ['m', 'w'] as const) {
  const us = t === 'm' ? 'usM' : 'usW'
  for (const r of TABLES[t].rows) {
    const c = cellsOf(t, TABLES[t].rows.indexOf(r))
    assert.equal(cellsOf(t, rowOf(t, col(t, us), c[us])!).mm, c.mm, `${t} ${c.mm} → US ${c[us]} → mm`)
    for (const key of ['uk', 'eu', 'jpcm']) assert.equal(cellsOf(t, rowOf(t, col(t, key), c[key])!).mm, c.mm, `${t} ${c.mm} ${key}`)
  }
}
assert.equal(cells('m', 'usM', '9.5').mm, '275')
assert.equal(cells('w', 'usW', '8.5').mm, '255')

// ── 남녀 US 차이: 같은 mm 에서 여성 = 남성 + 1, 공용 라벨은 + 1.5
for (const mm of [220, 235, 250, 265, 280]) assert.equal(usWomenOf(mm) - usMenOf(mm), 1, `${mm}mm`)
assert.equal(cells('m', 'mm', '250').usM, '7')
assert.equal(cells('w', 'mm', '250').usW, '8')
assert.equal(unisexW(7), 8.5, 'M 7 / W 8.5')
assert.equal(unisexW(usMenOf(240)), 7.5, '여성 240 이 공용 모델이면 M 6 / W 7.5')
// EU 공식: 아디다스 1/3 단위 값을 0.5 내림
assert.equal(euOf(270), 42.5) // 42.667
assert.equal(euOf(260), 41) // 41.333
assert.equal(euOf(235), 38) // 38 딱
assert.equal(euOf(330), 50.5) // 50.667

// ── 실측 → 추천(같거나 큰 첫 치수)
const rec = (t: TabId, x: number) => { const r = recommend(t, x); return r.i === null ? r.out : TABLES[t].rows[r.i].cells[0] }
assert.equal(rec('m', 263), '265')
assert.equal(rec('m', 265), '265', '딱 맞으면 그대로')
assert.equal(rec('m', 265.1), '270', '반 사이즈 사이면 큰 쪽')
assert.equal(rec('m', 330), '330')
assert.equal(rec('m', 330.5), 'high', '표 밖(위)')
assert.equal(rec('m', 216), '220')
assert.equal(rec('m', 215), 'low', '첫 줄보다 한 칸 넘게 작으면 표 밖')
assert.equal(rec('w', 238), '240')
assert.equal(rec('m', 0), null)
assert.equal(rec('m', NaN), null)

// ── 아동 C/Y: 발길이(in) = (치수 + 9.75)/3
assert.equal(Math.round(kidFoot(10)), 167, '(10 + 9.75)/3 × 25.4 = 167.2')
assert.deepEqual(cells('k', 'usK', '10C'), { foot: '167', usK: '10C', uk: '9.5K', eu: '27', jpcm: '16.5' })
assert.deepEqual(cells('k', 'usK', '13.5C'), { foot: '197', usK: '13.5C', uk: '13K', eu: '31.5', jpcm: '19.5' })
assert.deepEqual(cells('k', 'usK', '1Y'), { foot: '201', usK: '1Y', uk: '13.5K', eu: '32', jpcm: '20' }, '13.5C 다음은 1Y')
assert.equal(cells('k', 'usK', '1.5Y').uk, '1', 'UK 키즈 13.5 다음은 성인 1')
assert.deepEqual(cells('k', 'usK', '7Y'), { foot: '252', usK: '7Y', uk: '6.5', eu: '40', jpcm: '25' })
assert.equal(TABLES.k.rows[0].cells[1], '4C')
assert.equal(TABLES.k.rows.length, 33, '4C~13.5C 20줄 + 1Y~7Y 13줄')
// JP 14 는 6.5C(13.76)·7C(14.18) 둘 다 → 14 에 가까운 7C
assert.equal(cells('k', 'jpcm', '14').usK, '7C')
assert.equal(rec('k', 167), '167', '10C')
assert.equal(TABLES.k.rows[recommend('k', 167.5).i!].cells[1], '10.5C')
assert.equal(TABLES.k.rows[recommend('k', 170).i!].cells[1], '10.5C', '한국 170 → 171mm 줄')

// ── 반지: 안지름 13 + (호수 − 1)/3, 둘레 = π × 안지름
assert.ok(Math.abs(ringDia(9) - 15.6667) < 1e-4)
assert.deepEqual(cells('r', 'ho', '9'), { ho: '9', circ: '49.2', dia: '15.67', us: '5', uk: 'J½', iso: '49', jp: '9' })
assert.deepEqual(cells('r', 'ho', '12'), { ho: '12', circ: '52.4', dia: '16.67', us: '6', uk: 'M', iso: '52', jp: '12' })
assert.deepEqual(cells('r', 'ho', '14'), { ho: '14', circ: '54.5', dia: '17.33', us: '7', uk: 'N½', iso: '54', jp: '14' })
assert.equal(cells('r', 'ho', '1').circ, '40.8')
assert.equal(cells('r', 'ho', '1').uk, 'C½')
assert.equal(cells('r', 'ho', '30').uk, 'Z+2')
assert.equal(ukLetter(26), 'Z')
assert.equal(ukLetter(12.5), 'L½')
// US 6 은 11호(5.79)·12호(6.20) 둘 다 → 6 에 가까운 12호, US 8 은 16호(7.84)·17호(8.25) → 16호
assert.equal(cells('r', 'us', '6').ho, '12')
assert.equal(cells('r', 'us', '8').ho, '16')
// 둘레 → 호수
assert.equal(rec('r', 52), '12', '52mm → 12호(52.4)')
assert.equal(rec('r', 49.2), '9')
assert.equal(rec('r', 49.3), '10')
assert.equal(rec('r', 75), 'high')
assert.equal(rec('r', 30), 'low')

// ── 옷
assert.deepEqual(cells('wt', 'kr', '55'), { kr: '55', intl: 'S', usW: '4', uk: '8', eu: '36', jp: '9', bust: '85' })
assert.equal(cells('wt', 'usW', '6').kr, '66')
assert.equal(cells('mt', 'us', 'M').kr, '100', '미국 M 은 한국 100')
assert.equal(rec('mt', 96), '95')
assert.equal(rec('mt', 97.5), '100')
assert.equal(rec('wt', 86), '55')
assert.equal(rec('wt', 96), 'high')
assert.equal(cells('pt', 'inch', '30').cm, '76.2')
assert.equal(rec('pt', 76), '30')
assert.equal(rec('pt', 77), '31')

// ── 모든 표: 열 개수, 단조 증가, 선택지 표기 중복 없음
for (const t of TABS) {
  const tb = TABLES[t]
  assert.ok(tb.def >= 0 && tb.def < tb.rows.length, `${t} 기본 줄`)
  tb.rows.forEach((r, i) => {
    assert.equal(r.cells.length, tb.cols.length, `${t} ${i} 칸 수`)
    if (i > 0) {
      assert.ok(r.m > tb.rows[i - 1].m, `${t} ${r.cells[0]} m 증가`)
      if (r.x) r.x.forEach((x, j) => assert.ok(x >= tb.rows[i - 1].x![j], `${t} ${r.cells[0]} ${tb.cols[j]} 감소`))
    }
  })
  // 첫 열은 줄마다 다르다(줄 = 첫 열)
  assert.equal(options(t, 0).length, tb.rows.length, `${t} 첫 열 중복`)
}

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const cases: [State, string][] = [
    [{ t: 'm', s: 'mm', v: '275' }, 'v=275'],
    [{ t: 'm', s: 'usM', v: '9' }, 's=usM'],
    [{ t: 'm', s: 'eu', v: '44' }, 's=eu&v=44'],
    [{ t: 'w', s: 'mm', v: '240' }, 't=w'],
    [{ t: 'k', s: 'usK', v: '2Y' }, 't=k&s=usK&v=2Y'],
    [{ t: 'wt', s: 'kr', v: '66' }, 't=wt&v=66'],
    [{ t: 'r', s: 'us', v: '6' }, 't=r&s=us'],
    [{ t: 'r', s: 'uk', v: 'J½' }, 't=r&s=uk&v=J%C2%BD'],
  ]
  for (const [s, q] of cases) {
    assert.equal(toQuery(s), q)
    assert.deepEqual(back(s), s)
  }
  for (const t of TABS) assert.deepEqual(back(defaultOf(t)), defaultOf(t), `${t} 기본`)
  // 틀린 값은 기본값
  const bad = new URLSearchParams('t=zz&s=nope&v=999')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  const badV = new URLSearchParams('t=w&s=usW&v=15.5')
  assert.deepEqual(parseState((k) => badV.get(k)), { t: 'w', s: 'usW', v: '7' }, '표 밖 값 → 그 탭 기본 줄')
  const badS = new URLSearchParams('t=r&s=mm&v=14')
  assert.deepEqual(parseState((k) => badS.get(k)), { t: 'r', s: 'ho', v: '14' }, '없는 체계 → 첫 열')
}

// ── 직구 팁의 면세 한도(관부가세 도구와 같은 값)
assert.equal(limitUsd('us', 'list'), 200)
assert.equal(limitUsd('other', 'list'), 150)

console.log('check-size-converter: all passed')
