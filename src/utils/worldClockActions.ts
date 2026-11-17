import { createMeetingCalendar, type MeetingCalendarInput, type MeetingDigest } from './worldClockCalendar.ts'

export type MeetingActionKind = 'copy' | 'calendar'
export interface MeetingActionToken { revision: number; request: number; kind: MeetingActionKind }

/** Input/city/locale/unmount invalidates both lanes; a newer action supersedes its own lane. */
export function createMeetingActionGuard() {
  let revision = 0
  const requests = { copy: 0, calendar: 0 }
  return {
    begin(kind: MeetingActionKind): MeetingActionToken { return { revision, request: ++requests[kind], kind } },
    isCurrent(token: MeetingActionToken): boolean { return token.revision === revision && token.request === requests[token.kind] },
    invalidate() { revision++ },
  }
}

export interface MeetingCopyPort { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type MeetingCopyOutcome = 'copied' | 'failed' | 'stale'
function legacyCopy(text: string): boolean {
  const previous = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) } catch { /* Focus does not determine copy success. */ }
  }
}

export async function copyMeetingText(text: string, isCurrent: () => boolean, port?: MeetingCopyPort): Promise<MeetingCopyOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const write = port ? port.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return isCurrent() ? 'copied' : 'stale' }
  } catch { /* Only a current snapshot may use the local fallback. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = port ? port.fallback(text) : legacyCopy(text)
    return !isCurrent() ? 'stale' : copied === true ? 'copied' : 'failed'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}

export interface MeetingCalendarPort { now?: () => number; digest?: MeetingDigest; save?: (text: string, filename: string) => void }
export type MeetingDownloadOutcome = 'started' | 'failed' | 'stale'
function saveCalendar(text: string, filename: string): void {
  let url: string | null = null
  try {
    url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename
    document.body.appendChild(anchor)
    try { anchor.click() } finally { anchor.remove() }
    const created = url
    window.setTimeout(() => URL.revokeObjectURL(created), 1000)
  } catch (cause) {
    if (url) URL.revokeObjectURL(url)
    throw cause
  }
}

/** No automatic save until the digest resolves and the exact clicked snapshot is still current. */
export async function downloadMeetingCalendar(input: MeetingCalendarInput, isCurrent: () => boolean, port: MeetingCalendarPort = {}): Promise<MeetingDownloadOutcome> {
  if (!isCurrent()) return 'stale'
  try {
    const text = await createMeetingCalendar(input, (port.now ?? Date.now)(), port.digest)
    if (!isCurrent()) return 'stale'
    const save = port.save ?? saveCalendar
    save(text, 'toolhub-world-clock-meeting.ics')
    return isCurrent() ? 'started' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}
