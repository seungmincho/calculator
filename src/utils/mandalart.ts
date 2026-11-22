// 만다라트(Mandal-Art) 계획표 — 데이터 모양, 9×9 좌표 ↔ 블록·칸 매핑, 진행률, 저장 형식, 공유 링크 압축, 칸 글자 줄바꿈.
// React·DOM 에 의존하지 않는다(scripts/check-mandalart.ts 가 Node 에서 바로 돌린다). 템플릿 문구는 번역 JSON(templates.data).
//
// | 내용 | 출처 | 확인일 |
// |------|------|--------|
// | 가운데 1칸 + 주변 8칸(3×3)에서 81칸(9×9)으로 넓히는 발상법, 디자이너 이마이즈미 히로아키(今泉浩晃) 1987년 고안 | kaonavi 인사용어집 「マンダラート」 https://www.kaonavi.jp/dictionary/mandalart/ | 2026-11-22 |
// | 오타니 쇼헤이 하나마키히가시고 1학년 목표 시트: 핵심 'ドラ1 8球団', 세부 8개, 마쓰무라 야스오(松村寧雄)의 만다라 차트가 바탕 | 라이프해커 재팬 2021-09-07 https://www.lifehacker.jp/article/241192shohei_ohtani/ | 2026-11-22 |
// | 링크 압축: 브라우저 기본 CompressionStream('deflate-raw'), 새 의존성 없음 | MDN https://developer.mozilla.org/docs/Web/API/CompressionStream | 2026-11-22 |

export const SAVE_KEY = 'toolhub-mandalart-v1'
/** 한 칸 글자 수(입력칸 maxLength 와 같은 UTF-16 단위) */
export const CELL_MAX = 30
/** 받은 링크 m 값 길이 상한. 꽉 채운 표도 이보다 짧다 — 압축을 풀기 전에 거른다 */
export const M_MAX = 16_000
/** 전체 주소가 이보다 길면 문자·일부 메신저에서 잘릴 수 있다고 안내 */
export const URL_WARN = 2000
const CELLS = 73 // 핵심 1 + 세부 8 + 실천 64

/** goals[g] = 세부 목표 g(0~7), acts[g*8+k] = 세부 목표 g 의 실천 k(0~7) */
export type Chart = { core: string; goals: string[]; acts: string[] }
export const EMPTY: Chart = { core: '', goals: Array(8).fill(''), acts: Array(64).fill('') }
export const NO_DONE: boolean[] = Array(64).fill(false)

/** 3×3 안 위치(0~8, 읽는 순서)에서 가운데 4 를 뺀 것. 순번 i 의 위치 = RING[i] */
export const RING: readonly number[] = [0, 1, 2, 3, 5, 6, 7, 8]
/** 블록 이동 순서: 가운데(핵심) 블록 먼저, 그다음 세부 목표 1~8 */
export const BLOCK_ORDER: readonly number[] = [4, ...RING]

export type Cell = { kind: 'core' } | { kind: 'goal'; g: number } | { kind: 'act'; g: number; k: number }

/** 블록 b·칸 p(둘 다 0~8, 읽는 순서) → 무슨 칸인지. 바깥 블록의 가운데 칸 = 그 블록의 세부 목표(같은 데이터) */
export function cellOf(b: number, p: number): Cell {
  if (b === 4) return p === 4 ? { kind: 'core' } : { kind: 'goal', g: RING.indexOf(p) }
  const g = RING.indexOf(b)
  return p === 4 ? { kind: 'goal', g } : { kind: 'act', g, k: RING.indexOf(p) }
}
/** 9×9 좌표(행 r·열 c, 0~8) → 블록·칸 */
export const toBlock = (r: number, c: number) => ({ b: Math.floor(r / 3) * 3 + Math.floor(c / 3), p: (r % 3) * 3 + (c % 3) })
/** 블록·칸 → 9×9 좌표 */
export const toGrid = (b: number, p: number) => ({ r: Math.floor(b / 3) * 3 + Math.floor(p / 3), c: (b % 3) * 3 + (p % 3) })
export const actIndex = (g: number, k: number) => g * 8 + k

export const textOf = (c: Chart, cell: Cell) =>
  cell.kind === 'core' ? c.core : cell.kind === 'goal' ? c.goals[cell.g] : c.acts[actIndex(cell.g, cell.k)]

/** 줄바꿈·탭은 공백으로(칸은 한 줄 데이터), CELL_MAX 에서 자른다 */
export const clean = (s: string) => s.replace(/[\r\n\t]+/g, ' ').slice(0, CELL_MAX)

export function withCell(c: Chart, cell: Cell, value: string): Chart {
  const v = clean(value)
  if (cell.kind === 'core') return { ...c, core: v }
  if (cell.kind === 'goal') return { ...c, goals: c.goals.map((x, i) => (i === cell.g ? v : x)) }
  const at = actIndex(cell.g, cell.k)
  return { ...c, acts: c.acts.map((x, i) => (i === at ? v : x)) }
}

const filled = (s: string) => s.trim() !== ''
export const isEmpty = (c: Chart) => ![c.core, ...c.goals, ...c.acts].some(filled)

export type Tally = { done: number; filled: number }
/** 진행률 = 체크한 칸 / 채운 실천 칸. 빈 칸의 체크는 세지 않는다 */
export function progress(c: Chart, done: readonly boolean[]): Tally & { goals: Tally[] } {
  const goals = c.goals.map((_, g) => {
    const t = { done: 0, filled: 0 }
    for (let k = 0; k < 8; k++) {
      const i = actIndex(g, k)
      if (!filled(c.acts[i])) continue
      t.filled++
      if (done[i]) t.done++
    }
    return t
  })
  return { done: goals.reduce((s, t) => s + t.done, 0), filled: goals.reduce((s, t) => s + t.filled, 0), goals }
}
export const pct = (t: Tally) => (t.filled ? Math.round((t.done / t.filled) * 100) : 0)

// ── 직렬화: [핵심, 세부 8, 실천 64] 문자열 배열. 끝의 빈 칸은 빼서 링크를 줄인다
function cellsOf(c: Chart): string[] {
  const cells = [c.core, ...c.goals, ...c.acts]
  let n = cells.length
  while (n > 0 && cells[n - 1] === '') n--
  return cells.slice(0, n)
}
function fromCells(v: unknown): Chart | null {
  if (!Array.isArray(v) || v.length > CELLS || !v.every((x) => typeof x === 'string')) return null
  const cells = [...(v as string[]).map(clean), ...Array(CELLS - v.length).fill('')]
  return { core: cells[0], goals: cells.slice(1, 9), acts: cells.slice(9) }
}
export const serialize = (c: Chart) => JSON.stringify(cellsOf(c))
export function deserialize(json: string): Chart | null {
  try { return fromCells(JSON.parse(json)) } catch { return null }
}
export const sameChart = (a: Chart, b: Chart) => serialize(a) === serialize(b)

// ── localStorage: { cells, done: 체크한 실천 번호[] }
export type Saved = { chart: Chart; done: boolean[] }
export const saveText = (c: Chart, done: readonly boolean[]) =>
  JSON.stringify({ cells: cellsOf(c), done: done.flatMap((x, i) => (x ? [i] : [])) })
export function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { cells?: unknown; done?: unknown }
    const chart = fromCells(o?.cells)
    if (!chart) return null
    const done = [...NO_DONE]
    if (Array.isArray(o.done)) for (const i of o.done) if (Number.isInteger(i) && i >= 0 && i < 64) done[i] = true
    return { chart, done }
  } catch { return null }
}

// ── 공유 링크 ?m= : JSON → UTF-8 → deflate-raw → base64url. 빈 표는 '' (쿼리 없음)
function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))
async function pipe(bytes: Uint8Array<ArrayBuffer>, through: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(through)).arrayBuffer())
}
/** CompressionStream 이 없는 브라우저면 reject */
export async function encode(c: Chart): Promise<string> {
  if (isEmpty(c)) return ''
  return b64url(await pipe(new TextEncoder().encode(serialize(c)), new CompressionStream('deflate-raw')))
}
/** 잘린·잘못된 링크는 null. ponytail: 압축 해제 크기는 M_MAX(입력 길이)로만 묶는다 — 최악 ~12MB, 더 막아야 하면 reader 로 바이트 상한 */
export async function decode(m: string): Promise<Chart | null> {
  if (!m || m.length > M_MAX) return null
  try {
    return deserialize(new TextDecoder().decode(await pipe(unb64url(m), new DecompressionStream('deflate-raw'))))
  } catch { return null }
}

// ── 템플릿: 번역 JSON templates.data.<id> = { core, goals: string[8], acts: string[8][8] }
export type TemplateId = 'blank' | 'study' | 'health' | 'career' | 'money' | 'habits'
export const TEMPLATE_IDS: readonly TemplateId[] = ['blank', 'study', 'health', 'career', 'money', 'habits']
/** 빈 칸에 흐리게 보여 주는 예시 */
export const EXAMPLE_ID: TemplateId = 'habits'
/** 모양이 어긋난 자리는 빈 칸으로 */
export function fromTemplate(raw: unknown): Chart {
  const o = (raw ?? {}) as { core?: unknown; goals?: unknown; acts?: unknown }
  const str = (x: unknown) => (typeof x === 'string' ? clean(x) : '')
  const at = (v: unknown, i: number) => (Array.isArray(v) ? v[i] : undefined)
  return {
    core: str(o.core),
    goals: Array.from({ length: 8 }, (_, g) => str(at(o.goals, g))),
    acts: Array.from({ length: 64 }, (_, i) => str(at(at(o.acts, Math.floor(i / 8)), i % 8))),
  }
}

/** 칸 폭에 맞춰 줄을 나눈다(PNG). 띄어쓰기에서 먼저 끊고, 한 단어가 폭보다 길면 글자 단위로. maxLines 를 넘으면 마지막 줄 끝을 … 로 */
export function wrapText(text: string, width: number, maxLines: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue
    const joined = line ? `${line} ${word}` : word
    if (measure(joined) <= width) { line = joined; continue }
    if (line) lines.push(line)
    line = ''
    for (const ch of word) {
      if (line && measure(line + ch) > width) { lines.push(line); line = ch } else line += ch
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const out = lines.slice(0, maxLines)
  let last = out[maxLines - 1]
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1)
  out[maxLines - 1] = `${last}…`
  return out
}
