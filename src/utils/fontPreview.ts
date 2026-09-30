// 한글 폰트 미리보기 — 폰트 목록·CSS URL 빌더·필터 (순수 함수)
// 출처: Google Fonts 메타데이터(fonts.google.com/metadata/fonts, subsets에 korean 포함 패밀리)의
//       굵기·제작사, 라이선스는 github.com/google/fonts 의 ofl/ 디렉터리(= SIL OFL 1.1)로 확인 (2026-10).
//       Pretendard·D2Coding은 각 GitHub 저장소 LICENSE(OFL 1.1) 확인, jsDelivr CDN.

export type FontCat = 'gothic' | 'myeongjo' | 'handwriting' | 'display' | 'coding'
export const CATS: FontCat[] = ['gothic', 'myeongjo', 'handwriting', 'display', 'coding']

export interface FontInfo {
  id: string
  name: string // 표시 이름
  family: string // CSS font-family 이름
  ko: string // 한글 통칭 (검색용)
  cat: FontCat
  weights: number[]
  designer: string
  license: string
  cssUrl?: string // Google Fonts가 아닌 경우 고정 CSS
  link: string // 공식 페이지 / 다운로드
}

const G = 'google'
type Row = [family: string, ko: string, cat: FontCat, weights: number[], designer: string, src?: typeof G | { css: string; link: string; family?: string }]

const ALL9 = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const ROWS: Row[] = [
  // 고딕
  ['Pretendard', '프리텐다드', 'gothic', ALL9, 'Kil Hyung-jin (orioncactus)', {
    family: 'Pretendard Variable',
    css: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    link: 'https://github.com/orioncactus/pretendard',
  }],
  ['Noto Sans KR', '본고딕 노토산스', 'gothic', ALL9, 'Google'],
  ['Nanum Gothic', '나눔고딕', 'gothic', [400, 700, 800], 'Sandoll Communication'],
  ['Gothic A1', '고딕 A1', 'gothic', ALL9, 'HanYang I&C'],
  ['IBM Plex Sans KR', 'IBM 플렉스 산스', 'gothic', [100, 200, 300, 400, 500, 600, 700], 'Mike Abbink, Bold Monday'],
  ['Asta Sans', '아스타 산스', 'gothic', [300, 400, 500, 600, 700, 800], '42dot'],
  ['Gowun Dodum', '고운돋움', 'gothic', [400], 'Yanghee Ryu'],
  ['Sunflower', '해바라기', 'gothic', [300, 500, 700], 'JIKJISOFT'],
  ['Orbit', '오르빗', 'gothic', [400], 'Sooun Cho, JAMO'],
  // 명조
  ['Noto Serif KR', '본명조 노토세리프', 'myeongjo', [200, 300, 400, 500, 600, 700, 800, 900], 'Google'],
  ['Nanum Myeongjo', '나눔명조', 'myeongjo', [400, 700, 800], 'Sandoll Communication'],
  ['Gowun Batang', '고운바탕', 'myeongjo', [400, 700], 'Yanghee Ryu'],
  ['Hahmlet', '함렛', 'myeongjo', ALL9, 'Hypertype'],
  ['Song Myung', '송명', 'myeongjo', [400], 'JIKJI'],
  ['Diphylleia', '디필레이아 산하엽', 'myeongjo', [400], 'Minha Hyung, JAMO'],
  // 손글씨
  ['Nanum Pen Script', '나눔손글씨 펜', 'handwriting', [400], 'Sandoll Communication'],
  ['Nanum Brush Script', '나눔손글씨 붓', 'handwriting', [400], 'Sandoll Communication'],
  ['Gamja Flower', '감자꽃', 'handwriting', [400], 'YoonDesign'],
  ['Gaegu', '개구', 'handwriting', [300, 400, 700], 'JIKJI SOFT'],
  ['Hi Melody', '하이멜로디', 'handwriting', [400], 'YoonDesign'],
  ['East Sea Dokdo', '동해독도', 'handwriting', [400], 'YoonDesign'],
  ['Dokdo', '독도', 'handwriting', [400], 'FONTRIX'],
  ['Single Day', '싱글데이', 'handwriting', [400], 'DXKorea'],
  ['Poor Story', '푸어스토리', 'handwriting', [400], 'Yoon Design'],
  ['Cute Font', '귀여운폰트', 'handwriting', [400], 'TypoDesign Lab'],
  // 디스플레이
  ['Black Han Sans', '검은고딕', 'display', [400], 'Zess Type'],
  ['Do Hyeon', '배민 도현체', 'display', [400], 'Woowahan Brothers'],
  ['Jua', '배민 주아체', 'display', [400], 'Woowahan Brothers'],
  ['Yeon Sung', '배민 연성체', 'display', [400], 'Woowahan Brothers'],
  ['Kirang Haerang', '배민 기랑해랑체', 'display', [400], 'Woowahan Brothers'],
  ['Dongle', '동글', 'display', [300, 400, 700], 'Yanghee Ryu'],
  ['Bagel Fat One', '베이글 팻 원', 'display', [400], 'Kyungwon Kim, JAMO'],
  ['Gasoek One', '가석 원', 'display', [400], 'Jiashuo Zhang, JAMO'],
  ['Gugi', '구기', 'display', [400], 'TAE System & Typefaces'],
  ['Stylish', '스타일리시', 'display', [400], 'AsiaSoft'],
  ['Black And White Picture', '흑백사진', 'display', [400], 'AsiaSoft'],
  // 코딩
  ['D2Coding', 'D2코딩', 'coding', [400, 700], 'NAVER', {
    css: 'https://cdn.jsdelivr.net/npm/d2coding@1.3.2/d2coding-subset.css',
    link: 'https://github.com/naver/d2codingfont',
  }],
  ['Nanum Gothic Coding', '나눔고딕코딩', 'coding', [400, 700], 'Sandoll Communication'],
]

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const FONTS: FontInfo[] = ROWS.map(([name, ko, cat, weights, designer, src]) => ({
  id: slug(name),
  name,
  family: typeof src === 'object' && src.family ? src.family : name,
  ko, cat, weights, designer,
  license: 'SIL OFL 1.1',
  cssUrl: typeof src === 'object' ? src.css : undefined,
  link: typeof src === 'object' ? src.link : `https://fonts.google.com/specimen/${name.replace(/ /g, '+')}`,
}))
export const FONT_BY_ID = new Map(FONTS.map(f => [f.id, f]))

export const FALLBACK: Record<FontCat, string> = {
  gothic: 'sans-serif', display: 'sans-serif', myeongjo: 'serif', handwriting: 'cursive', coding: 'monospace',
}
export const fontStack = (f: Pick<FontInfo, 'family' | 'cat'>) => `'${f.family}', ${FALLBACK[f.cat]}`

/** 원하는 굵기에 가장 가까운 지원 굵기 (동률이면 가벼운 쪽) */
export function nearestWeight(weights: number[], w: number): number {
  return weights.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), weights[0])
}

/** 텍스트의 고유 문자(공백·제어문자 제외, 코드포인트 순) — Google Fonts `text=` 서브셋용 */
export function uniqChars(text: string): string {
  return [...new Set(Array.from(text).filter(c => !/[\s\p{Cc}]/u.test(c)))].sort().join('')
}

// ponytail: 고유 문자 300자 초과면 text= 생략(URL 길이) → 구글이 unicode-range 조각 CSS를 줘서 필요한 조각만 받음
export const SUBSET_MAX = 300

/** Google Fonts css2 URL. weights 비우면 굵기 축 생략, text 주면 서브셋 */
export function googleCssUrl(family: string, weights: number[] = [], text = ''): string {
  const ws = [...new Set(weights)].sort((a, b) => a - b)
  let fam = family.replace(/ /g, '+')
  if (ws.length && !(ws.length === 1 && ws[0] === 400)) fam += `:wght@${ws.join(';')}`
  const chars = uniqChars(text)
  const sub = chars && chars.length <= SUBSET_MAX ? `&text=${encodeURIComponent(chars)}` : ''
  return `https://fonts.googleapis.com/css2?family=${fam}${sub}&display=swap`
}

/** 미리보기용 CSS URL (해당 굵기 하나 + 서브셋). 고정 CSS 폰트는 그대로 */
export function previewCssUrl(f: FontInfo, weight: number, text: string): string {
  return f.cssUrl ?? googleCssUrl(f.family, f.weights.length > 1 ? [nearestWeight(f.weights, weight)] : [], text)
}

/** 배포용 CSS URL (모든 굵기, 서브셋 없음) */
export function fullCssUrl(f: FontInfo): string {
  return f.cssUrl ?? googleCssUrl(f.family, f.weights.length > 1 ? f.weights : [])
}

export function cssSnippet(f: FontInfo, weight?: number): string {
  const url = fullCssUrl(f)
  return [
    '<!-- HTML <head> -->',
    `<link rel="stylesheet" href="${url}">`,
    '',
    '/* CSS */',
    `@import url('${url}');`,
    '',
    'body {',
    `  font-family: ${fontStack(f)};`,
    ...(weight ? [`  font-weight: ${nearestWeight(f.weights, weight)};`] : []),
    '}',
  ].join('\n')
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export interface FontFilter { cat: FontCat | 'all'; q: string; favOnly: boolean; favs: string[] }
export function filterFonts(list: FontInfo[], { cat, q, favOnly, favs }: FontFilter): FontInfo[] {
  const nq = norm(q)
  return list.filter(f =>
    (cat === 'all' || f.cat === cat) &&
    (!favOnly || favs.includes(f.id)) &&
    (!nq || norm(`${f.name}|${f.family}|${f.ko}|${f.designer}`).includes(nq)))
}

export const MAX_PIN = 4
export function parseIds(s: string | null): string[] {
  return [...new Set((s ?? '').split(',').filter(id => FONT_BY_ID.has(id)))].slice(0, MAX_PIN)
}

export function togglePin(pins: string[], id: string): string[] {
  if (pins.includes(id)) return pins.filter(x => x !== id)
  return pins.length >= MAX_PIN ? pins : [...pins, id]
}

export function clampNum(s: string | null, min: number, max: number, def: number): number {
  const n = Number(s)
  return s != null && s !== '' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}

export const LOCAL_EXT = /\.(ttf|otf|woff2?)$/i
export const LOCAL_MAX_BYTES = 30 * 1024 * 1024
