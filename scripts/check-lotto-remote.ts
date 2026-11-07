// node scripts/check-lotto-remote.ts [--live] (Node 24) — 동행복권 응답 파서·캐시 시간·/api/lotto-latest 회귀 체크
// --live: 실제 동행복권에 요청해 Function 을 끝까지 돌려 본다(1245회 뒤 3회 이상이 와야 함).
import assert from 'node:assert/strict'
import { cacheSeconds, parseDhList } from '../src/utils/lottoRemote.ts'

const item = (n: number, nums = [1, 2, 3, 4, 5, 6], bonus = 7) => ({
  ltEpsd: n, ltRflYmd: '20261031', tm1WnNo: nums[0], tm2WnNo: nums[1], tm3WnNo: nums[2], tm4WnNo: nums[3], tm5WnNo: nums[4], tm6WnNo: nums[5], bnsWnNo: bonus,
})
const wrap = (...xs: unknown[]) => ({ data: { list: xs } })

// 최신순으로 와도 오름차순, after 이하 제외, 형식 변환
const ok = parseDhList(wrap(item(1250), item(1249), item(1248)), 1248)
assert.deepEqual(ok.map((d) => d.drwNo), [1249, 1250])
assert.deepEqual(ok[0], { drwNo: 1249, drwNoDate: '2026-10-31', drwtNo1: 1, drwtNo2: 2, drwtNo3: 3, drwtNo4: 4, drwtNo5: 5, drwtNo6: 6, bnusNo: 7 })
// 끊기면 그 앞까지
assert.deepEqual(parseDhList(wrap(item(1249), item(1251)), 1248).map((d) => d.drwNo), [1249])
assert.deepEqual(parseDhList(wrap(item(1250)), 1248), [])
// 번호가 이상하면 그 회차부터 버림
assert.deepEqual(parseDhList(wrap(item(1249), item(1250, [1, 1, 3, 4, 5, 6])), 1248).map((d) => d.drwNo), [1249])
assert.deepEqual(parseDhList(wrap(item(1249, [1, 2, 3, 4, 5, 46])), 1248), [])
assert.deepEqual(parseDhList(wrap(item(1249, [1, 2, 3, 4, 5, 6], 6)), 1248), []) // 보너스가 본번호와 같음
assert.deepEqual(parseDhList(wrap({ ...item(1249), ltRflYmd: '2026-10-31' }), 1248), [])
// 이상한 응답
assert.deepEqual(parseDhList(null, 1), [])
assert.deepEqual(parseDhList({ data: {} }, 1), [])
assert.deepEqual(parseDhList('<html>', 1), [])

// 캐시: 토 20시~일 6시(KST) 10분, 그 밖 1시간
const kst = (iso: string) => Date.parse(`${iso}+09:00`)
assert.equal(cacheSeconds(kst('2026-11-07T19:59:00')), 3600)
assert.equal(cacheSeconds(kst('2026-11-07T20:00:00')), 600)
assert.equal(cacheSeconds(kst('2026-11-08T05:59:00')), 600)
assert.equal(cacheSeconds(kst('2026-11-08T06:00:00')), 3600)
assert.equal(cacheSeconds(kst('2026-11-11T21:00:00')), 3600)

if (process.argv.includes('--live')) {
  const store = new Map<string, Response>()
  ;(globalThis as unknown as { caches: unknown }).caches = {
    default: { match: async (r: Request) => store.get(r.url)?.clone(), put: async (r: Request, res: Response) => void store.set(r.url, res) },
  }
  const { onRequestGet } = await import('../functions/api/lotto-latest.ts')
  const bad = await onRequestGet({ request: new Request('https://x/api/lotto-latest?after=abc') })
  assert.equal(bad.status, 400)
  const res = await onRequestGet({ request: new Request('https://x/api/lotto-latest?after=1245') })
  assert.equal(res.status, 200)
  const { draws } = (await res.json()) as { draws: { drwNo: number; drwNoDate: string }[] }
  assert.ok(draws.length >= 3, `1245회 뒤 회차가 ${draws.length}개`)
  assert.deepEqual(draws.slice(0, 3).map((d) => d.drwNo), [1246, 1247, 1248])
  assert.match(res.headers.get('cache-control') ?? '', /max-age=(600|3600)/)
  const again = await onRequestGet({ request: new Request('https://x/api/lotto-latest?after=1245') })
  assert.equal((await again.json() as { draws: unknown[] }).draws.length, draws.length) // 캐시 적중
  console.log(`live: 1245회 뒤 ${draws.length}개 (마지막 ${draws.at(-1)!.drwNo}회 ${draws.at(-1)!.drwNoDate})`)
}

console.log('check-lotto-remote: all passed')
