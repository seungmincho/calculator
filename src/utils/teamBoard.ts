export type BoardMode = 'random' | 'balanced' | 'captain'
export interface TeamBoardSnapshot { teams: string[][]; skills: Record<string, number>; mode: BoardMode }
export const rating = (skills: Record<string, number>, name: string) => Object.hasOwn(skills, name) && Number.isInteger(skills[name]) && skills[name] >= 1 && skills[name] <= 5 ? skills[name] : 3

export function distributeTeams(names: string[], count: number, skills: Record<string, number>, balanced: boolean, previous: string[][] = [], locked: string[] = [], random = Math.random): string[][] {
  if (count < 2 || count > 8 || names.length < count || names.length > 200 || new Set(names).size !== names.length) return []
  const teams = Array.from({ length: count }, (_, i) => (previous[i] ?? []).filter(name => names.includes(name) && locked.includes(name)))
  const fixed = new Set(teams.flat())
  const pool = names.filter(name => !fixed.has(name))
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  if (balanced) pool.sort((a, b) => rating(skills, b) - rating(skills, a))
  for (const name of pool) {
    const min = Math.min(...teams.map(team => team.length))
    let candidates = teams.map((team, i) => ({ i, size: team.length, sum: team.reduce((sum, n) => sum + rating(skills, n), 0) })).filter(team => team.size === min)
    if (balanced) { const lowest = Math.min(...candidates.map(team => team.sum)); candidates = candidates.filter(team => team.sum === lowest) }
    teams[candidates[Math.floor(random() * candidates.length)].i].push(name)
  }
  return teams
}

export function moveTeamMember(teams: string[][], name: string, target: number, locked: string[]): string[][] | null {
  const source = teams.findIndex(team => team.includes(name))
  if (locked.includes(name) || source < 0 || !Number.isInteger(target) || target < 0 || target >= teams.length || source === target) return null
  return teams.map((team, i) => i === source ? team.filter(n => n !== name) : i === target ? [...team, name] : [...team])
}

export function swapTeamMembers(teams: string[][], first: string, second: string, locked: string[]): string[][] | null {
  const a = teams.findIndex(team => team.includes(first)), b = teams.findIndex(team => team.includes(second))
  if (a < 0 || b < 0 || a === b || locked.includes(first) || locked.includes(second)) return null
  return teams.map(team => team.map(name => name === first ? second : name === second ? first : name))
}

export function parseTeamBoard(raw: string): TeamBoardSnapshot | null {
  try {
    if (raw.length > 24000) return null
    const value = JSON.parse(decodeURIComponent(raw)) as TeamBoardSnapshot
    if (!value || !['random', 'balanced', 'captain'].includes(value.mode) || !Array.isArray(value.teams) || value.teams.length < 2 || value.teams.length > 8) return null
    if (!value.teams.every(team => Array.isArray(team) && team.every(name => typeof name === 'string' && name.trim() && name.length <= 80))) return null
    const names = value.teams.flat()
    if (names.length < value.teams.length || names.length > 200 || new Set(names).size !== names.length || !value.skills || typeof value.skills !== 'object') return null
    return { teams: value.teams, skills: Object.fromEntries(names.map(name => [name, rating(value.skills, name)])), mode: value.mode }
  } catch { return null }
}

export function encodeTeamBoard(board: TeamBoardSnapshot): string | null {
  const encoded = encodeURIComponent(JSON.stringify(board))
  return encoded.length <= 24000 && parseTeamBoard(encoded) ? encoded : null
}
