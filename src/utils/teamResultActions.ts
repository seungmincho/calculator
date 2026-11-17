import { rating } from './teamBoard.ts'
import type { TeamEditSnapshot } from './teamBoardHistory.ts'

export const TEAM_RESULT_FILENAME = 'team-divider.txt'
export interface TeamResultLabels { teamLabel: string; memberUnit: string; skillSum: (sum: number) => string }
export interface TeamResultSnapshot { readonly text: string; readonly filename: typeof TEAM_RESULT_FILENAME }

/** Preserve the existing copy format; current skills remain separate from board-history snapshots. */
export function formatTeamResult(board: Pick<TeamEditSnapshot, 'teams' | 'mode'>, skills: Readonly<Record<string, number>>, labels: TeamResultLabels): string {
  const balanced = board.mode === 'balanced'
  return board.teams.map((team, index) => {
    const sum = balanced ? ` · ${labels.skillSum(team.reduce((total, name) => total + rating(skills, name), 0))}` : ''
    const members = balanced ? team.map(name => `${name}(${rating(skills, name)})`) : team
    return `${labels.teamLabel} ${index + 1} (${team.length}${labels.memberUnit}${sum})\n${members.join(', ')}`
  }).join('\n\n')
}

export function createTeamResultSnapshot(board: Pick<TeamEditSnapshot, 'teams' | 'mode'>, skills: Readonly<Record<string, number>>, labels: TeamResultLabels): TeamResultSnapshot {
  return Object.freeze({ text: formatTeamResult(board, skills, labels), filename: TEAM_RESULT_FILENAME })
}

export function createTeamResultGuard() {
  let revision = 0, request = 0
  return {
    begin() { return Object.freeze({ revision, request: ++request }) },
    isCurrent(token: { readonly revision: number; readonly request: number }): boolean { return token.revision === revision && token.request === request },
    invalidate(): void { revision++ },
  }
}

export interface TeamClipboardPorts { writeText?: (text: string) => Promise<void>; fallback: (text: string) => boolean }
export type TeamCopyOutcome = 'copied' | 'failed' | 'stale'

function legacyTeamCopy(text: string): boolean {
  const active = document.activeElement, field = document.createElement('textarea')
  field.value = text; field.readOnly = true; field.style.position = 'fixed'; field.style.left = '-9999px'
  try {
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    return document.execCommand('copy') === true
  } finally {
    field.remove()
    try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* The clipboard outcome does not depend on focus recovery. */ }
  }
}

export async function copyTeamResultText(text: string, current: () => boolean, ports?: TeamClipboardPorts): Promise<TeamCopyOutcome> {
  if (!current()) return 'stale'
  try {
    const write = ports ? ports.writeText : typeof navigator !== 'undefined' && navigator.clipboard?.writeText ? (value: string) => navigator.clipboard.writeText(value) : undefined
    if (write) { await write(text); return current() ? 'copied' : 'stale' }
  } catch { /* Only a still-current request may attempt legacy copy. */ }
  if (!current()) return 'stale'
  try {
    const copied = ports ? ports.fallback(text) : legacyTeamCopy(text)
    return current() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return current() ? 'failed' : 'stale' }
}

export interface TeamDownloadPorts {
  createUrl: (blob: Blob) => string
  revokeUrl: (url: string) => void
  download: (url: string, filename: string) => void
  schedule: (callback: () => void, delay: number) => unknown
  cancel: (timer: unknown) => void
}

/** Own all temporary URLs, including failures and unmount cleanup; never persist names or result text. */
export function createTeamResultDownloads(ports?: TeamDownloadPorts) {
  const io: TeamDownloadPorts = ports ?? {
    createUrl: blob => URL.createObjectURL(blob), revokeUrl: url => URL.revokeObjectURL(url),
    download(url, filename) {
      const link = document.createElement('a')
      link.href = url; link.download = filename
      try { document.body.appendChild(link); link.click() } finally { link.remove() }
    },
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  }
  const pending = new Map<string, { timer?: unknown; released: boolean }>()
  let disposed = false
  const release = (url: string) => {
    const entry = pending.get(url)
    if (!entry || entry.released) return
    entry.released = true; pending.delete(url)
    if (entry.timer !== undefined) { try { io.cancel(entry.timer) } catch { /* URL release must still run. */ } }
    try { io.revokeUrl(url) } catch { /* Cleanup cannot report a successful browser download. */ }
  }
  return {
    download(snapshot: TeamResultSnapshot, current: () => boolean): 'started' | 'failed' | 'stale' {
      if (disposed || !current()) return 'stale'
      let url: string | null = null
      try {
        const blob = new Blob([snapshot.text], { type: 'text/plain;charset=utf-8' })
        url = io.createUrl(blob)
        const entry: { timer?: unknown; released: boolean } = { released: false }
        pending.set(url, entry)
        if (disposed || !current()) { release(url); return 'stale' }
        io.download(url, TEAM_RESULT_FILENAME)
        if (!entry.released) {
          const ownedUrl = url
          entry.timer = io.schedule(() => release(ownedUrl), 1000)
          // A synchronous test port or teardown during schedule may already have released it.
          if (entry.released && entry.timer !== undefined) io.cancel(entry.timer)
        }
        return 'started'
      } catch { if (url !== null) release(url); return 'failed' }
    },
    dispose(): void { disposed = true; for (const url of [...pending.keys()]) release(url) },
  }
}
