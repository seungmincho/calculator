import { chunkText } from './tts.ts'

export const MEETING_HANDOFF_KEY = 'toolhub-voice-meeting-v1'
export const MEETING_HANDOFF_TTL = 10 * 60 * 1000
export const MAX_MEETING_SELECTIONS = 100
export interface MeetingHandoff { id: string; source: 'voice-memo'; name: string; transcript: string; createdAt: number }
export type MeetingExcerptKind = 'discussion' | 'decision' | 'action'
export interface MeetingExcerpt { text: string; kind: MeetingExcerptKind }

export function parseMeetingHandoff(raw: string | null, now = Date.now()): MeetingHandoff | null {
  if (!raw || raw.length > 80000) return null
  try {
    const data = JSON.parse(raw) as MeetingHandoff
    if (!data || data.source !== 'voice-memo' || typeof data.id !== 'string' || !data.id || data.id.length > 80 || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120 || typeof data.transcript !== 'string' || !data.transcript.trim() || data.transcript.length > 12000 || !Number.isFinite(data.createdAt) || data.createdAt > now || now - data.createdAt > MEETING_HANDOFF_TTL) return null
    return data
  } catch { return null }
}

/** Deterministic splitting only: no summaries, inferred owners or inferred deadlines. */
export function meetingSentences(text: string): string[] {
  if (text.length > 12000) throw new Error('invalidTranscript')
  return chunkText(text, 1000).map(segment => segment.text)
}

/** Open synchronously from a user gesture. Keep the source audio and unsaved edits in their tab. */
export function openMeetingHandoff(name: string, transcript: string): void {
  const payload: MeetingHandoff = { id: crypto.randomUUID(), source: 'voice-memo', name, transcript, createdAt: Date.now() }
  const raw = JSON.stringify(payload)
  if (!parseMeetingHandoff(raw)) throw new Error('invalidTranscript')
  const target = window.open('about:blank', '_blank')
  if (!target) throw new Error('popupBlocked')
  try {
    target.opener = null
    target.sessionStorage.setItem(MEETING_HANDOFF_KEY, raw)
    target.location.replace('/meeting-minutes/?from=voice')
  } catch {
    target.close()
    throw new Error('handoffFailed')
  }
}
