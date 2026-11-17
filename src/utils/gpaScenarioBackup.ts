import { GPA_SCENARIO_LIMIT, parseGpaScenarios, type GpaScenario, type GpaScenarioStore } from './gpaScenarios.ts'

export const GPA_BACKUP_FORMAT = 'toolhub-gpa-scenarios'
export const GPA_BACKUP_MAX_BYTES = 16 * 1024 * 1024
export interface GpaScenarioBackup { format: typeof GPA_BACKUP_FORMAT; version: 1; exportedAt: string; scenarios: GpaScenario[] }
export interface GpaBackupItem { scenario: GpaScenario; status: 'new' | 'duplicate' | 'conflict' }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export const gpaBackupByteLength = (raw: string) => new TextEncoder().encode(raw).byteLength

/** Whitelist every level; IDs used by retake rules are preserved verbatim. */
export function projectGpaScenario(item: GpaScenario): GpaScenario {
  return {
    id: item.id, name: item.name, createdAt: new Date(item.createdAt).toISOString(),
    snapshot: {
      scale: item.snapshot.scale, targetGpa: item.snapshot.targetGpa, remainingCredits: item.snapshot.remainingCredits,
      semesters: item.snapshot.semesters.map(semester => ({
        id: semester.id, isExpanded: semester.isExpanded !== false,
        courses: semester.courses.map(course => ({
          id: course.id, name: course.name, credits: course.credits, grade: course.grade,
          major: course.major === true, retake: course.retake === true,
        })),
      })),
    },
  }
}

function validatedScenarios(value: unknown): GpaScenario[] {
  const result = parseGpaScenarios(JSON.stringify({ version: 1, revision: 'backup-validation', scenarios: value }))
  if (!result.ok) throw new Error('invalidFile')
  return result.store.scenarios.map(projectGpaScenario)
}

export function serializeGpaScenarioBackup(store: GpaScenarioStore, now = new Date()): string {
  if (!parseGpaScenarios(JSON.stringify(store)).ok || !Number.isFinite(now.getTime())) throw new Error('invalidFile')
  const backup: GpaScenarioBackup = { format: GPA_BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), scenarios: validatedScenarios(store.scenarios) }
  const raw = JSON.stringify(backup, null, 2)
  if (gpaBackupByteLength(raw) > GPA_BACKUP_MAX_BYTES) throw new Error('fileTooLarge')
  return raw
}

export function parseGpaScenarioBackup(raw: string): GpaScenarioBackup {
  if (gpaBackupByteLength(raw) > GPA_BACKUP_MAX_BYTES) throw new Error('fileTooLarge')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('invalidFile') }
  if (!object(value) || value.format !== GPA_BACKUP_FORMAT) throw new Error('invalidFile')
  if (value.version !== 1) throw new Error('unsupported')
  if (typeof value.exportedAt !== 'string' || value.exportedAt.length > 64 || !/^\d{4}-\d{2}-\d{2}T/.test(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))) throw new Error('invalidFile')
  return { format: GPA_BACKUP_FORMAT, version: 1, exportedAt: new Date(value.exportedAt).toISOString(), scenarios: validatedScenarios(value.scenarios) }
}

function fingerprint(item: GpaScenario): string {
  const projected = projectGpaScenario(item)
  return JSON.stringify({ name: projected.name, createdAt: projected.createdAt, snapshot: projected.snapshot })
}

export function previewGpaScenarioBackup(store: GpaScenarioStore, backup: GpaScenarioBackup): GpaBackupItem[] {
  if (!parseGpaScenarios(JSON.stringify(store)).ok) throw new Error('invalidFile')
  const existing = validatedScenarios(store.scenarios)
  const incoming = validatedScenarios(backup.scenarios)
  const ids = new Set(existing.map(item => item.id))
  const contents = new Set(existing.map(fingerprint))
  return incoming.map(scenario => {
    const content = fingerprint(scenario)
    const status = contents.has(content) ? 'duplicate' : ids.has(scenario.id) ? 'conflict' : 'new'
    contents.add(content)
    return { scenario, status }
  })
}

/** Caller must hold the existing scenario lock and verify the preview's raw storage value. */
export function mergeGpaScenarioBackup(store: GpaScenarioStore, backup: GpaScenarioBackup, selectedIds: readonly string[], newId: () => string): GpaScenarioStore {
  const items = previewGpaScenarioBackup(store, backup)
  if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length) throw new Error('selection')
  const chosen = selectedIds.map(id => items.find(item => item.scenario.id === id))
  if (chosen.some(item => !item || item.status === 'duplicate')) throw new Error('selection')
  if (store.scenarios.length + chosen.length > GPA_SCENARIO_LIMIT) throw new Error('limit')
  const scenarios = validatedScenarios(store.scenarios)
  const ids = new Set(scenarios.map(item => item.id))
  const reservedIds = new Set([...ids, ...items.map(item => item.scenario.id)])
  for (const item of chosen) {
    if (!item) throw new Error('selection')
    const scenario = projectGpaScenario(item.scenario)
    if (ids.has(scenario.id)) {
      let replacement = ''
      for (let attempt = 0; attempt < 20 && (!replacement || reservedIds.has(replacement)); attempt++) replacement = newId()
      if (!replacement || reservedIds.has(replacement)) throw new Error('invalidFile')
      scenario.id = replacement
    }
    ids.add(scenario.id)
    reservedIds.add(scenario.id)
    scenarios.push(scenario)
  }
  const next: GpaScenarioStore = { version: 1, revision: newId(), scenarios }
  if (!parseGpaScenarios(JSON.stringify(next)).ok) throw new Error('invalidFile')
  return next
}
