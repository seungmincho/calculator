import { normalize, type Snapshot } from '../everland/model.ts'
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
export async function readParkSnapshot(db: Database, park: ParkId): Promise<Snapshot|null> {
  const row=await db.prepare('SELECT snapshot FROM park_snapshots WHERE park=? ORDER BY bucket DESC LIMIT 1').bind(park).first<{snapshot:string}>()
  return row?JSON.parse(row.snapshot):null
}
