// 텍스트 변환 순수 로직. 회귀 체크: node scripts/check-text-convert.ts
import { normalizeNewlines, collapseSpaces, graphemes } from './charCount.ts'

// ── 케이스 변환 ──

export const CASE_IDS = ['upper', 'lower', 'title', 'sentence', 'camel', 'pascal', 'snake', 'screaming', 'kebab', 'train', 'dot', 'path'] as const
export type CaseId = (typeof CASE_IDS)[number]

/**
 * 식별자용 단어 분리. 약어·숫자 경계를 지킴:
 * XMLHttpRequest2Parser → XML Http Request2 Parser, HTML5Parser → HTML5 Parser.
 * 숫자는 앞 단어에 붙고(request2), 한글 등 대소문자 없는 문자는 라틴과 경계에서 나뉨.
 */
const WORD_RE = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+\p{N}*|\p{Lu}+\p{N}*|\p{N}+\p{Ll}*|[\p{Lo}\p{Lm}\p{Lt}]+\p{N}*/gu

export function splitWords(s: string): string[] {
  const clean = s.normalize('NFC').replace(/(\p{L})['’](\p{L})/gu, '$1$2') // don't → dont
  return clean.match(WORD_RE) ?? []
}

const lower = (w: string) => w.toLocaleLowerCase('en')
const cap = (w: string) => w.replace(/^\p{L}/u, c => c.toLocaleUpperCase('en'))

// 영어 제목 규칙(AP/Chicago 공통): 첫·끝 단어가 아니면 소문자
const SMALL = new Set('a an the and but or nor for so yet as at by in of off on per to up via vs en if'.split(' '))
const TEXT_WORD_RE = /[\p{L}\p{N}]+(?:['’]\p{L}+)*/gu

/** 대문자 단어가 과반이면 '소리치는' 줄(HELLO WORLD) → 약어 보존 안 함 */
function shouting(line: string): boolean {
  const words = line.match(TEXT_WORD_RE) ?? []
  return words.filter(w => /\p{Lu}/u.test(w) && !/\p{Ll}/u.test(w)).length * 2 > words.length
}
/** 대문자가 둘째 글자 이후에 있으면 약어/고유 표기(NASA, iPhone)로 보고 보존 */
const keepAsIs = (w: string, allCaps: boolean) => !allCaps && /\p{Lu}/u.test(w.slice(1))

function titleLine(line: string): string {
  const allCaps = shouting(line)
  const n = line.match(TEXT_WORD_RE)?.length ?? 0
  let i = 0
  return line.replace(TEXT_WORD_RE, w => {
    const idx = i++
    if (keepAsIs(w, allCaps)) return w
    const lw = lower(w)
    return idx > 0 && idx < n - 1 && SMALL.has(lw) ? lw : cap(lw)
  })
}

function sentenceLine(line: string): string {
  const allCaps = shouting(line)
  return line
    .replace(TEXT_WORD_RE, w => (keepAsIs(w, allCaps) ? w : lower(w)))
    .replace(/(^[\s"'“‘(]*|[.!?…]\s+)(\p{Ll})/gu, (_, p: string, c: string) => p + c.toLocaleUpperCase('en'))
    .replace(/(?<![\p{L}\p{N}])i(?![\p{L}\p{N}])/gu, 'I')
}

const joinWords = (line: string, sep: string, f: (w: string, i: number) => string) => splitWords(line).map(f).join(sep)

const LINE_CASE: Record<Exclude<CaseId, 'upper' | 'lower'>, (line: string) => string> = {
  title: titleLine,
  sentence: sentenceLine,
  camel: l => joinWords(l, '', (w, i) => (i ? cap(lower(w)) : lower(w))),
  pascal: l => joinWords(l, '', w => cap(lower(w))),
  snake: l => joinWords(l, '_', lower),
  screaming: l => joinWords(l, '_', w => w.toLocaleUpperCase('en')),
  kebab: l => joinWords(l, '-', lower),
  train: l => joinWords(l, '-', w => cap(lower(w))),
  dot: l => joinWords(l, '.', lower),
  path: l => joinWords(l, '/', lower),
}

/** 케이스 변환. 여러 줄이면 줄마다 따로 변환(식별자 목록 일괄 변환) */
export function toCase(text: string, id: CaseId): string {
  if (id === 'upper') return text.toLocaleUpperCase('en')
  if (id === 'lower') return text.toLocaleLowerCase('en')
  return normalizeNewlines(text).split('\n').map(LINE_CASE[id]).join('\n')
}

// ── 줄·공백·문자 단계 ──

export const LINE_OPS = ['sortAsc', 'sortDesc', 'sortLength', 'reverseLines', 'shuffle', 'dedupe', 'removeEmpty', 'trimLines', 'numberLines'] as const
export const SPACE_OPS = ['collapseSpaces', 'joinLines', 'spaceToLines', 'commaToLines', 'tabsToSpaces', 'spacesToTabs', 'removeSpaces'] as const
export const CHAR_OPS = ['toHalf', 'toFull', 'reverseText'] as const
export const LIST_PRESETS = ['sqlIn', 'jsArray', 'json', 'comma'] as const

export type SimpleOp = CaseId | (typeof LINE_OPS)[number] | (typeof SPACE_OPS)[number] | (typeof CHAR_OPS)[number]
export type ListPreset = (typeof LIST_PRESETS)[number]
export type Step =
  | { op: SimpleOp; seed?: number }
  | { op: 'replace'; find: string; repl: string; regex: boolean; flags: string }
  | { op: 'affix'; prefix: string; suffix: string }
  | { op: 'list'; preset: ListPreset }

const SIMPLE = new Set<string>([...CASE_IDS, ...LINE_OPS, ...SPACE_OPS, ...CHAR_OPS])

const natural = new Intl.Collator('ko', { numeric: true })
const lines = (s: string) => s.split('\n')

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr], rnd = mulberry32(seed)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 전각(Ｆｕｌｌ)↔반각. U+FF01–FF5E ↔ U+0021–007E, 전각 공백 U+3000 ↔ 공백 */
export const toHalf = (s: string) =>
  s.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ')
export const toFull = (s: string) =>
  s.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/ /g, '　')

function simple(text: string, op: SimpleOp, seed = 1): string {
  if ((CASE_IDS as readonly string[]).includes(op)) return toCase(text, op as CaseId)
  switch (op) {
    case 'sortAsc': return lines(text).sort(natural.compare).join('\n')
    case 'sortDesc': return lines(text).sort((a, b) => natural.compare(b, a)).join('\n')
    case 'sortLength': return lines(text).sort((a, b) => graphemes(a).length - graphemes(b).length).join('\n')
    case 'reverseLines': return lines(text).reverse().join('\n')
    case 'shuffle': return shuffle(lines(text), seed).join('\n')
    case 'dedupe': return [...new Set(lines(text))].join('\n')
    case 'removeEmpty': return lines(text).filter(l => l.trim()).join('\n')
    case 'trimLines': return lines(text).map(l => l.trim()).join('\n')
    case 'numberLines': return lines(text).map((l, i) => `${i + 1}. ${l}`).join('\n')
    case 'collapseSpaces': return collapseSpaces(text)
    case 'joinLines': return text.replace(/[^\S\n]*\n+[^\S\n]*/g, ' ')
    case 'spaceToLines': return text.split(/\s+/).filter(Boolean).join('\n')
    case 'commaToLines': return text.split(/\s*[,\n]\s*/).filter(Boolean).join('\n')
    case 'tabsToSpaces': return text.replace(/\t/g, '    ')
    case 'spacesToTabs': return text.replace(/ {4}/g, '\t')
    case 'removeSpaces': return text.replace(/[^\S\n]+/g, '')
    case 'toHalf': return toHalf(text)
    case 'toFull': return toFull(text)
    case 'reverseText': return graphemes(text).reverse().join('')
  }
  return text
}

/** 정규식 단계 입력 상한 — 동기 실행이라 재앙적 백트래킹을 끊을 수 없어 크기로 제한 */
export const REGEX_MAX = 100_000
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function replace(text: string, s: Extract<Step, { op: 'replace' }>): string {
  if (!s.find) return text
  if (s.regex && text.length > REGEX_MAX) throw new Error('tooLong')
  const flags = 'g' + [...new Set(s.flags)].filter(f => (s.regex ? 'ims' : 'i').includes(f)).join('')
  let re: RegExp
  try { re = new RegExp(s.regex ? s.find : escapeRe(s.find), flags) } catch { throw new Error('badRegex') }
  if (!s.regex) return text.replace(re, () => s.repl)
  return text.replace(re, s.repl.replace(/\\n/g, '\n').replace(/\\t/g, '\t'))
}

const isNum = (s: string) => /^-?(0|[1-9]\d*)(\.\d+)?$/.test(s) // 01234처럼 0으로 시작하면 문자열 취급

/** 줄 목록 → SQL IN / JS 배열 / JSON / 쉼표 목록. 빈 줄 제외, 전부 숫자면 따옴표 없이 */
export function toList(text: string, preset: ListPreset): string {
  const items = lines(text).map(l => l.trim()).filter(Boolean)
  const nums = items.length > 0 && items.every(isNum)
  const q = (f: (s: string) => string) => items.map(s => (nums ? s : f(s))).join(', ')
  switch (preset) {
    case 'sqlIn': return `(${q(s => `'${s.replace(/'/g, "''")}'`)})`
    case 'jsArray': return `[${q(s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)}]`
    case 'json': return `[${q(s => JSON.stringify(s))}]`
    case 'comma': return items.join(', ')
  }
}

export function applyStep(text: string, step: Step): string {
  switch (step.op) {
    case 'replace': return replace(text, step)
    case 'affix': return lines(text).map(l => (l.trim() ? step.prefix + l + step.suffix : l)).join('\n')
    case 'list': return toList(text, step.preset)
    default: return simple(text, step.op, step.seed)
  }
}

/** 단계를 순서대로 적용. 실패한 단계는 건너뛰고 오류 코드('badRegex'|'tooLong')를 남김 */
export function runPipeline(input: string, steps: Step[]): { text: string; errors: (string | null)[] } {
  let text = normalizeNewlines(input)
  const errors = steps.map(step => {
    try { text = applyStep(text, step); return null } catch (e) { return e instanceof Error ? e.message : 'error' }
  })
  return { text, errors }
}

// ── URL 직렬화 (입력 텍스트·찾기/앞뒤 문자열은 넣지 않음) ──

export const encodeSteps = (steps: Step[]) =>
  steps.flatMap(s => (s.op === 'list' ? [`list-${s.preset}`] : SIMPLE.has(s.op) ? [s.op] : [])).join(',')

export function decodeSteps(param: string | null, seed = 1): Step[] {
  if (!param) return []
  return param.split(',').flatMap((id, i): Step[] => {
    if (id.startsWith('list-')) {
      const p = id.slice(5) as ListPreset
      return LIST_PRESETS.includes(p) ? [{ op: 'list', preset: p }] : []
    }
    if (!SIMPLE.has(id)) return []
    return [id === 'shuffle' ? { op: 'shuffle', seed: seed + i } : { op: id as SimpleOp }]
  })
}
