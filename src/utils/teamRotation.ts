import { distributeTeams, rating } from './teamBoard.ts'

export const MAX_ROTATION_CANDIDATES = 40
export type RotationMode = 'random' | 'balanced'

export interface TeamRotationResult {
  teams: string[][]
  repeatedPairs: number
  previousPairs: number
  baselineSkillGap: number | null
  balanceLimited: boolean
  candidatesTried: number
}

export function hasMatchingTeamRoster(names: string[], count: number, teams: string[][]): boolean {
  if (!Number.isInteger(count) || count < 2 || count > 8 || names.length < count || names.length > 200 || teams.length !== count) return false
  if (names.some(name => typeof name !== 'string' || !name.trim() || name.length > 80)) return false
  const roster = new Set(names)
  const members = teams.flat()
  return roster.size === names.length && members.length === names.length && new Set(members).size === members.length && members.every(name => roster.has(name))
}

const memberOrigins = (teams: string[][]) => new Map(teams.flatMap((team, index) => team.map(name => [name, index] as const)))

// Count unordered teammate pairs by their previous team, without building O(n²) pair strings.
function repeatsWithOrigins(teams: string[][], origins: Map<string, number>): number {
  return teams.reduce((total, team) => {
    const counts = new Map<number, number>()
    for (const name of team) {
      const origin = origins.get(name)
      if (origin !== undefined) counts.set(origin, (counts.get(origin) ?? 0) + 1)
    }
    return total + [...counts.values()].reduce((sum, count) => sum + count * (count - 1) / 2, 0)
  }, 0)
}

export function countRepeatedTeammatePairs(teams: string[][], previous: string[][]): number {
  return repeatsWithOrigins(teams, memberOrigins(previous))
}

export function countTeammatePairs(teams: string[][]): number {
  return teams.reduce((sum, team) => sum + team.length * (team.length - 1) / 2, 0)
}

export function teamSkillGap(teams: string[][], skills: Record<string, number>): number {
  const scores = teams.map(team => team.reduce((sum, name) => sum + rating(skills, name), 0))
  return scores.length ? Math.max(...scores) - Math.min(...scores) : 0
}

export function teamSizeGap(teams: string[][]): number {
  const sizes = teams.map(team => team.length)
  return sizes.length ? Math.max(...sizes) - Math.min(...sizes) : 0
}

export function createTeamRotation(
  names: string[], count: number, skills: Record<string, number>, mode: RotationMode,
  previous: string[][], locked: string[] = [], random = Math.random,
): TeamRotationResult | null {
  if (!hasMatchingTeamRoster(names, count, previous) || !['random', 'balanced'].includes(mode) || locked.some(name => !names.includes(name))) return null
  const balanced = mode === 'balanced'
  const origins = memberOrigins(previous)
  const baseline = distributeTeams(names, count, skills, balanced, previous, locked, random)
  const baselineSkillGap = balanced ? teamSkillGap(baseline, skills) : null
  let best = baseline
  let bestSizeGap = teamSizeGap(best)
  let bestRepeats = repeatsWithOrigins(best, origins)
  let bestSkillGap = balanced ? teamSkillGap(best, skills) : 0
  for (let candidateIndex = 1; candidateIndex < MAX_ROTATION_CANDIDATES; candidateIndex++) {
    const candidate = distributeTeams(names, count, skills, balanced, previous, locked, random)
    const skillGap = balanced ? teamSkillGap(candidate, skills) : 0
    if (baselineSkillGap !== null && skillGap > baselineSkillGap) continue
    const sizeGap = teamSizeGap(candidate)
    const repeats = repeatsWithOrigins(candidate, origins)
    if (sizeGap < bestSizeGap || (sizeGap === bestSizeGap && (repeats < bestRepeats || (repeats === bestRepeats && skillGap < bestSkillGap)))) {
      best = candidate; bestSizeGap = sizeGap; bestRepeats = repeats; bestSkillGap = skillGap
    }
  }
  return {
    teams: best,
    repeatedPairs: bestRepeats,
    previousPairs: countTeammatePairs(previous),
    baselineSkillGap,
    balanceLimited: bestSizeGap > 1,
    candidatesTried: MAX_ROTATION_CANDIDATES,
  }
}
