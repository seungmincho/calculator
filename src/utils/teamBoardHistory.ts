import type { BoardMode } from './teamBoard.ts'

export const TEAM_HISTORY_LIMIT = 20

export interface TeamRotationComparison {
  readonly previous: readonly (readonly string[])[]
  readonly baselineSkillGap: number | null
  readonly skills: Readonly<Record<string, number>>
  readonly balanceLimited: boolean
  readonly edited: boolean
}
export interface TeamEditSnapshot {
  readonly teams: readonly (readonly string[])[]
  readonly locked: readonly string[]
  readonly mode: BoardMode
  readonly comparison: TeamRotationComparison | null
}
export interface TeamBoardHistory {
  readonly past: readonly TeamEditSnapshot[]
  readonly present: TeamEditSnapshot | null
  readonly future: readonly TeamEditSnapshot[]
}

const cloneTeams = (teams: readonly (readonly string[])[]) => Object.freeze(teams.map(team => Object.freeze([...team])))

/** Capture board-only state. Current input skills and the next distribution mode stay outside history. */
export function cloneTeamSnapshot(snapshot: TeamEditSnapshot): TeamEditSnapshot {
  return Object.freeze({
    teams: cloneTeams(snapshot.teams), locked: Object.freeze([...new Set(snapshot.locked)]), mode: snapshot.mode,
    comparison: snapshot.comparison ? Object.freeze({
      previous: cloneTeams(snapshot.comparison.previous), baselineSkillGap: snapshot.comparison.baselineSkillGap,
      skills: Object.freeze(Object.fromEntries(Object.entries(snapshot.comparison.skills))),
      balanceLimited: snapshot.comparison.balanceLimited, edited: snapshot.comparison.edited,
    }) : null,
  })
}

const sameTeams = (a: readonly (readonly string[])[], b: readonly (readonly string[])[]) => a.length === b.length && a.every((team, index) => team.length === b[index].length && team.every((name, position) => name === b[index][position]))
const sameSkills = (a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(name => Object.hasOwn(b, name) && Object.is(a[name], b[name]))

export function sameTeamSnapshot(a: TeamEditSnapshot, b: TeamEditSnapshot): boolean {
  if (a.mode !== b.mode || !sameTeams(a.teams, b.teams)) return false
  const lockedA = new Set(a.locked), lockedB = new Set(b.locked)
  if (lockedA.size !== lockedB.size || [...lockedA].some(name => !lockedB.has(name))) return false
  if (!a.comparison || !b.comparison) return a.comparison === b.comparison
  const first = a.comparison, second = b.comparison
  return first.baselineSkillGap === second.baselineSkillGap && first.balanceLimited === second.balanceLimited && first.edited === second.edited && sameTeams(first.previous, second.previous) && sameSkills(first.skills, second.skills)
}

const history = (past: readonly TeamEditSnapshot[], present: TeamEditSnapshot | null, future: readonly TeamEditSnapshot[]): TeamBoardHistory => Object.freeze({ past: Object.freeze([...past]), present, future: Object.freeze([...future]) })

/** Initial completed division, shared restoration, and completed captain drafts seed a new history. */
export function createTeamHistory(snapshot: TeamEditSnapshot | null = null): TeamBoardHistory {
  return history([], snapshot ? cloneTeamSnapshot(snapshot) : null, [])
}

export function commitTeamHistory(current: TeamBoardHistory, next: TeamEditSnapshot): TeamBoardHistory {
  if (!current.present) return createTeamHistory(next)
  if (sameTeamSnapshot(current.present, next)) return current
  return history([...current.past.slice(-(TEAM_HISTORY_LIMIT - 1)), cloneTeamSnapshot(current.present)], cloneTeamSnapshot(next), [])
}

export function undoTeamHistory(current: TeamBoardHistory): TeamBoardHistory {
  const previous = current.past.at(-1)
  if (!current.present || !previous) return current
  return history(current.past.slice(0, -1), cloneTeamSnapshot(previous), [cloneTeamSnapshot(current.present), ...current.future])
}

export function redoTeamHistory(current: TeamBoardHistory): TeamBoardHistory {
  const next = current.future[0]
  if (!current.present || !next) return current
  return history([...current.past, cloneTeamSnapshot(current.present)], cloneTeamSnapshot(next), current.future.slice(1))
}

/** A queued old reveal callback must never clear or finish a newer interval. Native timers stay caller-owned. */
export function createTeamRevealGuard<Timer>() {
  let generation = 0, timer: Timer | null = null
  return {
    start(): { generation: number; previousTimer: Timer | null } {
      const previousTimer = timer
      timer = null; generation++
      return { generation, previousTimer }
    },
    attach(expected: number, next: Timer): boolean {
      if (expected !== generation || timer !== null) return false
      timer = next; return true
    },
    owns(expected: number, expectedTimer: Timer): boolean { return expected === generation && timer !== null && timer === expectedTimer },
    finish(expected: number, expectedTimer: Timer): Timer | null {
      if (expected !== generation || timer === null || timer !== expectedTimer) return null
      const previous = timer
      timer = null; generation++
      return previous
    },
    invalidate(): Timer | null {
      const previous = timer
      timer = null; generation++
      return previous
    },
  }
}
