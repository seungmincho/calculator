// 단위 변환 회귀 체크: node scripts/check-units.ts
import assert from 'node:assert/strict'
import { CATEGORIES, UNITS, TRADITIONAL, convert, findUnit, formatNum, parseInput, searchUnits, unitsOf } from '../src/utils/units.ts'

const near = (a: number, b: number, rel = 1e-12) =>
  assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} ≉ ${b}`)

// 정의값 (NIST SP 811 / 1959 국제 협정)
assert.equal(convert('length', 'inch', 'm', 1), 0.0254)
assert.equal(convert('length', 'ft', 'm', 1), 0.3048)
near(convert('length', 'mi', 'km', 1), 1.609344)
assert.equal(convert('length', 'nmi', 'm', 1), 1852)
assert.equal(convert('weight', 'lb', 'kg', 1), 0.45359237)
near(convert('weight', 'oz', 'g', 1), 28.349523125)
near(convert('area', 'acre', 'm2', 1), 4046.8564224)
near(convert('volume', 'usGal', 'L', 1), 3.785411784)
near(convert('volume', 'usFlOz', 'mL', 1), 29.5735295625)
near(convert('pressure', 'psi', 'Pa', 1), 6894.757293168361)
near(convert('pressure', 'atm', 'kPa', 1), 101.325)
near(convert('energy', 'kcal', 'kJ', 1), 4.184)
assert.equal(convert('energy', 'kWh', 'J', 1), 3.6e6)
near(convert('speed', 'knot', 'kmh', 1), 1.852)
near(convert('speed', 'mph', 'kmh', 60), 96.56064)

// 한국 전통 단위
near(convert('area', 'pyeong', 'm2', 1), 400 / 121)
near(convert('area', 'm2', 'pyeong', 84), 25.41)
near(convert('length', 'ja', 'm', 6) ** 2, convert('area', 'pyeong', 'm2', 1)) // 평 = 6자 × 6자
near(convert('area', 'jeongbo', 'danbo', 1), 10)
assert.equal(convert('weight', 'geunMeat', 'g', 1), 600)
assert.equal(convert('weight', 'geunVeg', 'g', 1), 375)
near(convert('weight', 'don', 'g', 1), 3.75)
near(convert('weight', 'nyang', 'don', 1), 10)
near(convert('weight', 'gwan', 'geunVeg', 1), 10)
near(convert('volume', 'doe', 'L', 1), 1.8039068369646882)
near(convert('volume', 'doe', 'L', 1), (64.827 * convert('length', 'chi', 'cm', 1) ** 3) / 1000) // 1되 = 64.827 입방치
near(convert('volume', 'mal', 'hop', 1), 100)
for (const [cat, id, metric] of TRADITIONAL) {
  assert.ok(findUnit(cat, id) && findUnit(cat, metric), `${cat}.${id}/${metric}`)
}

// 온도: 함수 변환
near(convert('temperature', 'degC', 'degF', 100), 212)
near(convert('temperature', 'degF', 'degC', 32), 0)
near(convert('temperature', 'degC', 'K', 0), 273.15)
near(convert('temperature', 'degC', 'degF', -40), -40)
near(convert('temperature', 'K', 'degR', 1), 1.8)
near(convert('temperature', 'degF', 'degR', 0), 459.67)
near(convert('temperature', 'degC', 'degF', 36.5), 97.7)

// 데이터: SI(1000) vs IEC(1024)
assert.equal(convert('data', 'kB', 'byte', 1), 1000)
assert.equal(convert('data', 'KiB', 'byte', 1), 1024)
assert.equal(convert('data', 'GiB', 'MiB', 1), 1024)
near(convert('data', 'TB', 'GiB', 1), 931.3225746154785)
assert.equal(convert('data', 'Mbit', 'MB', 100), 12.5)
assert.equal(convert('data', 'byte', 'bit', 1), 8)

// 연비: 역수 관계
near(convert('fuel', 'kmL', 'L100km', 10), 10)
near(convert('fuel', 'kmL', 'L100km', 20), 5)
near(convert('fuel', 'mpgUS', 'kmL', 1), 0.42514370749052, 1e-10)
near(convert('fuel', 'mpgUS', 'L100km', 30), 235.2145833 / 30, 1e-9) // 235.215 ÷ mpg
assert.equal(convert('fuel', 'L100km', 'kmL', 0), Infinity)

// 요리: 한국 1컵 200mL vs 미국 1컵 236.6mL
assert.equal(convert('cooking', 'cupKr', 'mL', 1), 200)
near(convert('cooking', 'cupUs', 'mL', 1), 236.5882365)
assert.equal(convert('cooking', 'tbsp', 'tsp', 1), 3)

// CSS: rem 기준값
assert.equal(convert('css', 'rem', 'px', 1), 16)
assert.equal(convert('css', 'rem', 'px', 1, { remBase: 10 }), 10)
near(convert('css', 'pt', 'px', 12), 16)
assert.equal(convert('css', 'inch', 'px', 1), 96)

// 시간
assert.equal(convert('time', 'day', 'h', 1), 24)
near(convert('time', 'year', 'day', 1), 365.2425)

// 모든 카테고리·단위 쌍 왕복
for (const cat of CATEGORIES) {
  for (const a of unitsOf(cat)) for (const b of unitsOf(cat)) {
    for (const v of [1, 123.456, 0.001]) near(convert(cat, b.id, a.id, convert(cat, a.id, b.id, v)), v, 1e-9)
  }
}
// id 중복 없음 (카테고리 내)
for (const [cat, list] of Object.entries(UNITS)) assert.equal(new Set(list.map((u) => u.id)).size, list.length, cat)

assert.ok(Number.isNaN(convert('length', 'm', 'nope', 1)))
assert.ok(Number.isNaN(convert('length', 'm', 'cm', NaN)))

// 입력 파싱 · 포맷
assert.equal(parseInput('1,234.5'), 1234.5)
assert.equal(parseInput('1e-9'), 1e-9)
assert.ok(Number.isNaN(parseInput('')))
assert.ok(Number.isNaN(parseInput('abc')))
assert.equal(formatNum(0.1 + 0.2, 10), '0.3')
assert.equal(formatNum(1234567.891, 10), '1,234,567.891')
assert.equal(formatNum(123456789.4, 4), '123,456,789')
assert.equal(formatNum(2.54, 4, false), '2.54')
assert.equal(formatNum(1.602176634e-19, 4), '1.602e-19')
assert.equal(formatNum(1e21, 6), '1e+21')
assert.equal(formatNum(0.0000123456, 3), '0.0000123')
assert.equal(formatNum(-1234.5, 10), '-1,234.5')
assert.equal(formatNum(Infinity), '∞')
assert.equal(formatNum(NaN), '—')

// 검색
const nm = (_c: string, id: string) => ({ pyeong: '평', lb: '파운드', inch: '인치' } as Record<string, string>)[id] ?? id
assert.deepEqual(searchUnits('평', nm)[0], { cat: 'area', id: 'pyeong', score: 3 })
assert.equal(searchUnits('inch', nm)[0].id, 'inch')
assert.equal(searchUnits('파운드', nm)[0].id, 'lb')
assert.equal(searchUnits('KiB', nm)[0].id, 'KiB')
assert.equal(searchUnits('', nm).length, 0)

console.log('all unit checks passed')
