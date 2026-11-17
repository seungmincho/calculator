export interface TeamRoster {
  id: string
  title: string
  names: string[]
  skills: Record<string, number>
  teamCount: number
  mode: 'random' | 'balanced' | 'captain'
  updatedAt: number
  importOrigin?: { id: string; title: string; copyTitle?: string }
}

export const TEAM_ROSTERS_KEY = 'toolhub-team-rosters-v1'
export const MAX_TEAM_ROSTERS = 10
export type TeamRosterStorageError = 'corrupt' | 'unavailable' | 'quota' | 'conflict' | 'invalid'
export type TeamRosterRead = { ok: true; raw: string | null; rosters: TeamRoster[] } | { ok: false; error: TeamRosterStorageError }

export function isTeamRoster(value: unknown): value is TeamRoster {
  if (!value || typeof value !== 'object') return false
  const r = value as TeamRoster
  return typeof r.id === 'string' && !!r.id && typeof r.title === 'string' && !!r.title.trim() && r.title.length <= 40 &&
    Array.isArray(r.names) && r.names.length >= 2 && r.names.length <= 200 && r.names.every(n => typeof n === 'string' && !!n.trim() && n.length <= 80) &&
    new Set(r.names).size === r.names.length && Number.isInteger(r.teamCount) && r.teamCount >= 2 && r.teamCount <= 8 && r.teamCount <= r.names.length &&
    ['random', 'balanced', 'captain'].includes(r.mode) && Number.isFinite(r.updatedAt) && r.updatedAt > 0 &&
    !!r.skills && typeof r.skills === 'object' && !Array.isArray(r.skills) &&
    r.names.every(name => Object.hasOwn(r.skills, name) && Number.isInteger(r.skills[name]) && r.skills[name] >= 1 && r.skills[name] <= 5) &&
    (r.importOrigin === undefined || (!!r.importOrigin && typeof r.importOrigin === 'object' && !Array.isArray(r.importOrigin) && typeof r.importOrigin.id === 'string' && !!r.importOrigin.id && typeof r.importOrigin.title === 'string' && !!r.importOrigin.title.trim() && r.importOrigin.title.length <= 40 && (r.importOrigin.copyTitle === undefined || (typeof r.importOrigin.copyTitle === 'string' && !!r.importOrigin.copyTitle.trim() && r.importOrigin.copyTitle.length <= 40))))
}

export function parseTeamRosters(raw: string | null): TeamRoster[] {
  if (raw === null) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.length > MAX_TEAM_ROSTERS || !parsed.every(isTeamRoster) || new Set(parsed.map(r => r.id)).size !== parsed.length) throw new Error('invalidRosters')
  return parsed.map(projectTeamRoster)
}

export function projectTeamRoster(roster: TeamRoster): TeamRoster {
  return { id: roster.id, title: roster.title, names: [...roster.names], skills: Object.fromEntries(roster.names.map(name => [name, roster.skills[name]])), teamCount: roster.teamCount, mode: roster.mode, updatedAt: roster.updatedAt, ...(roster.importOrigin ? { importOrigin: { id: roster.importOrigin.id, title: roster.importOrigin.title, ...(roster.importOrigin.copyTitle !== undefined ? { copyTitle: roster.importOrigin.copyTitle } : {}) } } : {}) }
}

export const teamRosterStorageError = (error: unknown): TeamRosterStorageError => error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable'

export function readTeamRosters(storage: Pick<Storage, 'getItem'>): TeamRosterRead {
  let raw: string | null
  try { raw = storage.getItem(TEAM_ROSTERS_KEY) }
  catch (error) { return { ok: false, error: teamRosterStorageError(error) } }
  try { return { ok: true, raw, rosters: parseTeamRosters(raw) } }
  catch { return { ok: false, error: 'corrupt' } }
}

export function writeTeamRosters(rosters: TeamRoster[], expectedRaw: string | null, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): { ok: true; raw: string; rosters: TeamRoster[] } | { ok: false; error: TeamRosterStorageError } {
  try { parseTeamRosters(expectedRaw) } catch { return { ok: false, error: 'corrupt' } }
  let next: TeamRoster[]
  try { next = parseTeamRosters(JSON.stringify(rosters)) } catch { return { ok: false, error: 'invalid' } }
  const raw = JSON.stringify(next)
  try {
    if (storage.getItem(TEAM_ROSTERS_KEY) !== expectedRaw) return { ok: false, error: 'conflict' }
    storage.setItem(TEAM_ROSTERS_KEY, raw)
    if (storage.getItem(TEAM_ROSTERS_KEY) !== raw) return { ok: false, error: 'conflict' }
    return { ok: true, raw, rosters: next }
  } catch (error) { return { ok: false, error: teamRosterStorageError(error) } }
}

/** The fallback checks raw bytes/readback; only Web Locks serializes cooperating tabs. */
export async function withTeamRosterLock<T>(action: () => T): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return action()
  return navigator.locks.request(TEAM_ROSTERS_KEY, { mode: 'exclusive' }, action)
}
