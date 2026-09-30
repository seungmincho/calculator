// 글자수 세기 순수 로직. 회귀 체크: node scripts/check-char-count.ts

/** \r\n, \r → \n (붙여넣기·Windows 줄바꿈 통일) */
export const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, '\n')

let seg: Intl.Segmenter | null | undefined
/** 사용자가 보는 글자 단위(grapheme). 이모지 ZWJ 조합·결합 문자·국기 = 1글자 */
export function graphemes(s: string): string[] {
  if (seg === undefined) seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null
  if (!seg) return Array.from(s) // ponytail: 구형 브라우저는 코드포인트 단위(조합 이모지 과대계산)
  return Array.from(seg.segment(s), x => x.segment)
}

const isSpace = (g: string) => /^\s+$/u.test(g)

/**
 * 잡코리아·사람인 글자수 세기와 동일한 바이트 규칙(2026-10 두 사이트 JS 확인):
 * UTF-16 코드 유닛마다 U+0080 이상이면 2byte, ASCII(공백·줄바꿈 포함)는 1byte.
 * 한글·한자 2byte, 이모지(서로게이트 2유닛) 4byte.
 */
export function bytesKr(s: string): number {
  let b = 0
  for (let i = 0; i < s.length; i++) b += s.charCodeAt(i) < 0x80 ? 1 : 2
  return b
}

export const bytesUtf8 = (s: string) => new TextEncoder().encode(s).length

/** 잡코리아·사람인 방식 글자수 = JS length (이모지 1개가 2자로 잡힘) */
export const siteLength = (s: string) => s.length

const hasWordChar = (w: string) => /[\p{L}\p{N}]/u.test(w)

export const countWords = (s: string) => s.split(/\s+/).filter(hasWordChar).length

/** 문장: 문장부호(. ! ? … 。) 뒤 공백/끝 또는 줄바꿈으로 나눔. 3.14·URL의 점은 안 끊김 */
export const countSentences = (s: string) =>
  s.split(/(?<=[.!?…。！？])\s+|\n+/).filter(hasWordChar).length

/** 문단: 빈 줄로 구분된 덩어리 */
export const countParagraphs = (s: string) => s.split(/\n\s*\n/).filter(p => p.trim()).length

export const countLines = (s: string) => (s ? s.split('\n').length : 0)

/**
 * 200자 원고지(20칸×10줄) 간이 계산.
 * 규칙: 줄바꿈마다 새 문단 → 첫 칸 들여쓰기 1칸, 이후 글자·공백 1칸씩,
 * 영문 소문자·숫자는 연속된 두 자를 한 칸, 빈 줄은 건너뜀.
 * ponytail: 줄 첫머리 공백 생략·문장부호 끝칸 붙이기 등 세부 규칙은 무시(±몇 칸)
 */
export function manuscript(s: string) {
  let rows = 0
  for (const line of s.split('\n')) {
    if (!line.trim()) continue
    let cells = 1
    let run = 0
    for (const g of graphemes(line.trim())) {
      if (/^[a-z0-9]$/.test(g)) { run++; continue }
      cells += Math.ceil(run / 2) + 1
      run = 0
    }
    cells += Math.ceil(run / 2)
    rows += Math.ceil(cells / 20)
  }
  return { rows, sheets: rows / 10, pages: Math.ceil(rows / 10) }
}

/**
 * 읽기·말하기 예상 시간(초). 추정치:
 * 한글 등 비ASCII 글자(공백 제외) 묵독 분당 500자 / 발표 분당 250자(≈공백 포함 300자),
 * 영어 단어 묵독 238wpm(Brysbaert 2019) / 발표 150wpm.
 */
export const READ_KO = 500, SPEAK_KO = 250, READ_EN = 238, SPEAK_EN = 150
export function durations(s: string) {
  const ko = graphemes(s).filter(g => !isSpace(g) && /[^\x00-\x7f]/.test(g)).length
  const en = s.split(/\s+/).filter(w => /^[\x21-\x7e]+$/.test(w) && /[A-Za-z0-9]/.test(w)).length
  return {
    readSec: Math.round((ko / READ_KO + en / READ_EN) * 60),
    speakSec: Math.round((ko / SPEAK_KO + en / SPEAK_EN) * 60),
  }
}

/**
 * X(트위터) 가중 글자수 — twitter-text config v3:
 * NFC 정규화, URL 1개 = 23, 이모지(조합 포함) 1개 = 2,
 * U+0000–10FF·U+2000–200D·U+2010–201F·U+2032–2037 = 1, 그 외(한글·CJK 등) = 2. 한도 280.
 * ponytail: URL은 http(s):// 로 시작하는 것만 인식(도메인만 쓴 링크는 글자 그대로 셈)
 */
const X_LIGHT: [number, number][] = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]]
export const X_LIMIT = 280
export function xLength(text: string): number {
  let n = 0
  const s = text.normalize('NFC').replace(/https?:\/\/\S+/g, () => { n += 23; return '' })
  for (const g of graphemes(s)) {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) { n += 2; continue }
    for (const ch of g) {
      const cp = ch.codePointAt(0)!
      n += X_LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2
    }
  }
  return n
}

export interface Stats {
  chars: number; charsNoSpace: number
  siteChars: number; siteCharsNoSpace: number
  bytesKr: number; bytesKrNoSpace: number; bytesUtf8: number
  words: number; sentences: number; paragraphs: number; lines: number
  manuscript: ReturnType<typeof manuscript>
  readSec: number; speakSec: number
  x: number
}

export function analyze(raw: string): Stats {
  const s = normalizeNewlines(raw)
  const g = graphemes(s)
  const noSpace = s.replace(/\s/g, '')
  return {
    chars: g.length,
    charsNoSpace: g.filter(x => !isSpace(x)).length,
    siteChars: siteLength(s),
    siteCharsNoSpace: siteLength(noSpace),
    bytesKr: bytesKr(s),
    bytesKrNoSpace: bytesKr(noSpace),
    bytesUtf8: bytesUtf8(s),
    words: countWords(s),
    sentences: countSentences(s),
    paragraphs: countParagraphs(s),
    lines: countLines(s),
    manuscript: manuscript(s),
    ...durations(s),
    x: xLength(s),
  }
}

// ── 목표 글자수 ──
export type Basis = 'chars' | 'charsNoSpace' | 'bytesKr' | 'x'
export const measure = (st: Stats, basis: Basis) =>
  basis === 'chars' ? st.chars : basis === 'charsNoSpace' ? st.charsNoSpace : basis === 'bytesKr' ? st.bytesKr : st.x

/** 공식 문서로 확인된 한도만. SMS/LMS는 국내 이통사 표준 90/2,000byte(한글 2byte) */
export const PRESETS: { id: string; limit: number; basis: Basis }[] = [
  { id: 'essay500', limit: 500, basis: 'chars' },
  { id: 'essay1000', limit: 1000, basis: 'chars' },
  { id: 'essay1500', limit: 1500, basis: 'chars' },
  { id: 'x', limit: X_LIMIT, basis: 'x' },
  { id: 'threads', limit: 500, basis: 'chars' },
  { id: 'instagram', limit: 2200, basis: 'chars' },
  { id: 'instagramBio', limit: 150, basis: 'chars' },
  { id: 'youtubeTitle', limit: 100, basis: 'chars' },
  { id: 'youtubeDesc', limit: 5000, basis: 'chars' },
  { id: 'sms', limit: 90, basis: 'bytesKr' },
  { id: 'lms', limit: 2000, basis: 'bytesKr' },
]

// ── 텍스트 정리 ──
/** 줄 앞뒤 공백 제거 + 3줄 이상 빈 줄 → 1줄 + 전체 trim */
export const tidy = (s: string) =>
  normalizeNewlines(s).split('\n').map(l => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
/** 연속 공백(탭·전각 공백·NBSP 포함) → 공백 1개 */
export const collapseSpaces = (s: string) => s.replace(/[ \t 　]{2,}/g, ' ')
/** 줄바꿈 제거(PDF 복사 줄끊김 복구) — 빈 줄(문단)은 유지 */
export const joinLines = (s: string) =>
  normalizeNewlines(s).split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).join('\n\n')
/** 특수문자 제거: 글자·숫자·공백·기본 문장부호만 남김 (이모지 포함 제거) */
export const stripSpecial = (s: string) => s.replace(/[^\p{L}\p{N}\p{M}\s.,!?'"()\-·%~:;/]/gu, '')

// ── 자주 쓴 단어 ──
// ponytail: 간이 조사 떼기(긴 것 우선). 형태소 분석기 수준은 아님
const JOSA = ['에서는', '으로는', '에게서', '까지', '부터', '에서', '에게', '께서', '으로', '처럼', '보다', '이라', '라는', '이다', '했다', '하는', '하고', '하며', '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '도', '만']
export function stem(w: string): string {
  if (!/^\p{Script=Hangul}+$/u.test(w)) return w.toLowerCase()
  for (const j of JOSA) if (w.length > j.length + 1 && w.endsWith(j)) return w.slice(0, -j.length)
  return w
}

export function topWords(s: string, n = 10): { word: string; count: number }[] {
  const m = new Map<string, number>()
  for (const tok of s.split(/\s+/)) {
    const w = stem(tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    if ([...w].length < 2) continue
    m.set(w, (m.get(w) ?? 0) + 1)
  }
  return [...m].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([word, count]) => ({ word, count }))
}

/** 하이라이트용 분할: 단어 목록(부분 일치)으로 텍스트를 [일반, 강조, 일반…] 조각으로 */
export function splitHighlights(s: string, words: string[]): { text: string; hit: boolean }[] {
  const ws = words.map(w => w.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!ws.length) return [{ text: s, hit: false }]
  const re = new RegExp(`(${ws.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return s.split(re).filter(Boolean).map(text => ({ text, hit: ws.some(w => w.toLowerCase() === text.toLowerCase()) }))
}

export const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60), r = sec % 60
  return { m, s: r }
}
