// 메모장 순수 로직. 회귀 체크: node scripts/check-notepad.ts

export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  pinned?: boolean
}

/** 예전(v1)부터 쓰던 키. 형식: Note[] 배열 그대로 — 키·형식 유지(pinned만 선택 필드로 추가) */
export const STORAGE_KEY = 'toolhub-notepad-notes'
export const SETTINGS_KEY = 'toolhub-notepad-settings'
const BACKUP_APP = 'toolhub-notepad'

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/**
 * 저장값/백업 파일 → Note[]. 받아들이는 형식:
 * - v1 로컬 저장: Note[] 배열
 * - 백업 파일: { app, version, notes: Note[] }
 * 필드 누락·타입 오류는 보정, content/title 둘 다 없는 항목은 버림, 중복 id는 새 id 부여.
 * 파싱 실패면 null (호출부가 기존 데이터를 덮어쓰지 않게).
 */
export function parseNotes(raw: string | null, now = Date.now()): Note[] | null {
  if (raw == null) return []
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  const list = Array.isArray(data) ? data : data && typeof data === 'object' && Array.isArray((data as { notes?: unknown }).notes) ? (data as { notes: unknown[] }).notes : null
  if (!list) return null
  const seen = new Set<string>()
  const out: Note[] = []
  for (const n of list) {
    if (!n || typeof n !== 'object') continue
    const o = n as Record<string, unknown>
    if (typeof o.content !== 'string' && typeof o.title !== 'string') continue
    let id = str(o.id) || newId()
    while (seen.has(id)) id = newId()
    seen.add(id)
    const createdAt = num(o.createdAt, now)
    out.push({ id, title: str(o.title), content: str(o.content), createdAt, updatedAt: num(o.updatedAt, createdAt), ...(o.pinned === true ? { pinned: true } : {}) })
  }
  return out
}

export const backupJson = (notes: Note[], now = Date.now()) =>
  JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: new Date(now).toISOString(), notes }, null, 2)

/** 가져오기 병합: 같은 id는 더 최근에 수정된 쪽, 나머지는 추가 */
export function mergeNotes(cur: Note[], incoming: Note[]): { notes: Note[]; added: number; updated: number } {
  const byId = new Map(cur.map(n => [n.id, n]))
  let added = 0, updated = 0
  for (const n of incoming) {
    const old = byId.get(n.id)
    if (!old) { byId.set(n.id, n); added++ }
    else if (n.updatedAt > old.updatedAt) { byId.set(n.id, n); updated++ }
  }
  return { notes: [...byId.values()], added, updated }
}

/** 고정 먼저, 그다음 최근 수정순 */
export const sortNotes = (notes: Note[]) =>
  [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)

export function searchNotes(notes: Note[], q: string): Note[] {
  const s = q.trim().toLowerCase()
  if (!s) return notes
  return notes.filter(n => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s))
}

/** 목록 표시용 이름: 제목 → 첫 줄 → '' */
export const displayTitle = (n: Pick<Note, 'title' | 'content'>) =>
  n.title.trim() || n.content.trimStart().split('\n')[0].slice(0, 40).trim()

/** 파일명에 못 쓰는 문자 제거 */
export const safeFileName = (s: string, fallback = 'memo') =>
  s.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, 60) || fallback

// ── 찾기·바꾸기 (일반 텍스트, 정규식 아님) ──

/** 겹치지 않는 일치 위치들의 시작 인덱스 */
export function findAll(text: string, q: string, caseSensitive = false): number[] {
  if (!q) return []
  const h = caseSensitive ? text : text.toLowerCase()
  const n = caseSensitive ? q : q.toLowerCase()
  // ponytail: toLowerCase로 길이가 바뀌는 문자(İ 등)는 위치가 어긋날 수 있음 — 한글·영문은 무관
  const out: number[] = []
  for (let i = h.indexOf(n); i !== -1; i = h.indexOf(n, i + n.length)) out.push(i)
  return out
}

/** 커서(from) 이후 첫 일치, 없으면 처음으로 순환. 일치 없으면 -1 */
export function nextMatch(text: string, q: string, from: number, caseSensitive = false): number {
  const all = findAll(text, q, caseSensitive)
  if (!all.length) return -1
  return all.find(i => i >= from) ?? all[0]
}

export function replaceAll(text: string, q: string, rep: string, caseSensitive = false): { text: string; count: number } {
  const all = findAll(text, q, caseSensitive)
  if (!all.length) return { text, count: 0 }
  let out = '', last = 0
  for (const i of all) { out += text.slice(last, i) + rep; last = i + q.length }
  return { text: out + text.slice(last), count: all.length }
}

// ── 보기 설정 ──
export interface Settings { fontSize: number; mono: boolean; wrap: boolean }
export const DEFAULT_SETTINGS: Settings = { fontSize: 16, mono: false, wrap: true }
export const FONT_SIZES = [14, 16, 18, 20, 24]

export function parseSettings(raw: string | null): Settings {
  try {
    const o = JSON.parse(raw ?? '{}') as Partial<Settings>
    return {
      fontSize: FONT_SIZES.includes(o.fontSize as number) ? (o.fontSize as number) : DEFAULT_SETTINGS.fontSize,
      mono: typeof o.mono === 'boolean' ? o.mono : DEFAULT_SETTINGS.mono,
      wrap: typeof o.wrap === 'boolean' ? o.wrap : DEFAULT_SETTINGS.wrap,
    }
  } catch { return DEFAULT_SETTINGS }
}
