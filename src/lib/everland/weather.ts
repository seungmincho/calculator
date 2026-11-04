import { normalizeForecast, type Forecast } from './planner.ts'
import type { Database } from './storage.ts'
import { parks, type ParkId } from '../theme-parks/config.ts'
export const WEATHER_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=37.294&lon=127.204'
export async function readForecast(db: Database, park: ParkId = 'everland'): Promise<Forecast | null> {
  const query = park==='everland' ? db.prepare('SELECT forecast FROM everland_weather WHERE id=1') : db.prepare('SELECT forecast FROM park_forecasts WHERE park=?').bind(park)
  const row = await query.first<{forecast:string}>()
  return row ? JSON.parse(row.forecast) as Forecast : null
}
export async function refreshForecast(db: Database, request: typeof fetch = fetch, now = Date.now(), park: ParkId = 'everland'): Promise<Forecast> {
  const cached = await readForecast(db,park)
  if (cached && now-Date.parse(cached.fetchedAt) < 3600000) return cached
  const location = parks[park]
  const url = park==='everland' ? WEATHER_URL : `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location.latitude}&lon=${location.longitude}`
  const response = await request(url, { signal:AbortSignal.timeout(15000), headers:{'User-Agent':'ToolHub/1.0 (+https://toolhub.ai.kr/about/)', Accept:'application/json'} })
  if (!response.ok) throw new Error(`Weather upstream HTTP ${response.status}`)
  const forecast = normalizeForecast(await response.json(), now)
  await db.batch([park==='everland' ? db.prepare('INSERT INTO everland_weather (id,forecast) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET forecast=excluded.forecast').bind(JSON.stringify(forecast)) : db.prepare('INSERT INTO park_forecasts (park,forecast) VALUES (?,?) ON CONFLICT(park) DO UPDATE SET forecast=excluded.forecast').bind(park,JSON.stringify(forecast))])
  return forecast
}
