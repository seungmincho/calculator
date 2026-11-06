// node scripts/check-sun.ts (Node 24 strips types). Pure calculation, no network.
import assert from 'node:assert/strict'
import { sunTimes, kstTime, kstDate, newYearTarget, monthDates } from '../src/lib/sun/solar.ts'
import { SPOTS, CITIES } from '../src/lib/sun/places.ts'
import { skyAtSunrise, skyFrom, fetchSunriseSky } from '../src/lib/sun/weather.ts'

// KASI's announced 2026-01-01 sunrise (news reports, rounded minutes). Seoul was reported as 07:46~07:47.
// The equation is good to about a minute, so a value on a :30 boundary may round either way.
const kasi: Record<string, string> = { dokdo: '07:26', ganjeolgot: '07:31', haeundae: '07:32', jeongdongjin: '07:39', seoul: '07:47' }
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
for (const [id, expected] of Object.entries(kasi)) {
  const s = SPOTS.find(x => x.id === id)!
  const got = kstTime(sunTimes('2026-01-01', s.lat, s.lon).sunrise)
  assert.ok(Math.abs(minutes(got) - minutes(expected)) <= 1, `${id}: ${got} vs KASI ${expected}`)
}
// Seongsan's 07:36 is the sea-level value; the 182 m summit sees the sun about 2 minutes earlier.
const seongsan = SPOTS.find(x => x.id === 'seongsan')!
assert.equal(kstTime(sunTimes('2026-01-01', seongsan.lat, seongsan.lon).sunrise), '07:36')
const lift = sunTimes('2026-01-01', seongsan.lat, seongsan.lon).sunrise! - sunTimes('2026-01-01', seongsan.lat, seongsan.lon, 182).sunrise!
assert.ok(lift > 90000 && lift < 240000, `elevation effect ${lift / 1000}s`)

// Seoul solstice day lengths (KASI: about 9h34m in December, 14h46m in June).
const seoul = CITIES.find(c => c.id === 'seoul')!
const hours = (date: string) => sunTimes(date, seoul.lat, seoul.lon).dayLength! / 3600000
assert.ok(Math.abs(hours('2026-12-22') - (9 + 34 / 60)) < 3 / 60, `winter ${hours('2026-12-22')}`)
assert.ok(Math.abs(hours('2026-06-21') - (14 + 46 / 60)) < 3 / 60, `summer ${hours('2026-06-21')}`)
const t = sunTimes('2026-11-06', seoul.lat, seoul.lon)
assert.ok(t.dawn! < t.sunrise! && t.sunrise! < t.goldenEnd! && t.goldenEnd! < t.noon && t.noon < t.goldenStart! && t.goldenStart! < t.sunset! && t.sunset! < t.dusk!)
assert.equal(kstTime(null), '—')
for (const date of ['2026-01-01', '2026-06-21', '2026-11-06', '2027-01-01']) {
  const x = sunTimes(date, seoul.lat, seoul.lon)
  assert.deepEqual([x.sunrise, x.noon, x.sunset].map(v => kstDate(v!)), [date, date, date], `events fall on ${date}`)
}
// Winter sunrise: Ganjeolgot beats Homigot; in June Homigot is earlier.
const at = (id: string, date: string) => { const s = SPOTS.find(x => x.id === id)!; return sunTimes(date, s.lat, s.lon).sunrise! }
assert.ok(at('ganjeolgot', '2027-01-01') < at('homigot', '2027-01-01'))
assert.ok(at('homigot', '2026-06-21') < at('ganjeolgot', '2026-06-21'))

assert.equal(newYearTarget(Date.parse('2026-11-06T00:00:00Z')), '2027-01-01')
assert.equal(newYearTarget(Date.parse('2026-12-31T15:30:00Z')), '2027-01-01', 'already Jan 1 in KST')
assert.equal(newYearTarget(Date.parse('2027-01-01T15:00:00Z')), '2028-01-01')
assert.equal(monthDates('2026-02').length, 28)
assert.equal(monthDates('2028-02').at(-1), '2028-02-29')
// Sky at sunrise: nearest point within 3 h, invalid cloud values dropped, no MET calls before the window.
const rise = Date.parse('2026-12-31T22:30:00Z'), point = (iso: string, cloud: unknown, rain?: number) => ({ time: iso, data: { instant: { details: { cloud_area_fraction: cloud } }, ...(rain === undefined ? {} : { next_6_hours: { details: { precipitation_amount: rain } } }) } })
assert.deepEqual(skyAtSunrise({ properties: { timeseries: [point('2026-12-31T18:00:00Z', 90), point('2027-01-01T00:00:00Z', 20.4, 0)] } }, rise), { cloud: 20, rain: 0, gapMinutes: 90 })
assert.equal(skyAtSunrise({ properties: { timeseries: [point('2026-12-31T12:00:00Z', 10)] } }, rise), null, 'too far from sunrise')
assert.equal(skyAtSunrise({ properties: { timeseries: [point('2026-12-31T22:00:00Z', 140)] } }, rise), null)
assert.equal(skyFrom('2027-01-01'), '2026-12-23')
const early = await fetchSunriseSky('2027-01-01', Date.parse('2026-11-06T00:00:00Z'), () => { throw new Error('must not call MET early') })
assert.deepEqual([early.available, early.from, Object.keys(early.spots).length], [false, '2026-12-23', 0])
const metNow = Date.parse('2026-12-25T00:00:00Z'), fakeMet: typeof fetch = async () => new Response(JSON.stringify({ properties: { meta: { updated_at: '2026-12-24T23:00:00Z' }, timeseries: [point('2026-12-31T21:00:00Z', 55, 0.2), point('2026-12-31T23:00:00Z', 60, 0)] } }))
const live = await fetchSunriseSky('2027-01-01', metNow, fakeMet)
assert.equal(live.available, true); assert.equal(Object.keys(live.spots).length, SPOTS.length); assert.equal(live.issuedAt, '2026-12-24T23:00:00Z')
console.log('PASS: KASI 2026-01-01 sunrise (5 spots), elevation dip, solstice day lengths, event order, winter/summer east-coast order, New Year target, month dates')
