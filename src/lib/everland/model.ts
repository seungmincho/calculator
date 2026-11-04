export const PARK_ID = 'b4dd937f-a79d-4b82-922f-e8ab0fbf5b5b'
export const API = `https://api.themeparks.wiki/v1/entity/${PARK_ID}`
export type Status = 'OPERATING' | 'CLOSED' | 'DOWN' | 'REFURBISHMENT' | 'UNKNOWN'
export interface Ride {
  id: string; name: string; status: Status; wait: number | null; updatedAt: string | null
  location: { latitude: number; longitude: number } | null
}
export interface Snapshot { fetchedAt: string; rides: Ride[] }
export interface Summary { at: string; median: number | null; reporting: number; operating: number }
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null
export function validLocation(value: unknown): Ride['location'] {
  const v = record(value)
  // Conservative Everland envelope; a valid coordinate is NOT a verified entrance.
  return typeof v.latitude === 'number' && typeof v.longitude === 'number' &&
    v.latitude >= 37.288 && v.latitude <= 37.297 && v.longitude >= 127.197 && v.longitude <= 127.209
    ? { latitude: v.latitude, longitude: v.longitude } : null
}
export function normalize(children: unknown, live: unknown, fetchedAt: string): Snapshot {
  const c = record(children), l = record(live)
  if (c.id !== PARK_ID || l.id !== PARK_ID || !Array.isArray(c.children) || !Array.isArray(l.liveData) || !l.liveData.length || !timestamp(fetchedAt)) throw new Error('Invalid Everland response')
  const metadata = new Map(c.children.map(record).filter(x => x.entityType === 'ATTRACTION' && typeof x.id === 'string').map(x => [x.id, x]))
  const states = new Map(l.liveData.map(record).filter(x => x.entityType === 'ATTRACTION' && typeof x.id === 'string').map(x => [x.id, x]))
  if (!states.size) throw new Error('No attraction states in Everland response')
  const ids = [...new Set([...metadata.keys(), ...states.keys()])]
  const rides = ids.flatMap(id => {
    const m = metadata.get(id), s = states.get(id)
    const name = m?.name ?? s?.name
    if (typeof id !== 'string' || typeof name !== 'string' || !name) return []
    const status: Status = ['OPERATING', 'CLOSED', 'DOWN', 'REFURBISHMENT'].includes(String(s?.status)) ? s!.status as Status : 'UNKNOWN'
    const wait = record(record(s?.queue).STANDBY).waitTime
    return [{ id, name, status, wait: status === 'OPERATING' && typeof wait === 'number' && Number.isFinite(wait) && wait >= 0 ? wait : null,
      updatedAt: timestamp(s?.lastUpdated), location: validLocation(m?.location) }]
  })
  if (!rides.length) throw new Error('Empty Everland response')
  return { fetchedAt: new Date(fetchedAt).toISOString(), rides }
}
export function summarize(snapshot: Snapshot): Summary {
  const operating = snapshot.rides.filter(r => r.status === 'OPERATING')
  const values = operating.flatMap(r => r.wait === null ? [] : [r.wait]).sort((a,b) => a-b)
  const mid = Math.floor(values.length / 2)
  return { at: snapshot.fetchedAt, operating: operating.length, reporting: values.length,
    median: values.length ? (values[mid] + values[Math.floor((values.length - 1) / 2)]) / 2 : null }
}
export function seoulDay(time: string | number): string {
  return new Date(new Date(time).getTime() + 9 * 3600000).toISOString().slice(0,10)
}
export function stale(snapshot: Snapshot, now = Date.now()) { return now - Date.parse(snapshot.fetchedAt) > 20 * 60000 }
