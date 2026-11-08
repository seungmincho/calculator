// 팀 나누기 '밸런스' 모드: 실력 높은 사람부터, 인원이 가장 적은 팀들 중 실력 합이 가장 낮은 팀에 넣는다.
// → 팀 인원 차 ≤ 1, 실력 합 차는 대개 (최고 − 최저 실력) 이내. 검사: node scripts/check-team-balance.ts
// ponytail: 그리디(최적 분할 아님) — 참가자 수십 명 규모에선 충분, 정확한 최소 차가 필요하면 완전 탐색

export interface Player { name: string; skill: number }

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function balanceTeams(players: Player[], count: number, rand: () => number = Math.random): string[][] {
  // 같은 실력끼리는 무작위 순서(sort 는 안정 정렬)
  const sorted = shuffle(players, rand).sort((a, b) => b.skill - a.skill)
  const teams = Array.from({ length: count }, () => ({ members: [] as string[], sum: 0 }))
  for (const p of sorted) {
    const minSize = Math.min(...teams.map((t) => t.members.length))
    const target = teams.filter((t) => t.members.length === minSize).reduce((a, b) => (b.sum < a.sum ? b : a))
    target.members.push(p.name)
    target.sum += p.skill
  }
  // 1팀이 늘 최고 실력자를 받지 않게 팀 순서도 섞는다
  return shuffle(teams, rand).map((t) => t.members)
}
