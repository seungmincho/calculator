// node scripts/check-wind-chill.ts (Node 24) — 기상청 기상자료개방포털 '체감온도 산출표'(2026-11-07)와 대조
import assert from 'node:assert/strict'
import { TABLE_TEMPS, TABLE_WINDS_KMH, applies, coldRuns, stageOf, tableValue, windChill, windChillKmh } from '../src/utils/windChill.ts'
import { cityForecast } from '../src/lib/windChill/forecast.ts'

// 포털 표: 행 = 풍속 1.4~16.7m/s(≈5~60km/h), 열 = 기온 0~−50℃
const KMA = [
  [-2, -7, -13, -19, -24, -30, -36, -41, -47, -53, -58], [-3, -9, -15, -21, -27, -33, -39, -45, -51, -57, -63],
  [-4, -11, -17, -23, -29, -35, -41, -48, -54, -60, -66], [-5, -12, -18, -24, -31, -37, -43, -49, -56, -62, -68],
  [-6, -12, -19, -25, -32, -38, -45, -51, -57, -64, -70], [-6, -13, -20, -26, -33, -39, -46, -52, -59, -65, -72],
  [-7, -14, -20, -27, -33, -40, -47, -53, -60, -66, -73], [-7, -14, -21, -27, -34, -41, -48, -54, -61, -68, -74],
  [-8, -15, -21, -28, -35, -42, -48, -55, -62, -69, -75], [-8, -15, -22, -29, -35, -42, -49, -56, -63, -70, -76],
  [-8, -15, -22, -29, -36, -43, -50, -57, -63, -70, -77], [-9, -16, -23, -30, -36, -43, -50, -57, -64, -71, -78],
]
const off: string[] = []
TABLE_WINDS_KMH.forEach((v, i) => TABLE_TEMPS.forEach((t, j) => {
  const d = tableValue(t, v) - KMA[i][j]
  assert.ok(Math.abs(d) <= 1, `T=${t} V=${v}km/h: ${tableValue(t, v)} vs ${KMA[i][j]}`)
  if (d) off.push(`${t}/${v}`)
}))
assert.ok(off.length <= 3, `포털 표와 1℃ 다른 칸이 3칸을 넘음: ${off.join(', ')}`) // 반올림 경계(−30.48 등)

// 산출 조건: 기온 10℃ 이하, 풍속 4.8km/h 초과 — 아니면 기온 그대로
assert.equal(windChill(12, 10), 12)
assert.equal(windChill(-5, 1.3), -5, '1.3m/s = 4.68km/h → 산출 안 함')
assert.equal(applies(-5, 1.34), true)
assert.ok(windChill(10, 5) < 10)
assert.ok(windChillKmh(5, 100) <= 5, '결과는 기온보다 높지 않다')
assert.ok(Number.isNaN(windChill(NaN, 5)), 'NaN 입력은 NaN (화면에서 빈칸 처리)')

// 단계 (포털 지도 범례)
assert.equal(stageOf(15, 5), 'none')
assert.equal(stageOf(-5, 1), 'none')
assert.equal(stageOf(0, 5), 'interest')        // ≈ −5
assert.equal(stageOf(-5, 5), 'caution')        // ≈ −11.2
assert.equal(stageOf(-20, 10), 'warning')      // ≈ −33
assert.equal(stageOf(-35, 15), 'danger')       // ≈ −54
assert.equal(Math.round(windChill(-5, 5) * 10) / 10, -11.2)

// 한파 참고: 아침 최저 −12℃ 이하 이틀 / −15℃ 이하 이틀
const runs = coldRuns([
  { date: 'd1', morningMin: -8 }, { date: 'd2', morningMin: -12 }, { date: 'd3', morningMin: -16 }, { date: 'd4', morningMin: -15.5 },
  { date: 'd5', morningMin: -3 }, { date: 'd6', morningMin: -13 }, { date: 'd7', morningMin: null },
])
assert.deepEqual(runs, { d2: 'advisory', d3: 'warning', d4: 'warning' })

// MET 응답 → 48시간 + 날짜별 요약 (KST)
const now = Date.parse('2027-01-10T00:00:00Z') // 09:00 KST
const ts = Array.from({ length: 60 }, (_, i) => ({
  time: new Date(now + i * 3600000).toISOString(),
  data: { instant: { details: { air_temperature: -10 + (i % 24) * 0.5, wind_speed: 5 } }, next_1_hours: { summary: { symbol_code: 'clearsky_day' }, details: { precipitation_amount: 0 } } },
}))
const met = { properties: { meta: { updated_at: '2027-01-09T23:30:00Z', units: { air_temperature: 'celsius', wind_speed: 'm/s', precipitation_amount: 'mm' } }, timeseries: ts } }
const cf = cityForecast(met, now)
assert.equal(cf.hours.length, 48)
assert.deepEqual(cf.hours[0], { at: '2027-01-10T00:00:00.000Z', temp: -10, wind: 5 })
assert.equal(cf.days[0].date, '2027-01-10')
assert.equal(cf.days[0].morningMin, -10, '09시 KST 구간 포함')
assert.equal(cf.days[0].minWc, Math.round(windChill(-10, 5) * 10) / 10)
assert.equal(cf.days[1].date, '2027-01-11')
assert.throws(() => cityForecast({ properties: { meta: { units: { air_temperature: 'fahrenheit' } } } }, now))
console.log('check-wind-chill: all passed')
