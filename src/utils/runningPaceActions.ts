import { formatClock } from './runningPace.ts'
import { copyShareResultLink } from './shareResultActions.ts'
import type { RunningComparisonSnapshot } from './runningPaceComparison.ts'

export interface RunningExportLabels {
  distanceKm: string; splitIntervalKm: string; splitDistanceKm: string; goals: readonly string[]
  totalSeconds: string; paceSecondsPerKm: string; speedKmh: string; elapsedSeconds: string; elapsedClock: string
}
function quoteCell(value: string, delimiter: ',' | '\t'): string {
  const safe = /^[\s\uFEFF\u200B-\u200D]*[=+\-@]/.test(value) ? `'${value}` : value
  return safe.includes(delimiter) || /["\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}
export function serializeRunningComparison(snapshot: RunningComparisonSnapshot, labels: RunningExportLabels, format: 'csv' | 'tsv'): string {
  if (snapshot.goals.length < 1 || snapshot.goals.length > 3 || snapshot.splits.length < 1 || snapshot.splits.length > 500 || labels.goals.length < snapshot.goals.length) throw new Error('invalidSnapshot')
  const delimiter = format === 'csv' ? ',' : '\t'
  const header = [labels.distanceKm, labels.splitIntervalKm, labels.splitDistanceKm]
  snapshot.goals.forEach((_goal, i) => { for (const field of [labels.totalSeconds, labels.paceSecondsPerKm, labels.speedKmh, labels.elapsedSeconds, labels.elapsedClock]) header.push(`${labels.goals[i]} · ${field}`) })
  if (header.some(value => typeof value !== 'string' || value.length > 400)) throw new Error('invalidLabels')
  const lines = [header.map(value => quoteCell(value, delimiter)).join(delimiter)]
  for (const split of snapshot.splits) {
    if (split.elapsedSeconds.length !== snapshot.goals.length) throw new Error('invalidSnapshot')
    const values = [snapshot.distanceKm, snapshot.splitKm, split.distanceKm]
    const cells: string[] = []
    if (!values.every(Number.isFinite)) throw new Error('invalidSnapshot')
    cells.push(...values.map(String))
    snapshot.goals.forEach((goal, i) => {
      const numeric = [goal.finishSeconds, goal.secondsPerKm, goal.speedKmh, split.elapsedSeconds[i]]
      if (!numeric.every(value => Number.isFinite(value) && value >= 0)) throw new Error('invalidSnapshot')
      cells.push(...numeric.map(String), formatClock(split.elapsedSeconds[i], true))
    })
    lines.push(cells.map(value => quoteCell(value, delimiter)).join(delimiter))
  }
  return `${format === 'csv' ? '\uFEFF' : ''}${lines.join('\r\n')}`
}
export interface RunningActionToken { revision: number; request: number }
export function createRunningActionGuard() {
  let revision = 0, request = 0, active = false, context = ''
  return {
    activate() { active = true }, dispose() { active = false; revision++ }, invalidate() { revision++ },
    setContext(value: string) { if (context !== value) { context = value; revision++ } },
    begin(): RunningActionToken { return { revision, request: ++request } },
    current(token: RunningActionToken) { return active && token.revision === revision && token.request === request },
  }
}
export interface RunningCopyPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export async function copyRunningText(text: string, current: () => boolean, ports?: RunningCopyPorts): Promise<'copied' | 'failed' | 'stale'> {
  return copyShareResultLink(text, current, ports)
}
export interface RunningDownloadPorts { createUrl: (blob: Blob) => string; revokeUrl: (href: string) => void; click: (href: string, filename: string) => void; schedule: (callback: () => void) => unknown; cancel: (timer: unknown) => void }
export function createRunningDownloads(ports?: RunningDownloadPorts) {
  const io: RunningDownloadPorts = ports ?? {
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: href => URL.revokeObjectURL(href),
    click(href, filename) { const anchor = document.createElement('a'); anchor.href = href; anchor.download = filename; try { document.body.appendChild(anchor); anchor.click() } finally { anchor.remove() } },
    schedule: callback => setTimeout(callback, 1000), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  }
  let active = false
  const owned = new Map<string, { timer?: unknown }>()
  const release = (href: string) => { const entry = owned.get(href); if (!entry) return; owned.delete(href); if (entry.timer !== undefined) { try { io.cancel(entry.timer) } catch { /* Still revoke. */ } } try { io.revokeUrl(href) } catch { /* Avoid retaining a failed cleanup. */ } }
  return {
    activate() { active = true }, dispose() { active = false; for (const href of [...owned.keys()]) release(href) },
    download(csv: string, current: () => boolean): 'started' | 'failed' | 'stale' {
      if (!active || !current()) return 'stale'
      let href: string | null = null
      try {
        href = io.createUrl(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const entry: { timer?: unknown } = {}; owned.set(href, entry)
        if (!active || !current()) { release(href); return 'stale' }
        io.click(href, 'running-pace-comparison.csv')
        if (owned.has(href)) { const value = href; entry.timer = io.schedule(() => release(value)); if (!owned.has(href)) io.cancel(entry.timer) }
        return current() ? 'started' : 'stale'
      } catch { if (href) release(href); return current() ? 'failed' : 'stale' }
    },
  }
}
