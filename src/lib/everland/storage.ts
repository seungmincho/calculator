import { API, normalize, seoulDay, summarize, type Snapshot, type Summary } from './model.ts'
export interface Statement {
  bind(...values: (string | number)[]): Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> }
export interface Env { EVERLAND_DB?: Database }
export async function collect(db: Database, request: typeof fetch = fetch, now?: number) {
  const get = async (path: string) => {
    const res = await request(`${API}/${path}`, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ToolHub/1.0 (+https://toolhub.ai.kr/everland-wait-times/)' } })
    // Do not immediately retry a 429; the next scheduled attempt is 10 minutes later.
    if (!res.ok) throw new Error(`Everland upstream HTTP ${res.status}`)
    return res.json()
  }
  const [children, live] = await Promise.all([get('children'), get('live')])
  const collectedAt = now ?? Date.now()
  const snapshot = normalize(children, live, new Date(collectedAt).toISOString())
  const summary = summarize(snapshot)
  const bucket = Math.floor(collectedAt / 600000) * 600000
  // Atomic upsert and retention. Retry of a cron bucket cannot duplicate a point.
  await db.batch([
    db.prepare('INSERT INTO everland_snapshots (bucket, day, fetched_at, snapshot, summary) VALUES (?, ?, ?, ?, ?) ON CONFLICT(bucket) DO UPDATE SET day=excluded.day, fetched_at=excluded.fetched_at, snapshot=excluded.snapshot, summary=excluded.summary')
      .bind(bucket, seoulDay(collectedAt), snapshot.fetchedAt, JSON.stringify(snapshot), JSON.stringify(summary)),
    db.prepare('DELETE FROM everland_snapshots WHERE bucket < ?').bind(bucket - 7 * 86400000),
  ])
  return snapshot
}
export async function readDashboard(db: Database, now = Date.now()): Promise<{ snapshot: Snapshot | null; history: Summary[] }> {
  const [latest, points] = await Promise.all([
    db.prepare('SELECT snapshot FROM everland_snapshots ORDER BY bucket DESC LIMIT 1').first<{ snapshot: string }>(),
    db.prepare('SELECT summary FROM everland_snapshots WHERE day = ? ORDER BY bucket LIMIT 144').bind(seoulDay(now)).all<{ summary: string }>(),
  ])
  return { snapshot: latest ? JSON.parse(latest.snapshot) : null, history: points.results.map(p => JSON.parse(p.summary)) }
}
