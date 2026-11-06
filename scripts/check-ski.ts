// node scripts/check-ski.ts (Node 24 strips types). Pure calculation, no network.
import assert from 'node:assert/strict'
import { skiDays, skiScore } from '../src/lib/ski/forecast.ts'
import { RESORTS, openingFor } from '../src/lib/ski/resorts.ts'
import type { Forecast } from '../src/lib/everland/planner.ts'

const now = Date.parse('2026-12-01T00:00:00+09:00') // Tue
const slot = (date: string, h: number, temperature: number, rain: number, symbol: string, wind = 3) => ({
  start: new Date(Date.parse(`${date}T${String(h).padStart(2, '0')}:00:00+09:00`)).toISOString(),
  end: new Date(Date.parse(`${date}T${String(h).padStart(2, '0')}:00:00+09:00`) + 3600000).toISOString(), temperature, wind, rain, symbol,
})
const hours = (date: string, f: (h: number) => ReturnType<typeof slot>) => Array.from({ length: 24 }, (_, h) => f(h))
const forecast: Forecast = { issuedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString(), slots: [
  ...hours('2026-12-01', h => slot('2026-12-01', h, -4, h >= 10 && h < 12 ? 1 : 0, 'snow')),   // Tue: fresh snow
  ...hours('2026-12-02', h => slot('2026-12-02', h, 3, h >= 9 && h < 13 ? 1.5 : 0, 'rain')),   // Wed: 6mm rain
  ...hours('2026-12-05', h => slot('2026-12-05', h, -6, 0, 'clearsky_day', 16)),                // Sat: gale
  ...hours('2026-12-08', h => slot('2026-12-08', h, -20, 0, 'clearsky_day')),                   // Tue: very cold
] }
const days = skiDays(forecast, now)
assert.deepEqual(days.map(d => d.date), ['2026-12-01', '2026-12-02', '2026-12-05', '2026-12-08'])
const [snowDay, rainDay] = days
assert.deepEqual([snowDay.snow, snowDay.rain, rainDay.rain, rainDay.snow], [2, 0, 6, 0], 'precip split by symbol/temperature within 09–17')
const s = days.map(skiScore)
assert.ok(s[0].score > s[3].score && s[3].score > s[1].score, `order ${s.map(x => x.score)}`)
assert.ok(s[1].caution && s[1].score <= 45, 'rain caps the score'); assert.ok(s[2].caution && s[2].reasons.includes('wind') && s[2].crowd === 'high')
assert.ok(s[0].reasons.includes('snow') && s[0].reasons.includes('weekday')); assert.ok(s[3].reasons.includes('cold'))
assert.equal(skiScore({ date: '2026-12-25', low: -5, high: -1, rain: 0, snow: 0, wind: 3, coverage: 8 }).reasons.at(-1), 'holiday')
// Afternoon partial day is dropped; opening dates are valid ISO dates in season.
const t = Date.parse('2026-12-01T13:00:00+09:00') // MET has no past slots
assert.equal(skiDays({ ...forecast, slots: forecast.slots.filter(x => Date.parse(x.start) >= t) }, t)[0].date, '2026-12-02')
assert.equal(new Set(RESORTS.map(r => r.id)).size, RESORTS.length)
for (const r of RESORTS) if (r.opening) assert.match(r.opening.date, /^2026-1[12]-\d\d$/)
const konjiam = RESORTS.find(r => r.id === 'konjiam')!, phoenix = RESORTS.find(r => r.id === 'phoenix')!
assert.deepEqual(openingFor(konjiam, '2026-11-09'), { date: '2026-12-01', estimated: true }, 'unknown → usual start')
assert.deepEqual(openingFor(konjiam, '2027-01-15'), { date: '2026-12-01', estimated: true }, 'January belongs to the season that started last year')
assert.deepEqual(openingFor(phoenix, '2026-11-09'), { date: '2026-11-27', estimated: false })
console.log(`PASS: 09–17 KST aggregation, snow/rain split, scores ${s.map(x => x.score).join('/')}, rain/wind caution, holiday, partial day, resort data`)
