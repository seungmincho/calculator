export type TaskStatus = 'pending' | 'in-progress' | 'done'

export interface MeetingTask {
  id: string
  task: string
  assignee: string
  dueDate: string
  status: TaskStatus
}

export interface MeetingKanbanHandoff {
  id: string
  source: 'meeting-minutes'
  meetingId: string
  meetingTitle: string
  createdAt: number
  items: MeetingTask[]
}

export const MEETING_KANBAN_KEY = 'toolhub-meeting-kanban-v1'
export const KANBAN_STORAGE_KEY = 'kanban-board-state'

const HANDOFF_TTL = 10 * 60 * 1000
const STATUSES: TaskStatus[] = ['pending', 'in-progress', 'done']
const PRIORITIES = ['high', 'medium', 'low']
const COLORS = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'gray']

export type Priority = 'high' | 'medium' | 'low'
export type ColorLabel = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'orange' | 'gray'

export interface KanbanCard {
  id: string
  title: string
  description: string
  priority: Priority
  color: ColorLabel
  dueDate: string
  createdAt: number
  assignee?: string
  meetingSource?: { meetingId: string; actionId: string; meetingTitle: string }
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

export interface KanbanState {
  version: 1
  columns: KanbanColumn[]
}

export type MeetingImportTarget =
  | { kind: 'new-columns'; titles: Record<TaskStatus, string> }
  | { kind: 'existing'; columnIds: Record<TaskStatus, string> }

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sourceId(value: unknown): value is string {
  return nonempty(value) && value.length <= 80
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Date-only validation without timezone conversion or Date's rollover of invalid days. */
function validDate(value: unknown): value is string {
  if (value === '') return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= days[month - 1]
}

function validSelection(meetingId: unknown, title: unknown, items: unknown): items is MeetingTask[] {
  if (!sourceId(meetingId) || !nonempty(title) || title.length > 120 || !Array.isArray(items) || items.length < 1 || items.length > 50) return false
  let total = 0
  const ids = new Set<string>()
  for (const item of items) {
    if (!record(item) || !sourceId(item.id) || ids.has(item.id) || !nonempty(item.task) || item.task.length > 6000 || typeof item.assignee !== 'string' || item.assignee.length > 120 || !validDate(item.dueDate) || !STATUSES.includes(item.status as TaskStatus)) return false
    ids.add(item.id)
    total += item.task.length
  }
  return total <= 30000
}

function validHandoff(value: unknown, now: number, enforceAge = true): value is MeetingKanbanHandoff {
  return record(value) && value.source === 'meeting-minutes' && sourceId(value.id) &&
    timestamp(now) && timestamp(value.createdAt) && (!enforceAge || (value.createdAt <= now && now - value.createdAt <= HANDOFF_TTL)) &&
    validSelection(value.meetingId, value.meetingTitle, value.items)
}

export function createMeetingKanbanHandoff(meetingId: string, title: string, items: MeetingTask[], now = Date.now()): MeetingKanbanHandoff {
  if (!timestamp(now) || !validSelection(meetingId, title, items)) throw new Error('invalidSelection')
  return {
    id: crypto.randomUUID(), source: 'meeting-minutes', meetingId, meetingTitle: title, createdAt: now,
    items: items.map(item => ({ id: item.id, task: item.task, assignee: item.assignee, dueDate: item.dueDate, status: item.status })),
  }
}

export function parseMeetingKanbanHandoff(raw: string | null, now = Date.now()): MeetingKanbanHandoff | null {
  // JSON escaping may expand a valid 30,000-character body to six times its length.
  if (!raw || raw.length > 500000) return null
  try {
    const payload: unknown = JSON.parse(raw)
    return validHandoff(payload, now) ? payload : null
  } catch { return null }
}

/** Call synchronously from the click handler so popup blocking can be reported to the user. */
export function openMeetingKanbanHandoff(payload: MeetingKanbanHandoff): void {
  if (!validHandoff(payload, Date.now())) throw new Error('invalidPayload')
  const raw = JSON.stringify(payload)
  let target: Window | null
  try { target = window.open('about:blank', '_blank') } catch { throw new Error('popupBlocked') }
  if (!target) throw new Error('popupBlocked')
  try {
    target.opener = null
    target.sessionStorage.setItem(MEETING_KANBAN_KEY, raw)
    if (target.sessionStorage.getItem(MEETING_KANBAN_KEY) !== raw) throw new Error('handoffFailed')
    target.location.replace('/kanban-board/?from=meeting')
  } catch {
    try { target.close() } catch { /* Report the transfer failure even if closing the popup fails. */ }
    throw new Error('handoffFailed')
  }
}

function validBoard(value: unknown): value is KanbanState {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.columns)) return false
  const columnIds = new Set<string>()
  const cardIds = new Set<string>()
  for (const column of value.columns) {
    if (!record(column) || !nonempty(column.id) || columnIds.has(column.id) || typeof column.title !== 'string' || !Array.isArray(column.cards)) return false
    columnIds.add(column.id)
    for (const card of column.cards) {
      if (!record(card) || !nonempty(card.id) || cardIds.has(card.id) || typeof card.title !== 'string' || typeof card.description !== 'string' || !PRIORITIES.includes(card.priority as string) || !COLORS.includes(card.color as string) || !validDate(card.dueDate) || !timestamp(card.createdAt) || (card.assignee !== undefined && typeof card.assignee !== 'string')) return false
      if (card.meetingSource !== undefined) {
        const source = card.meetingSource
        if (!record(source) || !sourceId(source.meetingId) || !sourceId(source.actionId) || !nonempty(source.meetingTitle) || source.meetingTitle.length > 120) return false
      }
      cardIds.add(card.id)
    }
  }
  return true
}

export function parseKanbanState(raw: string | null): KanbanState | null {
  if (!raw || raw.length > 10000000) return null
  try {
    const state: unknown = JSON.parse(raw)
    return validBoard(state) ? state : null
  } catch { return null }
}

function taskTitle(task: string): string {
  const title = task.trim().replace(/\s+/g, ' ')
  if (title.length <= 120) return title
  let shortened = title.slice(0, 119)
  // Do not split an emoji/supplementary character at the preview boundary.
  if (/[\uD800-\uDBFF]$/.test(shortened)) shortened = shortened.slice(0, -1)
  return `${shortened}…`
}

function uniqueId(used: Set<string>): string {
  const base = crypto.randomUUID()
  let id = base
  let suffix = 1
  while (used.has(id)) id = `${base}-${suffix++}`
  used.add(id)
  return id
}

export function importMeetingTasks(state: KanbanState, payload: MeetingKanbanHandoff, target: MeetingImportTarget): { state: KanbanState; added: number; skipped: number } {
  if (!validBoard(state)) throw new Error('invalidBoard')
  // Expiration applies when opening/reading the transfer, not while reviewing it in the destination.
  if (!validHandoff(payload, Date.now(), false)) throw new Error('invalidPayload')
  if (!record(target) || !['new-columns', 'existing'].includes(target.kind)) throw new Error('invalidTarget')
  const existingSources = new Set(state.columns.flatMap(column => column.cards.flatMap(card => card.meetingSource ? [JSON.stringify([card.meetingSource.meetingId, card.meetingSource.actionId])] : [])))
  const items = payload.items.filter(item => !existingSources.has(JSON.stringify([payload.meetingId, item.id])))
  const skipped = payload.items.length - items.length
  if (!items.length) return { state, added: 0, skipped }

  const statuses = STATUSES.filter(status => items.some(item => item.status === status))
  const columnIds = new Set(state.columns.map(column => column.id))
  for (const status of statuses) {
    if (target.kind === 'new-columns') {
      if (!record(target.titles) || !nonempty(target.titles[status]) || target.titles[status].length > 120) throw new Error('invalidTarget')
    } else if (!record(target.columnIds) || !nonempty(target.columnIds[status]) || !columnIds.has(target.columnIds[status])) throw new Error('invalidTarget')
  }

  const usedIds = new Set([...columnIds, ...state.columns.flatMap(column => column.cards.map(card => card.id))])
  const addedByColumn = new Map<string, KanbanCard[]>()
  const newColumns: KanbanColumn[] = []
  const destinations = new Map<TaskStatus, string>()
  for (const status of statuses) {
    if (target.kind === 'new-columns') {
      const column = { id: uniqueId(usedIds), title: target.titles[status], cards: [] }
      newColumns.push(column)
      destinations.set(status, column.id)
    } else destinations.set(status, target.columnIds[status])
  }
  const createdAt = Date.now()
  for (const item of items) {
    const card: KanbanCard = {
      id: uniqueId(usedIds), title: taskTitle(item.task), description: item.task,
      priority: 'medium', color: 'gray', dueDate: item.dueDate, createdAt, assignee: item.assignee,
      meetingSource: { meetingId: payload.meetingId, actionId: item.id, meetingTitle: payload.meetingTitle },
    }
    const columnId = destinations.get(item.status)!
    const added = addedByColumn.get(columnId) ?? []
    added.push(card)
    addedByColumn.set(columnId, added)
  }
  const columns = [...state.columns, ...newColumns].map(column => {
    const cards = addedByColumn.get(column.id)
    return cards ? { ...column, cards: [...column.cards, ...cards] } : column
  })
  return { state: { ...state, columns }, added: items.length, skipped }
}

/** Optimistic concurrency check; callers must retain their draft/payload on any failure. */
export function persistKanbanState(storage: Pick<Storage, 'getItem' | 'setItem'>, state: KanbanState, expectedRaw: string | null): string {
  if (!validBoard(state)) throw new Error('invalidBoard')
  if (expectedRaw !== null && !parseKanbanState(expectedRaw)) throw new Error('invalidBoard')
  const raw = JSON.stringify(state)
  if (!parseKanbanState(raw)) throw new Error('invalidBoard')
  if (storage.getItem(KANBAN_STORAGE_KEY) !== expectedRaw) throw new Error('conflict')
  storage.setItem(KANBAN_STORAGE_KEY, raw)
  if (storage.getItem(KANBAN_STORAGE_KEY) !== raw) throw new Error('conflict')
  return raw
}
