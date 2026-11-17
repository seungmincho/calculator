export const VOICE_TRANSCRIPT_EXPORT_LIMIT = 20
export const VOICE_TRANSCRIPT_TEXT_LIMIT = 12000
export const VOICE_TRANSCRIPT_TOTAL_LIMIT = 240000
export interface VoiceTranscriptItem { id: string; name: string; timestamp: number; duration: number; transcript: string }
export interface VoiceTranscriptLabels { title: string; recordedAt: string; duration: string }

export function isExportableVoiceTranscript(item: VoiceTranscriptItem): boolean {
  return typeof item.id === 'string' && !!item.id && typeof item.name === 'string' && !!item.name.trim() && item.name.length <= 120 &&
    typeof item.transcript === 'string' && !!item.transcript.trim() && item.transcript.length <= VOICE_TRANSCRIPT_TEXT_LIMIT &&
    Number.isFinite(item.timestamp) && item.timestamp > 0 && item.timestamp <= 8640000000000000 &&
    Number.isFinite(item.duration) && item.duration >= 0
}

/** Validate every selection; never silently omit removed or empty transcripts. */
export function selectVoiceMemoTranscripts(items: readonly VoiceTranscriptItem[], ids: readonly string[]): VoiceTranscriptItem[] {
  if (!ids.length) throw new Error('emptySelection')
  if (ids.length > VOICE_TRANSCRIPT_EXPORT_LIMIT) throw new Error('selectionLimit')
  if (new Set(ids).size !== ids.length) throw new Error('invalidSelection')
  const selected = ids.map(id => {
    const matches = items.filter(item => item.id === id)
    if (matches.length !== 1) throw new Error('staleSelection')
    const item = matches[0]
    if (typeof item.transcript === 'string' && item.transcript.length > VOICE_TRANSCRIPT_TEXT_LIMIT) throw new Error('textLimit')
    if (!isExportableVoiceTranscript(item)) throw new Error('staleSelection')
    return { id: item.id, name: item.name, timestamp: item.timestamp, duration: item.duration, transcript: item.transcript }
  })
  if (selected.reduce((total, item) => total + item.transcript.length, 0) > VOICE_TRANSCRIPT_TOTAL_LIMIT) throw new Error('totalLimit')
  // Resolve equal timestamps by the source list order, matching the displayed list.
  const order = new Map(items.map((item, index) => [item.id, index]))
  return selected.sort((a, b) => b.timestamp - a.timestamp || order.get(a.id)! - order.get(b.id)!)
}

export function formatVoiceTranscriptLocalTime(timestamp: number): string {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) throw new Error('staleSelection')
  const pad = (value: number) => String(value).padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} (UTC${offset >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)})`
}

export function formatVoiceTranscriptDuration(seconds: number): string {
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function buildVoiceMemoTranscriptBundle(items: readonly VoiceTranscriptItem[], ids: readonly string[], labels: VoiceTranscriptLabels): { text: string; count: number; characters: number } {
  const selected = selectVoiceMemoTranscripts(items, ids)
  const blocks = selected.map((item, index) => [
    `========== ${index + 1} / ${selected.length} ==========`,
    `${labels.title}: ${item.name}`,
    `${labels.recordedAt}: ${formatVoiceTranscriptLocalTime(item.timestamp)}`,
    `${labels.duration}: ${formatVoiceTranscriptDuration(item.duration)}`,
    '', item.transcript,
  ].join('\n'))
  return { text: '\uFEFF' + blocks.join('\n\n') + '\n', count: selected.length, characters: selected.reduce((total, item) => total + item.transcript.length, 0) }
}
