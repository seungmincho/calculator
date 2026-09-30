// 텍스트 꾸미기 순수 로직: 유니코드 수학 영숫자·장식 글자·한글 꾸미기·닉네임 테두리
// 회귀 체크: node scripts/check-fancy-text.ts

export type FancyCat = 'bold' | 'script' | 'deco' | 'korean' | 'frame'
/** 플랫폼 주의: combining=결합문자(줄 위치 어긋남), emoji=이모지로 바뀔 수 있음, font=구형 기기 □, reverse=순서 뒤집힘 */
export type FancyNote = 'combining' | 'emoji' | 'font' | 'reverse'

export interface FancyStyle {
  key: string
  cat: FancyCat
  convert: (s: string) => string
  /** 글자 단위 변환기 — 있으면 "영문/숫자 전용" 스타일로 보고 안 바뀐 글자를 찾는 데 쓴다 */
  map?: (c: string) => string
  /** 이 글자를 지원하는지 (기본: map 결과가 달라지면 지원). 대칭 글자(o, x)는 안 바뀌어도 지원 */
  supports?: (c: string) => boolean
  note?: FancyNote
}

const cp = String.fromCodePoint
const perChar = (map: (c: string) => string) => (s: string) => [...s].map(map).join('')

/** 수학 영숫자 블록: 대문자/소문자/숫자 시작 코드포인트 + 빈자리(holes, 기존 문자로 대체된 위치) */
function alnum(upper: number, lower: number, digit?: number, holes: Record<string, number> = {}) {
  return (c: string) => {
    if (holes[c]) return cp(holes[c])
    const k = c.codePointAt(0)!
    if (k >= 65 && k <= 90) return cp(upper + k - 65)
    if (k >= 97 && k <= 122) return cp(lower + k - 97)
    if (digit !== undefined && k >= 48 && k <= 57) return cp(digit + k - 48)
    return c
  }
}

/** from[i] → to[i] 문자 치환표 (코드포인트 단위라 서로게이트 쌍 안전) */
function table(from: string, to: string, lowerFirst = false) {
  const f = [...from], t = [...to]
  if (f.length !== t.length) throw new Error(`table length ${f.length} != ${t.length}`)
  const m = new Map(f.map((c, i) => [c, t[i]]))
  return (c: string) => m.get(lowerFirst ? c.toLowerCase() : c) ?? c
}

// 수학 영숫자 블록의 빈자리 (U+1D455 등은 미할당 → 문자 유사 기호 블록 U+210x~213x 사용)
const ITALIC_HOLES = { h: 0x210e }
const SCRIPT_HOLES = { B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b, e: 0x212f, g: 0x210a, o: 0x2134 }
const FRAKTUR_HOLES = { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 }
const DOUBLE_HOLES = { C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119, Q: 0x211a, R: 0x211d, Z: 0x2124 }

const circled = (c: string) => {
  const k = c.codePointAt(0)!
  if (k >= 65 && k <= 90) return cp(0x24b6 + k - 65)
  if (k >= 97 && k <= 122) return cp(0x24d0 + k - 97)
  if (k === 48) return '⓪'
  if (k >= 49 && k <= 57) return cp(0x2460 + k - 49)
  return c
}
// 사각형 계열은 대문자만 있음 → 소문자도 대문자 칸으로
const upperOnly = (base: number) => (c: string) => {
  const k = c.toUpperCase().codePointAt(0)!
  return k >= 65 && k <= 90 && /[a-z]/i.test(c) ? cp(base + k - 65) : c
}
const fullwidth = (c: string) => {
  const k = c.codePointAt(0)!
  return k >= 0x21 && k <= 0x7e ? cp(k + 0xfee0) : k === 0x20 ? '　' : c
}

const smallCaps = table('abcdefghijklmnopqrstuvwyz', 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ', true)
const tiny = table('abcdefghijklmnoprstuvwxyz0123456789+-=()', 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾', true)
const upside = table(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?\'"()[]{}<>_&',
  'ɐqɔpǝɟƃɥıɾʞןɯuodbɹsʇnʌʍxʎz∀ꓭƆᗡƎℲ⅁HIſꓘ⅂WNOԀΌᴚS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86˙\'¡¿,„)(][}{><‾⅋'
)
const mirror = table('abcdefgjkpqrszBCDEFGJKLNPQRSZ?()[]{}<>', 'ɒdɔbɘʇϱįʞqpɿƨzᙠƆᗡƎꟻᎮႱꓘ⅃ИꟼϘЯƧƸ⸮)(][}{><')

const withMark = (mark: string) => (c: string) => (/\s/.test(c) ? c : c + mark)
const latinOrChanged = (map: (c: string) => string) => (c: string) => /[A-Za-z0-9]/.test(c) || map(c) !== c
const reversed = (map: (c: string) => string) => (s: string) => [...s].map(map).reverse().join('')

// ── 한글 ──
const CHO = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ']
const JUNG = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ']
const JONG = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ']
const syllable = (c: string) => {
  const i = c.codePointAt(0)! - 0xac00
  return i >= 0 && i <= 11171 ? i : -1
}
/** 안녕 → ㅇㅏㄴㄴㅕㅇ (겹받침은 한 글자 그대로) */
export const splitJamo = perChar((c) => {
  const i = syllable(c)
  return i < 0 ? c : CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28]
})
/** 안녕 → ㅇㄴ */
export const chosung = perChar((c) => {
  const i = syllable(c)
  return i < 0 ? c : CHO[Math.floor(i / 588)]
})
// 원/괄호 안 한글: 홑자음 14자 + 가~하 14음절만 유니코드에 있음
const ENCLOSABLE = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ']
const ENCLOSABLE_SYL = [...'가나다라마바사아자차카타파하']
const enclose = (consBase: number, sylBase: number) => (c: string) => {
  // 된소리 초성은 예사소리로 (ㄲ → ㄱ)
  const plain = ({ ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ' } as Record<string, string>)[c] ?? c
  const a = ENCLOSABLE.indexOf(plain)
  if (a >= 0) return cp(consBase + a)
  const b = ENCLOSABLE_SYL.indexOf(c)
  return b >= 0 ? cp(sylBase + b) : c
}
const between = (sep: string) => (s: string) => s.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : [...w].join(sep))).join('')

type StyleDef = Omit<FancyStyle, 'convert'> & { convert?: FancyStyle['convert'] }
const DEFS: StyleDef[] = [
  { key: 'bold', cat: 'bold', map: alnum(0x1d400, 0x1d41a, 0x1d7ce) },
  { key: 'italic', cat: 'bold', map: alnum(0x1d434, 0x1d44e, undefined, ITALIC_HOLES) },
  { key: 'boldItalic', cat: 'bold', map: alnum(0x1d468, 0x1d482) },
  { key: 'sansSerif', cat: 'bold', map: alnum(0x1d5a0, 0x1d5ba, 0x1d7e2) },
  { key: 'sansSerifBold', cat: 'bold', map: alnum(0x1d5d4, 0x1d5ee, 0x1d7ec) },
  { key: 'sansSerifItalic', cat: 'bold', map: alnum(0x1d608, 0x1d622) },
  { key: 'sansSerifBoldItalic', cat: 'bold', map: alnum(0x1d63c, 0x1d656) },
  { key: 'monospace', cat: 'bold', map: alnum(0x1d670, 0x1d68a, 0x1d7f6) },
  { key: 'script', cat: 'script', map: alnum(0x1d49c, 0x1d4b6, undefined, SCRIPT_HOLES) },
  { key: 'boldScript', cat: 'script', map: alnum(0x1d4d0, 0x1d4ea) },
  { key: 'fraktur', cat: 'script', map: alnum(0x1d504, 0x1d51e, undefined, FRAKTUR_HOLES) },
  { key: 'boldFraktur', cat: 'script', map: alnum(0x1d56c, 0x1d586) },
  { key: 'doubleStruck', cat: 'script', map: alnum(0x1d538, 0x1d552, 0x1d7d8, DOUBLE_HOLES) },
  { key: 'smallCaps', cat: 'deco', map: smallCaps },
  { key: 'tiny', cat: 'deco', map: tiny },
  { key: 'circled', cat: 'deco', map: circled },
  { key: 'squared', cat: 'deco', map: upperOnly(0x1f130), note: 'font' },
  { key: 'negativeSquared', cat: 'deco', map: upperOnly(0x1f170), note: 'emoji' },
  { key: 'fullwidth', cat: 'deco', map: fullwidth },
  { key: 'strikethrough', cat: 'deco', convert: perChar(withMark('̶')), note: 'combining' },
  { key: 'underline', cat: 'deco', convert: perChar(withMark('̲')), note: 'combining' },
  { key: 'upsideDown', cat: 'deco', map: upside, supports: latinOrChanged(upside), convert: reversed(upside), note: 'reverse' },
  { key: 'mirror', cat: 'deco', map: mirror, supports: latinOrChanged(mirror), convert: reversed(mirror), note: 'reverse' },
  { key: 'jamo', cat: 'korean', convert: splitJamo },
  { key: 'chosung', cat: 'korean', convert: chosung },
  { key: 'chosungCircled', cat: 'korean', convert: (s) => perChar(enclose(0x3260, 0x326e))(chosung(s)) },
  { key: 'chosungParen', cat: 'korean', convert: (s) => perChar(enclose(0x3200, 0x320e))(chosung(s)) },
  { key: 'spaced', cat: 'korean', convert: between(' ') },
  { key: 'heartBetween', cat: 'korean', convert: between('♡') },
  { key: 'starBetween', cat: 'korean', convert: between('⋆') },
  { key: 'eachBracket', cat: 'korean', convert: perChar((c) => (/\s/.test(c) ? c : `『${c}』`)) },
]
export const STYLES: FancyStyle[] = DEFS.map((s) => ({ ...s, convert: s.convert ?? perChar(s.map!) }))

/** 닉네임 테두리 [왼쪽, 오른쪽] — 어떤 글자든 감싸므로 한글 OK */
export const FRAMES: [string, string][] = [
  ['꧁ ', ' ꧂'], ['꧁༺ ', ' ༻꧂'], ['★彡 ', ' 彡★'], ['✧･ﾟ: ', ' :･ﾟ✧'], ['｡･:*:･ﾟ★ ', ' ★ﾟ･:*:･｡'],
  ['˚₊‧꒰ა ', ' ໒꒱‧₊˚'], ['♡ ', ' ♡'], ['✿ ', ' ✿'], ['⋆｡°✩ ', ' ✩°｡⋆'], ['❀ ', ' ❀'],
  ['♔ ', ' ♔'], ['☾ ', ' ☽'], ['♪♫ ', ' ♫♪'], ['➶➷ ', ' ➸➹'], ['⊹ ࣪ ˖ ', ' ˖ ࣪ ⊹'],
  ['•°• ', ' •°•'], ['»»——— ', ' ———««'], ['【 ', ' 】'], ['「 ', ' 」'], ['《 ', ' 》'],
  ['『 ', ' 』'], ['꒰ ', ' ꒱'], ['ʚ ', ' ɞ'], ['•ᴗ• ', ''], ['ꕤ ', ' ꕤ'], ['🔥 ', ' 🔥'],
]
export const frameLabel = ([l, r]: [string, string]) => `${l.trim()} … ${r.trim()}`.trim()
export const applyFrame = ([l, r]: [string, string], s: string) => `${l}${s.trim()}${r}`

export const styleByKey = (key: string) => STYLES.find((s) => s.key === key)

/** 영문 전용 스타일에서 바뀌지 않은 글자(한글·기호 제외 문자/숫자) 목록 — 중복 제거 */
export function unchangedChars(style: FancyStyle, text: string): string[] {
  const map = style.map
  if (!map) return []
  const ok = style.supports ?? ((c: string) => map(c) !== c)
  const out = new Set<string>()
  for (const c of text) if (/[\p{L}\p{N}]/u.test(c) && !ok(c)) out.add(c)
  return [...out]
}

/** 보이는 글자 수(코드포인트, 결합문자 제외) — 인스타·카톡 제한 비교용 근사치 */
export const visibleLength = (s: string) => [...s.replace(/[̀-ͯ]/g, '')].length
