// 팀 밸런스 배분 검사: node scripts/check-team-balance.ts
import { balanceTeams, type Player } from '../src/utils/teamBalance.ts'

let fail = 0
const check = (label: string, ok: boolean) => { if (!ok) { fail++; console.error('FAIL', label) } }

// 시드 고정 난수(mulberry32)
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// 딱 나뉘는 경우: 5,5,4,4,3,3,2,2,1,1 → 2팀 15:15
const ten: Player[] = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1].map((skill, i) => ({ name: `p${i}`, skill }))
const skillOf = new Map(ten.map((p) => [p.name, p.skill]))
const sums = balanceTeams(ten, 2, rng(1)).map((t) => t.reduce((s, n) => s + skillOf.get(n)!, 0))
check(`10명 2팀 15:15 (got ${sums})`, sums[0] === 15 && sums[1] === 15)

// 무작위 2,000건: 전원 한 번씩, 인원 차 ≤ 1, 실력 합 차 ≤ 4(최고 5 − 최저 1)
const r = rng(42)
for (let k = 0; k < 2000; k++) {
  const n = 2 + Math.floor(r() * 30)
  const count = 2 + Math.floor(r() * Math.min(7, n - 1))
  const players: Player[] = Array.from({ length: n }, (_, i) => ({ name: `p${i}`, skill: 1 + Math.floor(r() * 5) }))
  const by = new Map(players.map((p) => [p.name, p.skill]))
  const teams = balanceTeams(players, count, r)
  const all = teams.flat()
  const sizes = teams.map((t) => t.length)
  const tsum = teams.map((t) => t.reduce((s, x) => s + by.get(x)!, 0))
  const label = `n=${n} teams=${count} sizes=${sizes} sums=${tsum}`
  check(`팀 수 ${label}`, teams.length === count)
  check(`전원 배정 ${label}`, all.length === n && new Set(all).size === n)
  check(`인원 차 ${label}`, Math.max(...sizes) - Math.min(...sizes) <= 1)
  check(`실력 합 차 ${label}`, Math.max(...tsum) - Math.min(...tsum) <= 4)
  if (fail > 5) break
}

console.log(fail ? `${fail} failed` : 'team balance: all passed')
process.exit(fail ? 1 : 0)
