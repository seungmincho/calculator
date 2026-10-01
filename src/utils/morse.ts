/** 모스부호: 국제(ITU-R M.1677) + 한글(SKATS 자모) 변환 · 타이밍(PARIS/Farnsworth) · WAV. 검증: node scripts/check-morse.ts */
import { decompose, CHO, JUNG, JONG } from './koreanSyllable.ts'

export const LETTERS: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
}
export const DIGITS: Record<string, string> = {
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
}
/** ITU 문장부호 + 관용(! $ ; _) */
export const PUNCT: Record<string, string> = {
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.',
}
export const INTL: Record<string, string> = { ...LETTERS, ...DIGITS, ...PUNCT }
/** 프로사인(글자 사이 간격 없이 붙여 보냄). AR=+, AS=&, BT==, KN=( 와 부호가 같음 */
export const PROSIGNS: Record<string, string> = {
  AR: '.-.-.', AS: '.-...', BT: '-...-', KN: '-.--.', SK: '...-.-', SOS: '...---...', HH: '........',
}

/** 한글 모스부호(SKATS) — 자음 14 · 모음 12 */
export const KO_CONS: Record<string, string> = {
  ㄱ: '.-..', ㄴ: '..-.', ㄷ: '-...', ㄹ: '...-', ㅁ: '--', ㅂ: '.--', ㅅ: '--.',
  ㅇ: '-.-', ㅈ: '.--.', ㅊ: '-.-.', ㅋ: '-..-', ㅌ: '--..', ㅍ: '---', ㅎ: '.---',
}
export const KO_VOWEL: Record<string, string> = {
  ㅏ: '.', ㅑ: '..', ㅓ: '-', ㅕ: '...', ㅗ: '.-', ㅛ: '-.', ㅜ: '....', ㅠ: '.-.', ㅡ: '-..', ㅣ: '..-', ㅐ: '--.-', ㅔ: '-.--',
}
export const KO: Record<string, string> = { ...KO_CONS, ...KO_VOWEL }

/** 표에 없는 자모는 두 부호로: 된소리=같은 자음 2번, 겹모음·겹받침=구성 자모 */
export const KO_SPLIT: Record<string, string> = {
  ㄲ: 'ㄱㄱ', ㄸ: 'ㄷㄷ', ㅃ: 'ㅂㅂ', ㅆ: 'ㅅㅅ', ㅉ: 'ㅈㅈ',
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
  ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ', ㅒ: 'ㅑㅣ', ㅖ: 'ㅕㅣ',
}
const JOIN: Record<string, string> = Object.fromEntries(Object.entries(KO_SPLIT).map(([k, v]) => [v, k]))
const isCons = (j: string) => j >= 'ㄱ' && j <= 'ㅎ'
const isVowel = (j: string) => j >= 'ㅏ' && j <= 'ㅣ'
const isJamo = (j: string) => isCons(j) || isVowel(j)

/** 텍스트 → 기본 자모(한글) / 대문자(그 외) 낱개. 연습 채점·인코딩 공용 */
export function explode(text: string): string[] {
  const out: string[] = []
  for (const ch of text.normalize('NFC')) {
    const d = decompose(ch)
    const parts = d ? [d.cho, d.jung, d.jong] : [ch]
    for (const p of parts) for (const q of (KO_SPLIT[p] ?? p)) if (q) out.push(q.toUpperCase())
  }
  return out
}

export interface Token { ch: string; code: string } // code '/' = 단어 간격
export type Alphabet = 'en' | 'ko'

export function encode(text: string): { tokens: Token[]; unsupported: string[] } {
  const tokens: Token[] = []
  const bad = new Set<string>()
  for (const m of text.normalize('NFC').matchAll(/<([a-z]{2,3})>|\s+|[\s\S]/giu)) {
    if (/^\s/.test(m[0])) {
      if (tokens.length && tokens[tokens.length - 1].code !== '/') tokens.push({ ch: ' ', code: '/' })
      continue
    }
    const pro = m[1] && PROSIGNS[m[1].toUpperCase()]
    if (pro) { tokens.push({ ch: `<${m[1].toUpperCase()}>`, code: pro }); continue }
    for (const u of explode(m[0])) {
      const code = KO[u] ?? INTL[u]
      if (code) tokens.push({ ch: u, code })
      else bad.add(u)
    }
  }
  if (tokens[tokens.length - 1]?.code === '/') tokens.pop()
  return { tokens, unsupported: [...bad] }
}

export const toMorse = (tokens: Token[]) => tokens.map((t) => t.code).join(' ')

const REV_INTL = Object.fromEntries(Object.entries(INTL).map(([k, v]) => [v, k]))
const REV_KO = Object.fromEntries(Object.entries(KO).map(([k, v]) => [v, k]))
// AR/AS/BT/KN은 문장부호와 부호가 같아 문장부호로 읽음
const REV_PRO: Record<string, string> = { '...-.-': '<SK>', '...---...': '<SOS>', '........': '<HH>' }
export const UNKNOWN = '□'

/** 모스 문자열 → 토큰. 점: . · • / 선: - − – — ─ _ / 글자: 공백 / 단어: '/' 또는 '|' 또는 줄바꿈·공백 3칸 이상 */
export function parseMorse(morse: string, alphabet: Alphabet): Token[] {
  const norm = morse.replace(/[·•∙⋅]/g, '.').replace(/[−–—─_‒]/g, '-')
  const tokens: Token[] = []
  for (const word of norm.split(/\s*[/|]\s*|\s*\n\s*|\s{3,}/)) {
    const codes = word.trim().split(/\s+/).filter(Boolean)
    if (!codes.length) continue
    if (tokens.length) tokens.push({ ch: ' ', code: '/' })
    for (const c of codes) {
      const clean = /^[.-]+$/.test(c)
      const ch = clean ? (alphabet === 'ko' ? REV_KO[c] : undefined) ?? REV_INTL[c] ?? REV_PRO[c] : undefined
      tokens.push({ ch: ch ?? UNKNOWN, code: clean ? c : '' })
    }
  }
  return tokens
}

const syllable = (cho: string, jung: string, jong: string) =>
  String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong))
const jongOf = (p: string[]): string | undefined =>
  p.length === 0 ? '' : p.length === 1 ? (JONG.includes(p[0]) ? p[0] : undefined)
    : p.length === 2 ? (JONG.includes(JOIN[p.join('')] ?? '') ? JOIN[p.join('')] : undefined) : undefined

/**
 * 기본 자모 나열 → 완성형. SKATS는 음절 경계가 없어 본질적으로 모호 → 받침 우선(먹고·받다·있습니다),
 * 단 ㅂㅂ은 ㅃ(아빠·오빠), ㄳ·ㄽ 받침이 되는 경우는 된소리(박씨·훨씬).
 * ponytail: 빈도 휴리스틱. "아까"는 "악가"로 읽힘 — 사전 기반 판정이 필요하면 그때.
 */
export function composeHangul(seq: string[]): string {
  const a: string[] = []
  for (const j of seq) {
    const p = a[a.length - 1]
    const m = p && isVowel(p) && isVowel(j) ? JOIN[p + j] : undefined
    if (m) a[a.length - 1] = m
    else a.push(j)
  }
  let out = ''
  let pend: { cho: string; jung: string } | null = null
  let run: string[] = []
  const close = (jongPart: string[]) => {
    const jong = pend ? jongOf(jongPart) : jongPart.length ? undefined : ''
    if (pend) out += syllable(pend.cho, pend.jung, jong ?? '')
    if (jong === undefined) out += jongPart.join('')
    pend = null
  }
  for (let k = 0; k <= a.length; k++) {
    const j = a[k]
    if (j !== undefined && isCons(j)) { run.push(j); continue }
    if (j !== undefined && isVowel(j) && run.length) {
      const n = run.length
      const A = { cho: run[n - 1], rest: run.slice(0, n - 1) }
      const dbl = n >= 2 && run[n - 2] === run[n - 1] ? JOIN[run[n - 2] + run[n - 1]] : undefined
      const B = dbl && CHO.includes(dbl) ? { cho: dbl, rest: run.slice(0, n - 2) } : undefined
      const ok = (c?: { rest: string[] }) => !!c && (pend ? jongOf(c.rest) !== undefined : c.rest.length === 0)
      const aJong = pend ? jongOf(A.rest) : undefined
      const preferB: boolean = (n === 2 && run[0] === 'ㅂ' && !!pend) || aJong === 'ㄳ' || aJong === 'ㄽ'
      const pick: { cho: string; rest: string[] } = (preferB ? [B, A] : [A, B]).find(ok) ?? B ?? A
      close(pick.rest)
      pend = { cho: pick.cho, jung: j }
    } else {
      close(run)
      if (j !== undefined) out += j
    }
    run = []
  }
  return out
}

/** 토큰 → 텍스트. 한글이면 단어마다 자모를 음절로 조합 */
export function tokensToText(tokens: Token[], alphabet: Alphabet): string {
  const s = tokens.map((t) => t.ch)
  if (alphabet !== 'ko') return s.join('')
  let out = ''
  let buf: string[] = []
  for (const ch of [...s, ' ']) {
    if (ch.length === 1 && isJamo(ch)) { buf.push(ch); continue }
    if (buf.length) out += composeHangul(buf)
    buf = []
    out += ch
  }
  return out.slice(0, -1)
}

export const hasHangul = (s: string) => /[가-힣ㄱ-ㅣ]/.test(s)

/* ── 타이밍 ── */
export interface Timing { unit: number; charGap: number; wordGap: number }

/** PARIS 기준 1단위 = 1.2/WPM 초. Farnsworth(ARRL): 글자는 wpm, 글자·단어 간격만 늘려 실효 속도 fwpm */
export function timing(wpm: number, fwpm = wpm): Timing {
  const c = wpm, f = Math.min(fwpm, wpm), unit = 1.2 / c
  if (f >= c) return { unit, charGap: 3 * unit, wordGap: 7 * unit }
  const ta = (60 * c - 37.2 * f) / (c * f)
  return { unit, charGap: (3 * ta) / 19, wordGap: (7 * ta) / 19 }
}

export interface Schedule { on: [number, number][]; starts: number[]; total: number }

export function schedule(tokens: Token[], tm: Timing): Schedule {
  const on: [number, number][] = []
  const starts: number[] = []
  let t = 0
  for (const tok of tokens) {
    starts.push(t)
    if (tok.code === '/') { t += tm.wordGap - tm.charGap; continue }
    if (!tok.code) continue
    ;[...tok.code].forEach((s, k) => {
      if (k) t += tm.unit
      const d = s === '.' ? tm.unit : 3 * tm.unit
      on.push([t, d])
      t += d
    })
    t += tm.charGap
  }
  return { on, starts, total: t }
}

/** navigator.vibrate 패턴(ms): [켜짐, 꺼짐, 켜짐 …] */
export function vibratePattern(s: Schedule): number[] {
  const p: number[] = []
  let end = 0
  s.on.forEach(([st, d], i) => {
    if (i) p.push(Math.round((st - end) * 1000))
    p.push(Math.round(d * 1000))
    end = st + d
  })
  return p
}

/** 16bit mono PCM WAV. 5ms 램프로 클릭음 제거 */
export function wav(s: Schedule, freq: number, rate = 22050): ArrayBuffer {
  const n = Math.ceil((s.total + 0.05) * rate)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const str = (o: number, x: string) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  const ramp = 0.005 * rate
  for (const [st, d] of s.on) {
    const a = Math.round(st * rate), len = Math.round(d * rate)
    for (let k = 0; k < len && a + k < n; k++) {
      const env = Math.min(1, k / ramp, (len - k) / ramp)
      v.setInt16(44 + (a + k) * 2, Math.round(Math.sin((2 * Math.PI * freq * (a + k)) / rate) * env * 0.5 * 32767), true)
    }
  }
  return buf
}

/* ── 듣기 연습 ── */
/** Koch 방식 학습 순서 (G4FON) */
export const KOCH_EN = [...'KMRSUAPTLOWI.NJEF0Y,VG5/Q9ZH38B?427C1D6X']
/** 한글: 자음·모음 번갈아 */
export const KOCH_KO = Object.keys(KO_CONS).flatMap((c, i) => [c, Object.keys(KO_VOWEL)[i]].filter(Boolean))

/** 정답·입력 비교 (공백 무시, 한글은 자모 단위) */
export function grade(answer: string, input: string): { ok: boolean[]; correct: number } {
  const a = explode(answer).filter((c) => c.trim())
  const b = explode(input).filter((c) => c.trim())
  const ok = a.map((c, i) => b[i] === c)
  return { ok, correct: ok.filter(Boolean).length }
}
