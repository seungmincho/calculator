// 마니또 캐릭터·선물 상자 그림(SVG 문자열, 100×100). 화면(ManitoArt)과 OG 이미지(generate-og.mjs)가 같이 쓴다.
// 상수만 이어 붙이므로 dangerouslySetInnerHTML 로 넣어도 안전하다(이름은 해시로만 쓴다).
import { hash32 } from './manito.ts'

const INK = '#4a3b3b'
const c = (x: number, y: number, r: number, fill: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`
const e = (x: number, y: number, rx: number, ry: number, fill: string, rot = 0) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}/>`
const p = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`
const line = (d: string, w = 2.6, color = INK) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
/** 좌우 대칭: 왼쪽만 그리고 뒤집어 붙인다 */
const pair = (left: string) => `${left}<g transform="translate(100 0) scale(-1 1)">${left}</g>`

const eyes = pair(c(37, 57, 4.2, INK) + c(38.4, 55.4, 1.4, '#fff'))
const blush = (color = '#ff9fb0') => pair(e(28, 66, 5.5, 3.6, color))
const mouth = line('M45 66 Q47.5 69.5 50 66 Q52.5 69.5 55 66')
const nose = (color = INK) => e(50, 62.5, 3.4, 2.5, color)
const head = (fill: string, rx = 34, ry = 31) => e(50, 60, rx, ry, fill)

type Critter = { bg: string; art: string; top?: number } // top = 모자를 얹을 높이 (없으면 모자 없음 — 개구리는 눈을 가린다)
const KINDS: Critter[] = [
  // 토끼
  { bg: '#ffdbe5', top: 33, art: pair(e(36, 24, 9, 22, '#fff', -8) + e(36, 25, 4.4, 15, '#ffb9cb', -8)) + head('#fff') + eyes + blush() + nose('#ff8fa8') + mouth },
  // 곰
  { bg: '#ffe6c9', top: 32, art: pair(c(25, 36, 12, '#b9804f') + c(25, 36, 6.5, '#e9bd92')) + head('#c98f5c') + e(50, 67, 14, 10.5, '#f5e0c4') + eyes + blush('#f09a7a') + nose() + mouth },
  // 고양이
  { bg: '#d8ebff', top: 33, art: pair(p('M20 50 L22 22 Q23 19 26 21 L47 36 Z', '#f7c06a') + p('M25 42 L26 28 L38 37 Z', '#ffdca6')) + head('#f7c06a') + line('M50 31 V40 M42 32 V38 M58 32 V38', 3, '#e09f42') + e(50, 68, 12, 8, '#ffe9c8') + eyes + blush() + nose('#f0788c') + mouth + pair(line('M13 60 L24 62 M14 69 L24 67', 1.8, '#c98f45')) },
  // 강아지
  { bg: '#e3f4d7', top: 32, art: head('#f7e3c3') + pair(e(19, 52, 9.5, 20, '#b88657', 14)) + e(66, 54, 11, 11, '#e2b98a') + e(50, 68, 13, 9.5, '#fff6e6') + eyes + blush() + nose() + mouth + p('M46.5 71.5 H53.5 V76 Q50 80 46.5 76 Z', '#ff8fa0') },
  // 판다
  { bg: '#d9f2e8', top: 32, art: pair(c(25, 36, 11.5, '#44444f')) + head('#fff') + pair(e(36, 57, 8.5, 10, '#44444f', 22)) + pair(c(37, 57, 4, '#fff') + c(37.4, 57, 2.6, '#22222a')) + blush() + nose() + mouth },
  // 펭귄
  { bg: '#d3e6ff', top: 31, art: head('#4d5a86') + pair(e(39, 62, 14.5, 17, '#fff')) + e(50, 72, 18, 14, '#fff') + eyes + blush() + p('M43 63 Q50 59 57 63 Q50 72 43 63 Z', '#ffb03a') },
  // 병아리
  { bg: '#fff0b8', top: 32, art: line('M50 31 Q46 22 40 22 M50 31 Q51 20 56 18', 4, '#f6b92c') + head('#ffdc55') + eyes + blush('#ff9d6b') + p('M43 64 Q50 59 57 64 Q50 72 43 64 Z', '#ff9436') },
  // 여우
  { bg: '#ffe1d3', top: 33, art: pair(p('M19 50 L20 20 Q21 17 24 19 L47 36 Z', '#f28a4b') + p('M24 40 L24.5 27 L36 36 Z', '#7a4630')) + head('#f28a4b') + pair(p('M16.6 65.8 Q32 56 50 73 V91 A34 31 0 0 1 16.6 65.8 Z', '#fff4ea')) + eyes + blush() + nose() + mouth },
  // 개구리
  { bg: '#e2f5cf', art: pair(c(32, 35, 12, '#8ccf6e')) + head('#8ccf6e', 35, 29) + pair(c(32, 35, 8, '#fff') + c(33, 36, 4.6, INK) + c(34.6, 34.4, 1.5, '#fff')) + blush('#ff9d9d') + line('M37 62 Q50 74 63 62', 3) },
  // 햄스터
  { bg: '#efe4ff', top: 32, art: pair(c(27, 36, 9.5, '#eeb57a') + c(27, 36, 5, '#ffcfc6')) + head('#f3c48f') + pair(e(30, 69, 14, 13, '#fff8ee')) + e(50, 66, 11, 11, '#fff8ee') + eyes + blush() + nose('#e8788a') + mouth + p('M46.8 69.6 H53.2 V73 Q50 74.6 46.8 73 Z', '#fff') },
]
const HATS = [
  () => '',
  // 리본
  (y: number) => `<g transform="translate(66 ${y + 4}) rotate(18)">${p('M0 0 L-11 -7 Q-14 0 -11 7 Z M0 0 L11 -7 Q14 0 11 7 Z', '#ff6f86')}${c(0, 0, 3.6, '#e94f69')}</g>`,
  // 산타 모자
  (y: number) => `<g transform="translate(50 ${y})">${p('M-21 0 Q-12 -27 10 -25 Q24 -24 28 -8 Q21 -13 16 -10 Q20 -4 21 0 Z', '#f0475c')}<rect x="-24" y="-4" width="48" height="10" rx="5" fill="#fff"/>${c(28, -6, 5.5, '#fff')}</g>`,
]

export const CRITTER_COUNT = KINDS.length

/** 이름마다 늘 같은 캐릭터 (kind·hat 을 주면 그 조합) */
export function critterSvg(name: string, kind?: number, hat?: number): string {
  const h = hash32(name)
  const k = KINDS[kind ?? h % KINDS.length]
  return c(50, 50, 50, k.bg) + k.art + (k.top ? HATS[hat ?? (h >>> 8) % HATS.length](k.top) : '')
}

/** 선물 상자: 몸통과 뚜껑을 따로 (뚜껑만 움직인다). 120×120 */
export const giftBody = `<rect x="18" y="52" width="84" height="58" rx="10" fill="#ff8fa3"/><rect x="51" y="52" width="18" height="58" fill="#fff3c9"/><rect x="18" y="52" width="84" height="9" fill="#e8718a" opacity=".55"/>`
  + `<circle cx="38" cy="80" r="3.4" fill="${INK}"/><circle cx="82" cy="80" r="3.4" fill="${INK}"/><ellipse cx="30" cy="88" rx="4.5" ry="3" fill="#ff5f7d" opacity=".6"/><ellipse cx="90" cy="88" rx="4.5" ry="3" fill="#ff5f7d" opacity=".6"/>${line('M54 86 Q60 93 66 86', 3)}`
export const giftLid = `<path d="M60 36 C44 12 22 20 34 34 C40 40 52 38 60 36 Z M60 36 C76 12 98 20 86 34 C80 40 68 38 60 36 Z" fill="#ffd76b"/><circle cx="60" cy="35" r="6.5" fill="#f5bd3d"/><rect x="11" y="36" width="98" height="20" rx="8" fill="#ff7a92"/><rect x="50" y="36" width="20" height="20" fill="#ffe9a8"/>`
