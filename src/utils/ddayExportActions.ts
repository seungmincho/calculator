import { isValidDate } from './dday.ts'
import type { DdayCalendarEvent } from './ddayCalendar.ts'

export interface DdayExportToken { readonly owner: symbol; readonly epoch: number; readonly request: number }
/** Callback ownership only. Native Clipboard/hash operations themselves cannot be cancelled. */
export function createDdayExportRequests(key = '') {
  const owner = Symbol('dday-output')
  let active = false, epoch = 0, request = 0
  return { key,
    activate() { active = true; epoch++ },
    begin(): DdayExportToken | null { return active ? Object.freeze({ owner, epoch, request: ++request }) : null },
    current(token: DdayExportToken) { return active && token.owner === owner && token.epoch === epoch && token.request === request },
    invalidate() { request++ },
    dispose() { active = false; epoch++; request++ },
  }
}

/** Explicit links must reproduce this event even when the recipient has a different pinned event. */
export function ddayExportUrl(href: string, event: Pick<DdayCalendarEvent, 'title' | 'date'>): string {
  if (!isValidDate(event.date) || typeof event.title !== 'string') throw new Error('invalid event')
  const url = new URL(href)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('invalid URL')
  for (const key of ['mode', 'date', 'target', 'title', 'event', 'start', 'end', 'type', 'inc', 'base', 'value', 'unit', 'dir', 'biz']) url.searchParams.delete(key)
  url.searchParams.set('mode', 'dday'); url.searchParams.set('date', event.date); url.searchParams.set('title', event.title)
  return url.href
}

export function captureDdayEvents(events: readonly DdayCalendarEvent[]): DdayCalendarEvent[] {
  return events.map(event => Object.freeze({ title: event.title, date: event.date, ...(event.id === undefined ? {} : { id: event.id }) }))
}
export function sameDdayEvents(a: readonly DdayCalendarEvent[], b: readonly DdayCalendarEvent[]): boolean {
  return a.length === b.length && a.every((event, index) => event.id === b[index].id && event.title === b[index].title && event.date === b[index].date)
}
