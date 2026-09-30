// 텍스트 읽어주기(TTS) 순수 로직. 회귀 체크: node scripts/check-tts.ts
// (node 타입 스트리핑으로 실행되므로 enum 등 비소거 문법 금지)

export interface Segment { text: string; start: number; end: number }

// 문장 끝: 마침표·물음표·느낌표·말줄임 뒤에 공백·끝·한글이 오면 경계(3.14처럼 숫자가 오면 아님).
// 닫는 따옴표/괄호가 붙으면 공백·끝일 때만 경계("좋아요!"라고 → 안 끊음). 줄바꿈도 경계.
const BOUNDARY = /[.!?。！？…]+(?:["'”’」』)\]]+(?=\s|$)|(?=\s|$|[가-힣]))|\n+/g

/** 원문 오프셋을 유지한 채 문장 단위로 나눈다. 공백·기호만 있는 조각은 버린다. */
export function splitSentences(text: string): Segment[] {
  const out: Segment[] = []
  let from = 0
  const push = (a: number, b: number) => {
    while (a < b && /\s/.test(text[a])) a++
    while (b > a && /\s/.test(text[b - 1])) b--
    if (a < b && /[\p{L}\p{N}]/u.test(text.slice(a, b))) out.push({ text: text.slice(a, b), start: a, end: b })
  }
  for (const m of text.matchAll(BOUNDARY)) {
    const end = m.index! + m[0].length
    push(from, end)
    from = end
  }
  push(from, text.length)
  return out
}

/** max자를 넘는 문장을 쉼표 → 공백 순으로 끊어 max 이하 조각으로 만든다(오프셋 유지). */
export function splitLong(seg: Segment, max: number): Segment[] {
  const out: Segment[] = []
  let { start } = seg
  const { end } = seg
  while (end - start > max) {
    const win = seg.text.slice(start - seg.start, start - seg.start + max)
    let cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('，'), win.lastIndexOf('、'))
    cut = cut > max * 0.4 ? cut + 1 : win.lastIndexOf(' ')
    if (cut <= 0) cut = max
    let next = start + cut
    out.push(trim({ start, end: next }))
    while (next < end && /\s/.test(seg.text[next - seg.start])) next++
    start = next
  }
  if (start < end) out.push(trim({ start, end }))
  return out

  function trim(r: { start: number; end: number }): Segment {
    let b = r.end
    while (b > r.start && /\s/.test(seg.text[b - 1 - seg.start])) b--
    return { text: seg.text.slice(r.start - seg.start, b - seg.start), start: r.start, end: b }
  }
}

/** 재생 단위: 문장 분리 후 긴 문장은 max자 이하로. Chrome 원격 음성은 ~15초 넘는 발화를 끊는다. */
export function chunkText(text: string, max = 140): Segment[] {
  return splitSentences(text).flatMap((s) => (s.text.length > max ? splitLong(s, max) : [s]))
}

// ponytail: 글자 수 기반 추정(한글 약 6.5음절/초, 영어 약 160단어/분, 문장 사이 0.35초). 음성마다 ±20% 오차.
export function estimateSeconds(text: string, rate = 1): number {
  const hangul = (text.match(/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? []).length
  const digits = (text.match(/\d/g) ?? []).length
  const words = (text.replace(/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\d]/gu, ' ').match(/[\p{L}]+/gu) ?? []).length
  const pauses = splitSentences(text).length
  const sec = hangul / 6.5 + (digits * 1.5) / 6.5 + words / 2.7 + pauses * 0.35
  return sec / Math.max(rate, 0.1)
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** PDF·웹에서 복사한 글 정리: 줄 안의 줄바꿈은 공백으로, 빈 줄(문단)은 하나로, 연속 공백은 하나로. */
export function tidyText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\u0000')
    .replace(/\n/g, ' ')
    .replace(/\u0000/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim()
}

/** boundary 이벤트의 charIndex(+charLength)로 단어 범위. charLength가 없으면 다음 공백까지. */
export function wordRange(s: string, charIndex: number, charLength?: number): [number, number] {
  if (charLength && charLength > 0) return [charIndex, charIndex + charLength]
  const m = /^\S+/.exec(s.slice(charIndex))
  return [charIndex, charIndex + (m ? m[0].length : 0)]
}

export interface VoiceLike { name: string; lang: string; localService?: boolean; default?: boolean }

const isKo = (v: VoiceLike) => /^ko\b|^ko[-_]/i.test(v.lang)
// 자연스러운 음성 우선: Edge 온라인 Natural/Neural > Google > 나머지
const quality = (v: VoiceLike) => (/natural|neural|online/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2)

/** 한국어 음성 먼저(품질순), 그다음 언어·이름순. */
export function sortVoices<T extends VoiceLike>(voices: T[]): T[] {
  return [...voices].sort((a, b) =>
    Number(isKo(b)) - Number(isKo(a)) ||
    (isKo(a) ? quality(a) - quality(b) : 0) ||
    a.lang.localeCompare(b.lang) ||
    a.name.localeCompare(b.name))
}

export function isKoreanVoice(v: VoiceLike): boolean { return isKo(v) }

/** 저장된 이름이 있으면 그 음성, 없으면 정렬상 첫 한국어 음성, 그것도 없으면 기본 음성. */
export function pickVoice<T extends VoiceLike>(voices: T[], saved?: string | null): T | null {
  if (!voices.length) return null
  return voices.find((v) => v.name === saved) ?? sortVoices(voices).find(isKo) ?? voices.find((v) => v.default) ?? voices[0]
}

export const URL_TEXT_LIMIT = 1500

export type Platform = 'windows' | 'mac' | 'ios' | 'android' | 'other'
export function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/windows/i.test(ua)) return 'windows'
  if (/mac os/i.test(ua)) return 'mac'
  return 'other'
}
