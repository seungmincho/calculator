import { MAX_TEAM_ROSTERS, parseTeamRosters, projectTeamRoster, type TeamRoster } from './teamRosters.ts'

export const TEAM_ROSTER_BACKUP_FORMAT = 'toolhub-team-rosters'
export const TEAM_ROSTER_BACKUP_MAX_BYTES = 2 * 1024 * 1024
export type TeamRosterBackupError = 'tooLarge' | 'wrongFormat' | 'unsupported' | 'corrupt' | 'limit' | 'emptySelection' | 'invalid'
export interface TeamRosterBackup { format: typeof TEAM_ROSTER_BACKUP_FORMAT; version: 1; exportedAt: string; rosters: TeamRoster[] }
export interface TeamRosterImportRow { sourceId: string; sourceTitle: string; roster: TeamRoster; status: 'new' | 'duplicate' | 'conflict' }
const isoDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

export function exportTeamRosterBackup(rosters: TeamRoster[], exportedAt: string): string {
  if (!isoDate(exportedAt)) throw new Error('invalid')
  const projected = parseTeamRosters(JSON.stringify(rosters))
  const raw = JSON.stringify({ format: TEAM_ROSTER_BACKUP_FORMAT, version: 1, exportedAt, rosters: projected })
  if (new TextEncoder().encode(raw).length > TEAM_ROSTER_BACKUP_MAX_BYTES) throw new Error('tooLarge')
  return raw
}

export function parseTeamRosterBackup(raw: string): TeamRosterBackup {
  if (raw.length > TEAM_ROSTER_BACKUP_MAX_BYTES || new TextEncoder().encode(raw).length > TEAM_ROSTER_BACKUP_MAX_BYTES) throw new Error('tooLarge')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('corrupt') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('corrupt')
  const record = value as Record<string, unknown>
  if (record.format !== TEAM_ROSTER_BACKUP_FORMAT) throw new Error('wrongFormat')
  if (record.version !== 1) throw new Error('unsupported')
  if (!isoDate(record.exportedAt)) throw new Error('corrupt')
  let rosters: TeamRoster[]
  try { rosters = parseTeamRosters(JSON.stringify(record.rosters)) } catch { throw new Error('corrupt') }
  return { format: TEAM_ROSTER_BACKUP_FORMAT, version: 1, exportedAt: record.exportedAt, rosters }
}

// Names remain ordered because the captain mode uses that order. Skill object property order is irrelevant.
function teamRosterBodyKey(roster: TeamRoster): string {
  return JSON.stringify([roster.names.map(name => [name, roster.skills[name]]), roster.teamCount, roster.mode])
}

export function teamRosterContentKey(roster: TeamRoster): string {
  return JSON.stringify([roster.title, teamRosterBodyKey(roster)])
}

function sameImportedOrigin(existing: TeamRoster, incoming: TeamRoster): boolean {
  if (!existing.importOrigin && !incoming.importOrigin) return false
  if (existing.importOrigin && existing.title !== (existing.importOrigin.copyTitle ?? existing.importOrigin.title)) return false
  if (incoming.importOrigin && incoming.title !== (incoming.importOrigin.copyTitle ?? incoming.importOrigin.title)) return false
  const original = existing.importOrigin ?? { id: existing.id, title: existing.title }
  const source = incoming.importOrigin ?? { id: incoming.id, title: incoming.title }
  return original.id === source.id && original.title === source.title && teamRosterBodyKey(existing) === teamRosterBodyKey(incoming)
}

export function previewTeamRosterImport(existing: TeamRoster[], incoming: TeamRoster[], copySuffix: (number: number) => string, makeId: () => string): TeamRosterImportRow[] {
  parseTeamRosters(JSON.stringify(existing)); parseTeamRosters(JSON.stringify(incoming))
  const considered = existing.map(projectTeamRoster)
  const existingIds = new Set(existing.map(roster => roster.id))
  const reservedIds = new Set([...existing, ...incoming].map(roster => roster.id))
  const titles = new Set(existing.map(roster => roster.title.toLocaleLowerCase()))
  return incoming.map(source => {
    const roster = projectTeamRoster(source)
    if (considered.some(item => teamRosterContentKey(item) === teamRosterContentKey(roster) || sameImportedOrigin(item, roster))) return { sourceId: source.id, sourceTitle: source.title, roster, status: 'duplicate' }
    const idConflict = existingIds.has(roster.id)
    const titleConflict = titles.has(roster.title.toLocaleLowerCase())
    if (idConflict || titleConflict) {
      let id = ''
      for (let attempt = 0; attempt < 20; attempt++) { const candidate = makeId(); if (candidate && !reservedIds.has(candidate)) { id = candidate; break } }
      if (!id) throw new Error('invalid')
      roster.id = id; reservedIds.add(id)
      roster.importOrigin = source.importOrigin && source.title === (source.importOrigin.copyTitle ?? source.importOrigin.title) ? { id: source.importOrigin.id, title: source.importOrigin.title } : { id: source.id, title: source.title }
    }
    if (titleConflict) {
      let title = ''
      for (let number = 1; number <= MAX_TEAM_ROSTERS * 3; number++) {
        const suffix = copySuffix(number)
        if (suffix.length >= 40) throw new Error('invalid')
        const candidate = `${source.title.slice(0, 40 - suffix.length)}${suffix}`
        if (!titles.has(candidate.toLocaleLowerCase())) { title = candidate; break }
      }
      if (!title) throw new Error('invalid')
      roster.title = title
    }
    if (idConflict || titleConflict) roster.importOrigin = { ...roster.importOrigin!, copyTitle: roster.title }
    titles.add(roster.title.toLocaleLowerCase())
    considered.push(roster)
    return { sourceId: source.id, sourceTitle: source.title, roster, status: idConflict || titleConflict ? 'conflict' : 'new' }
  })
}

export function appendSelectedTeamRosters(existing: TeamRoster[], rows: TeamRosterImportRow[], selected: string[]): TeamRoster[] {
  if (selected.length === 0) throw new Error('emptySelection')
  if (new Set(selected).size !== selected.length || selected.some(id => !rows.some(row => row.sourceId === id && row.status !== 'duplicate'))) throw new Error('invalid')
  const additions = rows.filter(row => selected.includes(row.sourceId)).map(row => projectTeamRoster(row.roster))
  if (existing.length + additions.length > MAX_TEAM_ROSTERS) throw new Error('limit')
  const merged = [...existing.map(projectTeamRoster), ...additions]
  try { return parseTeamRosters(JSON.stringify(merged)) } catch { throw new Error('invalid') }
}
