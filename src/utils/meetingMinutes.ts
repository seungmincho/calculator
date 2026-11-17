import type { MeetingExcerpt, MeetingHandoff } from './meetingHandoff'

export type AttendeeStatus = 'present' | 'absent' | 'remote'
export type ActionStatus = 'pending' | 'in-progress' | 'done'
export type ExportFormat = 'text' | 'markdown' | 'html'
export type TemplateId = 'weekly' | 'kickoff' | 'brainstorming' | 'retrospective' | 'client'

export interface Attendee {
  id: string
  name: string
  role: string
  status: AttendeeStatus
}

export interface AgendaItem {
  id: string
  title: string
  notes: string
  duration: string
}

export interface DiscussionPoint {
  id: string
  speaker: string
  content: string
}

export interface ActionItem {
  id: string
  task: string
  assignee: string
  dueDate: string
  status: ActionStatus
}

export interface MeetingData {
  title: string
  date: string
  time: string
  location: string
  locationType: 'online' | 'offline'
  organizer: string
  attendees: Attendee[]
  agenda: AgendaItem[]
  discussions: DiscussionPoint[]
  actions: ActionItem[]
  decisions: string
  nextMeeting: string
  notes: string
  importedSources?: string[]
  kanbanSourceId?: string
}


export type MeetingTranslator = (key: string, values?: Record<string, string | number>) => string

export const MEETING_AUTO_KEY = 'meetingMinutes_auto'
export const MEETING_SLOTS_KEY = 'meetingMinutes_slots'

const string = (value: unknown): value is string => typeof value === 'string' && value.length <= 100000
const fields = (value: unknown, keys: string[]): boolean => !!value && typeof value === 'object' && keys.every(key => string((value as Record<string, unknown>)[key]))
const rows = (value: unknown, keys: string[], valid: (row: Record<string, string>) => boolean = () => true): boolean => Array.isArray(value) && value.length <= 500 && value.every(row => fields(row, ['id', ...keys]) && !!row.id && valid(row)) && new Set(value.map(row => row.id)).size === value.length

export function isMeetingData(value: unknown): value is MeetingData {
  if (!fields(value, ['title', 'date', 'time', 'location', 'organizer', 'decisions', 'nextMeeting', 'notes'])) return false
  const data = value as MeetingData
  return ['online', 'offline'].includes(data.locationType) &&
    rows(data.attendees, ['name', 'role', 'status'], row => ['present', 'absent', 'remote'].includes(row.status)) &&
    rows(data.agenda, ['title', 'notes', 'duration']) && rows(data.discussions, ['speaker', 'content']) &&
    rows(data.actions, ['task', 'assignee', 'dueDate', 'status'], row => ['pending', 'in-progress', 'done'].includes(row.status)) &&
    (data.importedSources === undefined || (Array.isArray(data.importedSources) && data.importedSources.length <= 200 && data.importedSources.every(id => typeof id === 'string' && !!id && id.length <= 80))) &&
    (data.kanbanSourceId === undefined || (typeof data.kanbanSourceId === 'string' && !!data.kanbanSourceId.trim() && data.kanbanSourceId.length <= 80))
}

export function parseMeetingData(raw: string | null): MeetingData | null {
  if (raw === null) return null
  if (raw.length > 2000000) throw new Error('invalidMeeting')
  const data: unknown = JSON.parse(raw)
  if (!isMeetingData(data)) throw new Error('invalidMeeting')
  return data
}

export function parseMeetingSlots(raw: string | null): { name: string; data: MeetingData }[] {
  if (raw === null) return []
  if (raw.length > 4000000) throw new Error('invalidSlots')
  const slots = JSON.parse(raw)
  if (!Array.isArray(slots) || !slots.every(slot => slot && string(slot.name) && !!slot.name.trim() && isMeetingData(slot.data)) || new Set(slots.map(slot => slot.name)).size !== slots.length) throw new Error('invalidSlots')
  return slots
}

/** Keep a newer draft in another tab intact instead of silently replacing it. */
export function meetingStorageWrite(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, raw: string, expected: string | null): void {
  if (storage.getItem(key) !== expected) throw new Error('conflict')
  storage.setItem(key, raw)
}

export function appendMeetingExcerpts(data: MeetingData, source: Pick<MeetingHandoff, 'id' | 'name'>, entries: MeetingExcerpt[], id: () => string = () => crypto.randomUUID()): MeetingData {
  if (!isMeetingData(data) || !source.id || source.id.length > 80 || !source.name.trim()) throw new Error('invalidMeeting')
  if (data.importedSources?.includes(source.id)) throw new Error('alreadyImported')
  if (!entries.length || entries.length > 100 || entries.some(entry => !entry || !['discussion', 'decision', 'action'].includes(entry.kind) || typeof entry.text !== 'string' || !entry.text.trim()) || entries.reduce((sum, entry) => sum + entry.text.length, 0) > 12000) throw new Error('invalidSelection')
  const next: MeetingData = { ...data, title: data.title.trim() ? data.title : source.name, discussions: [...data.discussions], actions: [...data.actions], importedSources: [...(data.importedSources ?? []), source.id] }
  for (const entry of entries) {
    const text = entry.text.trim()
    if (entry.kind === 'discussion') next.discussions.push({ id: id(), speaker: '', content: text })
    else if (entry.kind === 'action') next.actions.push({ id: id(), task: text, assignee: '', dueDate: '', status: 'pending' })
    else next.decisions = [next.decisions, text].filter(Boolean).join('\n')
  }
  if (!isMeetingData(next)) throw new Error('invalidSelection')
  return next
}

export function escapeMeetingData(data: MeetingData): MeetingData {
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  return { ...data, title: escape(data.title), date: escape(data.date), time: escape(data.time), location: escape(data.location), organizer: escape(data.organizer), decisions: escape(data.decisions), nextMeeting: escape(data.nextMeeting), notes: escape(data.notes),
    attendees: data.attendees.map(row => ({ ...row, name: escape(row.name), role: escape(row.role) })),
    agenda: data.agenda.map(row => ({ ...row, title: escape(row.title), notes: escape(row.notes), duration: escape(row.duration) })),
    discussions: data.discussions.map(row => ({ ...row, speaker: escape(row.speaker), content: escape(row.content) })),
    actions: data.actions.map(row => ({ ...row, task: escape(row.task), assignee: escape(row.assignee), dueDate: escape(row.dueDate) })),
  }
}

export function formatForExport(data: MeetingData, format: ExportFormat, t: MeetingTranslator): string {
  if (format === 'html') data = escapeMeetingData(data)
  const title = data.title || t('export.docTitle')
  const place = `${data.location} (${data.locationType === 'online' ? t('online') : t('offline')})`
  const dur = (d: string) => (d ? ` ${t('durationTag', { n: d })}` : '')
  const statusLabel = (st: string) => t(st === 'done' ? 'done' : st === 'in-progress' ? 'inProgress' : 'pending')
  const attendeeList = data.attendees
    .map(a => `${a.name}${a.role ? ` (${a.role})` : ''}`)
    .join(', ')

  const agendaText = data.agenda
    .map((a, i) => `${i + 1}. ${a.title}${dur(a.duration)}${a.notes ? `\n   ${a.notes}` : ''}`)
    .join('\n')

  const discussionText = data.discussions
    .map((d, i) => `${i + 1}. ${d.speaker ? `[${d.speaker}] ` : ''}${d.content}`)
    .join('\n')

  const actionText = data.actions
    .map((a, i) => `${i + 1}. ${a.task} — ${t('export.owner')}: ${a.assignee || '-'}, ${t('dueDate')}: ${a.dueDate || '-'} [${statusLabel(a.status)}]`)
    .join('\n')

  if (format === 'markdown') {
    return `# ${title}

## ${t('export.basicInfo')}
| ${t('export.field')} | ${t('export.value')} |
|------|------|
| ${t('date')} | ${data.date} |
| ${t('time')} | ${data.time} |
| ${t('location')} | ${place} |
| ${t('organizer')} | ${data.organizer} |
| ${t('attendees')} | ${attendeeList} |

## ${t('agenda')}
${agendaText}

## ${t('discussion')}
${discussionText}

## ${t('decisions')}
${data.decisions}

## ${t('actionItems')}
${actionText}

## ${t('nextMeeting')}
${data.nextMeeting}

## ${t('extraNotes')}
${data.notes}
`
  }

  if (format === 'html') {
    return `<!DOCTYPE html>
<html lang="${t('export.htmlLang')}">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: 'Malgun Gothic', sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
  h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { border-left: 4px solid #3b82f6; padding-left: 12px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f3f4f6; }
  ol { padding-left: 20px; }
  .status-done { color: #16a34a; font-weight: bold; }
  .status-inprogress { color: #d97706; font-weight: bold; }
  .status-pending { color: #6b7280; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<table>
<tr><th>${t('date')}</th><td>${data.date}</td><th>${t('time')}</th><td>${data.time}</td></tr>
<tr><th>${t('location')}</th><td>${place}</td><th>${t('organizer')}</th><td>${data.organizer}</td></tr>
<tr><th>${t('attendees')}</th><td colspan="3">${attendeeList}</td></tr>
</table>
<h2>${t('agenda')}</h2>
<ol>${data.agenda.map(a => `<li><strong>${a.title}</strong>${dur(a.duration)}${a.notes ? `<br><small>${a.notes}</small>` : ''}</li>`).join('')}</ol>
<h2>${t('discussion')}</h2>
<ol>${data.discussions.map(d => `<li>${d.speaker ? `<strong>[${d.speaker}]</strong> ` : ''}${d.content}</li>`).join('')}</ol>
<h2>${t('decisions')}</h2>
<p>${data.decisions.replace(/\n/g, '<br>')}</p>
<h2>${t('actionItems')}</h2>
<table><tr><th>#</th><th>${t('export.task')}</th><th>${t('assignee')}</th><th>${t('dueDate')}</th><th>${t('status')}</th></tr>
${data.actions.map((a, i) => {
  const cls = a.status === 'done' ? 'status-done' : a.status === 'in-progress' ? 'status-inprogress' : 'status-pending'
  return `<tr><td>${i + 1}</td><td>${a.task}</td><td>${a.assignee}</td><td>${a.dueDate}</td><td class="${cls}">${statusLabel(a.status)}</td></tr>`
}).join('')}
</table>
<h2>${t('nextMeeting')}</h2>
<p>${data.nextMeeting}</p>
<h2>${t('extraNotes')}</h2>
<p>${data.notes.replace(/\n/g, '<br>')}</p>
</body>
</html>`
  }

  // plain text
  return `=====================================
${title}
=====================================
${t('date')}: ${data.date}  ${t('time')}: ${data.time}
${t('location')}: ${place}
${t('organizer')}: ${data.organizer}
${t('attendees')}: ${attendeeList}

[ ${t('agenda')} ]
${agendaText}

[ ${t('discussion')} ]
${discussionText}

[ ${t('decisions')} ]
${data.decisions}

[ ${t('actionItems')} ]
${actionText}

[ ${t('nextMeeting')} ]
${data.nextMeeting}

[ ${t('extraNotes')} ]
${data.notes}
=====================================`
}

