import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const SAVED_KEY = 'dday-saved'
export const ANNIV_KEY = 'dday-anniv'
export const calendarRows = count => Array.from({ length: count }, (_, index) => ({ id: `event-${index}`, title: index === 0 ? '한글 행사,세미;백슬래시\\줄\n다음 줄' : `Synthetic event ${index}`, date: `2028-03-${String(index % 28 + 1).padStart(2, '0')}`, pinned: index === 0 }))

export function parseCalendar(bytes) {
  assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf', 'ICS has no BOM')
  const raw = bytes.toString('utf8')
  assert.ok(raw.startsWith('BEGIN:VCALENDAR\r\n') && raw.endsWith('END:VCALENDAR\r\n'))
  assert.doesNotMatch(raw.replaceAll('\r\n', ''), /[\r\n]/)
  for (const line of raw.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
  assert.doesNotMatch(raw, /RRULE:|BEGIN:VALARM/)
  const text = raw.replace(/\r\n[ \t]/g, '')
  const events = [...text.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map(match => Object.fromEntries(match[1].trim().split('\r\n').map(line => { const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1)] })))
  return { raw, text, events }
}
export const calendarEscaped = text => text.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,')
export function expectedUid(event) {
  const identity = JSON.stringify(['toolhub-dday-v1', event.id === undefined ? 'current' : 'saved', event.id ?? '', event.title, event.date])
  return `dday-${createHash('sha256').update(identity).digest('hex')}@toolhub.ai.kr`
}

export async function installDdayPorts(context) {
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return
    const digest = crypto.subtle.digest.bind(crypto.subtle), create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), click = HTMLAnchorElement.prototype.click
    window.__digestMode = 'native'; window.__digestPending = []; window.__digestCalls = 0; window.__ddayUrls = []; window.__ddayAnchors = []; window.__urlMode = 'native'
    crypto.subtle.digest = async (...args) => {
      window.__digestCalls++; const mode = window.__digestMode, value = await digest(...args)
      if (mode === 'hold') return new Promise(resolve => window.__digestPending.push(() => resolve(value)))
      return value
    }
    window.__releaseDigests = () => { const pending = window.__digestPending.splice(0); pending.forEach(resolve => resolve()) }
    URL.createObjectURL = blob => { if (window.__urlMode === 'throw') throw new Error('Synthetic Blob URL unavailable'); const href = create(blob); window.__ddayUrls.push({ href, type: blob.type, size: blob.size, revoked: 0 }); return href }
    URL.revokeObjectURL = href => { const item = window.__ddayUrls.find(item => item.href === href); if (item) item.revoked++; return revoke(href) }
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__ddayAnchors.push({ filename: this.download, href: this.href }); return click.call(this) }
  })
}
