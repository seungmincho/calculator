import { normalize, seoulDay, type Snapshot } from '../everland/model.ts'
import type { Database } from '../everland/storage.ts'
import { parks, type ParkId } from './config.ts'
export async function collectPark(db: Database, park: Exclude<ParkId,'everland'>, request: typeof fetch = fetch, now?: number) {
  const id=parks[park].providerId
  if (!id) return null
  const get=async(path:string)=>{const res=await request(`https://api.themeparks.wiki/v1/entity/${id}/${path}`,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'ToolHub/1.0 (+https://toolhub.ai.kr/about/)'}});if(!res.ok)throw new Error(`Park upstream HTTP ${res.status}`);return res.json()}
  const [children,live]=await Promise.all([get('children'),get('live')])
  const timestamp=now??Date.now(),snapshot=normalize(children,live,new Date(timestamp).toISOString(),id)
  const bucket=Math.floor(timestamp/600000)*600000
  await db.batch([db.prepare('INSERT INTO park_snapshots (park,bucket,fetched_at,snapshot) VALUES (?,?,?,?) ON CONFLICT(park,bucket) DO UPDATE SET fetched_at=excluded.fetched_at,snapshot=excluded.snapshot').bind(park,bucket,snapshot.fetchedAt,JSON.stringify(snapshot)),db.prepare('DELETE FROM park_snapshots WHERE park=? AND bucket<?').bind(park,bucket-7*86400000)])
  return snapshot
}
export interface ScheduleDay { day: string; opening: string; closing: string }
/** OPERATING entries only, merged per day (earliest open, latest close). Invalid entries are dropped. */
export function normalizeSchedule(raw: unknown, providerId: string): ScheduleDay[] {
  const r = raw && typeof raw === 'object' ? raw as { id?: unknown; schedule?: unknown } : {}
  if (r.id !== providerId || !Array.isArray(r.schedule)) throw new Error('Invalid schedule response')
  const days = new Map<string, { open: number; close: number }>()
  for (const e of r.schedule as Record<string, unknown>[]) {
    const open = Date.parse(String(e?.openingTime)), close = Date.parse(String(e?.closingTime)), day = String(e?.date)
    if (e?.type !== 'OPERATING' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !(close > open) || close - open > 86400000) continue
    const d = days.get(day)
    days.set(day, { open: Math.min(open, d?.open ?? open), close: Math.max(close, d?.close ?? close) })
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, opening: new Date(d.open).toISOString(), closing: new Date(d.close).toISOString() }))
}
/** Refreshes provider operating hours at most every 12 hours. Future days are replaced, past days kept. */
export async function collectSchedule(db: Database, park: ParkId, request: typeof fetch = fetch, now = Date.now()) {
  const id = parks[park].providerId
  if (!id) return null
  const last = await db.prepare('SELECT MAX(fetched_at) AS t FROM park_schedules WHERE park=?').bind(park).first<{ t: string | null }>()
  if (last?.t && now - Date.parse(last.t) < 12 * 3600000) return null
  const res = await request(`https://api.themeparks.wiki/v1/entity/${id}/schedule`, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/about/)' } })
  if (!res.ok) throw new Error(`Schedule upstream HTTP ${res.status}`)
  const days = normalizeSchedule(await res.json(), id), fetchedAt = new Date(now).toISOString(), today = seoulDay(now)
  await db.batch([db.prepare('DELETE FROM park_schedules WHERE park=? AND day>=?').bind(park, today),
    ...days.filter(d => d.day >= today).map(d => db.prepare('INSERT INTO park_schedules (park,day,opening,closing,fetched_at) VALUES (?,?,?,?,?) ON CONFLICT(park,day) DO UPDATE SET opening=excluded.opening,closing=excluded.closing,fetched_at=excluded.fetched_at').bind(park, d.day, d.opening, d.closing, fetchedAt))])
  return days
}
export async function readParkSnapshot(db: Database, park: ParkId): Promise<Snapshot|null> {
  const row=await db.prepare('SELECT snapshot FROM park_snapshots WHERE park=? ORDER BY bucket DESC LIMIT 1').bind(park).first<{snapshot:string}>()
  return row?JSON.parse(row.snapshot):null
}
