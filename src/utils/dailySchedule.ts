// 생활계획표: 24시간 원형 계획표의 시간 계산·겹침·합계·URL 인코딩·내보내기 SVG (회귀 체크: node scripts/check-daily-schedule.ts).
// 시각은 0~1439분(10분 단위). 끝 < 시작이면 자정을 넘는 일정(22:00~07:00). 시작 = 끝이면 0분.

export const DAY = 1440
export const STEP = 10
export const MAX_BLOCKS = 24
export const LABEL_MAX = 20
export const TITLE_MAX = 30
export const GOAL_MAX = 60
export const SAVE_KEY = 'toolhub-daily-schedule-v1'

/** 칸 색(차트 계열색). 중간 밝기라 라이트·다크 모두에서 진한 글자(INK)가 읽힌다. 이름은 번역 colors[i] */
export const COLORS = ['#A9C7FF', '#FFD872', '#8FD6A8', '#FFB38A', '#C7B6F2', '#8ED8DE', '#F6A9B4', '#CDD3DB'] as const
export const INK = '#191f28'

/** 번역 labels.<key>. 순서 = URL 인코딩 번호라 끝에만 더한다 */
export const LABEL_KEYS = [
  'sleep', 'wash', 'meal', 'study', 'homework', 'reading', 'exercise', 'academy',
  'free', 'family', 'commute', 'rest', 'selfDev', 'partTime', 'work',
] as const
export type LabelKey = (typeof LABEL_KEYS)[number]

const KEY_COLOR: Record<LabelKey, number> = {
  sleep: 0, meal: 1, study: 2, homework: 2, selfDev: 2, exercise: 3, academy: 4, work: 4, partTime: 4,
  free: 5, rest: 5, reading: 6, family: 6, wash: 7, commute: 7,
}

export interface Block {
  start: number
  end: number
  color: number
  /** 예시 일정이면 번역 키, 사용자가 이름을 고치면 null 이고 label 을 쓴다 */
  key: LabelKey | null
  label: string
}

export interface Plan {
  blocks: Block[]
  /** null = 기본 제목(번역) */
  title: string | null
  goal: string
}

export const TEMPLATE_IDS = ['elementary', 'teen', 'exam', 'college', 'worker'] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]
export const DEFAULT_TEMPLATE: TemplateId = 'teen'

const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
/** 'HH:MM-HH:MM key' 목록 → 시작순 블록 */
const tpl = (rows: string[]): Block[] =>
  rows.map((r) => {
    const key = r.slice(12) as LabelKey
    return { start: hm(r.slice(0, 5)), end: hm(r.slice(6, 11)), color: KEY_COLOR[key], key, label: '' }
  }).sort((a, b) => a.start - b.start)

// 모두 24시간을 빈틈·겹침 없이 채운다(체크 스크립트가 확인). 수면은 AASM 권장 범위 안(초 10h·중고 8h·성인 7h 이상)
export const TEMPLATES: Record<TemplateId, Block[]> = {
  elementary: tpl([
    '21:30-07:30 sleep', '07:30-08:00 wash', '08:00-08:30 meal', '08:30-10:00 homework', '10:00-11:00 reading',
    '11:00-12:00 exercise', '12:00-13:00 meal', '13:00-15:00 academy', '15:00-17:00 free', '17:00-18:00 study',
    '18:00-19:00 meal', '19:00-20:30 family', '20:30-21:30 wash',
  ]),
  teen: tpl([
    '23:30-07:30 sleep', '07:30-08:00 wash', '08:00-08:30 meal', '08:30-12:00 study', '12:00-13:00 meal',
    '13:00-17:00 academy', '17:00-18:00 exercise', '18:00-19:00 meal', '19:00-21:00 study', '21:00-23:00 free',
    '23:00-23:30 wash',
  ]),
  exam: tpl([
    '23:30-06:30 sleep', '06:30-07:00 wash', '07:00-07:30 meal', '07:30-08:00 commute', '08:00-12:00 study',
    '12:00-13:00 meal', '13:00-18:00 study', '18:00-19:00 meal', '19:00-22:00 study', '22:00-22:30 commute',
    '22:30-23:00 exercise', '23:00-23:30 rest',
  ]),
  college: tpl([
    '01:00-09:00 sleep', '09:00-09:30 wash', '09:30-10:00 meal', '10:00-12:00 selfDev', '12:00-13:00 meal',
    '13:00-18:00 partTime', '18:00-19:00 meal', '19:00-20:00 exercise', '20:00-21:00 reading', '21:00-01:00 free',
  ]),
  worker: tpl([
    '23:30-06:30 sleep', '06:30-07:30 wash', '07:30-08:00 meal', '08:00-09:00 commute', '09:00-12:00 work',
    '12:00-13:00 meal', '13:00-18:00 work', '18:00-19:00 commute', '19:00-20:00 meal', '20:00-21:00 exercise',
    '21:00-23:00 free', '23:00-23:30 wash',
  ]),
}

export const DEFAULT_PLAN: Plan = { blocks: TEMPLATES[DEFAULT_TEMPLATE], title: null, goal: '' }

// ── 시간 계산

const pad = (n: number) => String(n).padStart(2, '0')
export const hhmm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
export const dur = (b: Pick<Block, 'start' | 'end'>) => (b.end - b.start + DAY) % DAY

/** 하루 안의 구간들. 자정을 넘으면 두 조각 */
export function segs(b: Pick<Block, 'start' | 'end'>): [number, number][] {
  if (b.start < b.end) return [[b.start, b.end]]
  if (b.start === b.end) return []
  return b.end > 0 ? [[b.start, DAY], [0, b.end]] : [[b.start, DAY]]
}

export function overlapMin(a: Block, b: Block): number {
  let n = 0
  for (const [s1, e1] of segs(a)) for (const [s2, e2] of segs(b)) n += Math.max(0, Math.min(e1, e2) - Math.max(s1, s2))
  return n
}

export function overlaps(blocks: Block[]): { a: number; b: number; min: number }[] {
  const out: { a: number; b: number; min: number }[] = []
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const min = overlapMin(blocks[i], blocks[j])
      if (min > 0) out.push({ a: i, b: j, min })
    }
  }
  return out
}

export interface Summary {
  /** 이름별 합계, 많은 순 */
  cats: { name: string; min: number; color: number }[]
  /** 계획한 시간 합(겹치면 두 번 센다) */
  planned: number
  gapMin: number
  /** 빈 구간. 자정을 넘으면 [start, end] 가 start > end */
  gaps: [number, number][]
  /** 두 번 이상 칠해진 분(겹친 만큼) */
  overMin: number
}

/** planned + gapMin - overMin = 1440 이 항상 성립 */
export function summarize(blocks: Block[], nameOf: (b: Block) => string): Summary {
  const cover = new Uint8Array(DAY)
  const cats = new Map<string, { name: string; min: number; color: number }>()
  let planned = 0
  for (const b of blocks) {
    for (const [s, e] of segs(b)) for (let m = s; m < e; m++) cover[m]++
    const d = dur(b)
    planned += d
    if (!d) continue
    const name = nameOf(b)
    const c = cats.get(name)
    if (c) c.min += d
    else cats.set(name, { name, min: d, color: b.color })
  }
  let gapMin = 0, overMin = 0
  const gaps: [number, number][] = []
  for (let m = 0; m < DAY; m++) {
    if (cover[m] === 0) {
      gapMin++
      const last = gaps[gaps.length - 1]
      if (last && last[1] === m) last[1] = m + 1
      else gaps.push([m, m + 1])
    } else overMin += cover[m] - 1
  }
  // 23:00~24:00 와 00:00~01:00 이 모두 비면 한 구간(23:00~01:00)
  if (gaps.length > 1 && gaps[0][0] === 0 && gaps[gaps.length - 1][1] === DAY) {
    const tail = gaps.pop()!
    gaps[0] = [tail[0], gaps[0][1]]
  }
  for (const g of gaps) g[1] %= DAY
  return { cats: [...cats.values()].sort((a, b) => b.min - a.min), planned, gapMin, gaps, overMin }
}

export const sortByStart = (blocks: Block[]) => [...blocks].sort((a, b) => a.start - b.start)

export function sameBlocks(a: Block[], b: Block[]): boolean {
  return a.length === b.length && a.every((x, i) => {
    const y = b[i]
    return x.start === y.start && x.end === y.end && x.color === y.color && x.key === y.key && (x.key !== null || x.label === y.label)
  })
}

export const templateOf = (blocks: Block[]): TemplateId | null => TEMPLATE_IDS.find((id) => sameBlocks(blocks, TEMPLATES[id])) ?? null

/** 새 일정: 첫 빈 시간에서 최대 1시간, 빈 시간이 없으면 마지막 일정 끝에서 1시간 */
export function newBlock(blocks: Block[]): Block {
  const gap = blocks.length ? summarize(blocks, () => '').gaps[0] : undefined
  const start = gap ? gap[0] : blocks.length ? blocks[blocks.length - 1].end : 9 * 60
  const room = gap ? (gap[1] - gap[0] + DAY) % DAY || DAY : 60
  return { start, end: (start + Math.min(60, room)) % DAY, color: blocks.length % COLORS.length, key: null, label: '' }
}

/** 복제: 원래 일정이 끝나는 시각부터 같은 길이 */
export function duplicate(b: Block): Block {
  return { ...b, start: b.end, end: (b.end + dur(b)) % DAY }
}

// ── 입력 정리

const CTRL = /[\u0000-\u001f\u007f*]/g
/** 입력 중에는 trim 하지 않는다(띄어쓰기를 막지 않게). '*' 는 URL 구분자라 뺀다 */
export const cleanLabel = (s: string) => s.replace(CTRL, '').slice(0, LABEL_MAX)
export const cleanTitle = (s: string) => s.replace(CTRL, '').slice(0, TITLE_MAX)
export const cleanGoal = (s: string) => s.replace(CTRL, '').slice(0, GOAL_MAX)
export const snap = (m: number) => ((Math.round(m / STEP) * STEP) % DAY + DAY) % DAY

// ── URL: p = 블록들을 '*' 로 이음. 블록 = 시작칸 2자리 + 끝칸 2자리(10분 칸, 36진) + 색 1자리 + 키 1자리(36진, '-' 면 뒤에 직접 쓴 이름)

const b36 = (n: number) => n.toString(36).padStart(2, '0')

export function encodeBlocks(blocks: Block[]): string {
  return blocks.map((b) => {
    const head = b36(snap(b.start) / STEP) + b36(snap(b.end) / STEP) + String(b.color)
    return head + (b.key ? LABEL_KEYS.indexOf(b.key).toString(36) : '-' + cleanLabel(b.label).trim())
  }).join('*')
}

const PART = /^([0-9a-z]{2})([0-9a-z]{2})([0-7])([0-9a-z-])([\s\S]*)$/

/** 틀린 값이 하나라도 있으면 null(호출하는 쪽이 기본값으로) */
export function decodeBlocks(p: string | null): Block[] | null {
  if (!p) return null
  const parts = p.split('*')
  if (parts.length > MAX_BLOCKS) return null
  const out: Block[] = []
  for (const part of parts) {
    const m = PART.exec(part)
    if (!m) return null
    const s = parseInt(m[1], 36), e = parseInt(m[2], 36)
    if (s >= DAY / STEP || e >= DAY / STEP) return null
    let key: LabelKey | null = null, label = ''
    if (m[4] === '-') label = cleanLabel(m[5]).trim()
    else {
      key = LABEL_KEYS[parseInt(m[4], 36)] ?? null
      if (!key || m[5]) return null
    }
    out.push({ start: s * STEP, end: e * STEP, color: Number(m[3]), key, label })
  }
  return out
}

/** 모두 기본이면 '' (쿼리 없음) */
export function toQuery(plan: Plan): string {
  const q = new URLSearchParams()
  if (!sameBlocks(plan.blocks, DEFAULT_PLAN.blocks)) q.set('p', encodeBlocks(plan.blocks))
  if (plan.title !== null) q.set('t', cleanTitle(plan.title))
  if (plan.goal.trim()) q.set('g', cleanGoal(plan.goal).trim())
  return q.toString()
}

export const hasPlanQuery = (get: (k: string) => string | null) => ['p', 't', 'g'].some((k) => get(k) !== null)

export function fromQuery(get: (k: string) => string | null): Plan {
  const t = get('t')
  return {
    blocks: decodeBlocks(get('p')) ?? DEFAULT_PLAN.blocks,
    title: t === null ? null : cleanTitle(t),
    goal: cleanGoal(get('g') ?? '').trim(),
  }
}

/** localStorage 값도 같은 쿼리 문자열로 저장해 검증을 함께 쓴다 */
export function parseSaved(raw: string | null): Plan | null {
  if (!raw) return null
  const q = new URLSearchParams(raw)
  return q.get('p') !== null && decodeBlocks(q.get('p')) === null ? null : fromQuery((k) => q.get(k))
}

// ── 차트 기하 (viewBox 0 0 320 320)

export const VIEW = 320
export const C = VIEW / 2
export const R = 128
const f = (n: number) => Math.round(n * 100) / 100

export function polar(r: number, min: number): [number, number] {
  const a = (min / DAY) * 2 * Math.PI
  return [f(C + r * Math.sin(a)), f(C - r * Math.cos(a))]
}

export function wedgePath(start: number, minutes: number, r = R): string {
  const [x1, y1] = polar(r, start)
  const [x2, y2] = polar(r, start + minutes)
  return `M${C} ${C}L${x1} ${y1}A${r} ${r} 0 ${minutes > DAY / 2 ? 1 : 0} 1 ${x2} ${y2}Z`
}

export interface Wedge {
  i: number
  d: string
  fill: string
  /** 칸 안 글자 줄(기준선 y). 칸이 좁으면 빈 배열 */
  lines: { x: number; y: number; text: string; size: number; bold: boolean }[]
}

/** 50분 미만이면 이름을 숨기고(목록·툴팁에는 있다) 90분 미만이면 두 글자로 줄인다 */
export function chartModel(blocks: Block[], nameOf: (b: Block) => string, rangeOf: (b: Block) => string): Wedge[] {
  return blocks.flatMap((b, i) => {
    const d = dur(b)
    if (!d) return []
    const name = [...nameOf(b)]
    const lines: Wedge['lines'] = []
    if (d >= 50) {
      // 기준선은 글자 높이의 0.35배만큼 내려 가운데에 오게(dominant-baseline 은 렌더러마다 달라 쓰지 않는다)
      const [x, y] = polar(d >= 150 ? R * 0.56 : R * 0.72, b.start + d / 2)
      const shown = d < 90 ? name.slice(0, 2).join('') : name.length > 6 ? name.slice(0, 5).join('') + '…' : name.join('')
      if (d >= 150) lines.push({ x, y: f(y - 1), text: shown, size: 11, bold: true }, { x, y: f(y + 10), text: rangeOf(b), size: 8, bold: false })
      else lines.push({ x, y: f(y + 4), text: shown, size: 11, bold: true })
    }
    return [{ i, d: wedgePath(b.start, d), fill: COLORS[b.color] ?? COLORS[7], lines }]
  })
}

export const HOURS = Array.from({ length: 24 }, (_, h) => {
  const [x1, y1] = polar(R, h * 60)
  const [x2, y2] = polar(R + 5, h * 60)
  const [tx, ty] = polar(R + 16, h * 60)
  const size = h % 6 ? 9 : 11
  return { h, x1, y1, x2, y2, tx, ty: f(ty + size * 0.35), size, major: h % 6 === 0 }
})

// ── 내보내기 SVG (PNG·인쇄). 웹폰트가 없어도 그려지게 시스템 글꼴, 흰 바탕·고정 색

const FONT = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', sans-serif"
export const EXPORT_W = 800
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
/** 한글·한자는 1em, 나머지 0.6em 으로 어림한 폭에 맞춰 글자 크기를 줄인다 */
const fitSize = (s: string, max: number, width: number) => {
  const em = [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0)
  return Math.max(16, Math.min(max, Math.floor(width / Math.max(em, 1))))
}

export function exportSvg(wedges: Wedge[], title: string, goal: string, emptyText: string): { svg: string; width: number; height: number } {
  const scale = 2
  const top = title ? 96 : 32
  const chart = VIEW * scale
  const height = top + chart + (goal ? 84 : 24) + 28
  const ts = fitSize(title, 36, EXPORT_W - 80)
  const gs = fitSize(goal, 24, EXPORT_W - 80)
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_W}" height="${height}" viewBox="0 0 ${EXPORT_W} ${height}" font-family="${esc(FONT)}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    title ? `<text x="${EXPORT_W / 2}" y="${32 + ts}" text-anchor="middle" font-size="${ts}" font-weight="700" fill="${INK}">${esc(title)}</text>` : '',
    `<g transform="translate(${(EXPORT_W - chart) / 2} ${top}) scale(${scale})">`,
    `<circle cx="${C}" cy="${C}" r="${R}" fill="#f2f4f6" stroke="#d1d6db" stroke-width="1"/>`,
    ...wedges.map((w) => `<path d="${w.d}" fill="${w.fill}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>`),
    ...HOURS.map(({ h, x1, y1, x2, y2, tx, ty, size, major }) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8b95a1" stroke-width="${major ? 1.5 : 0.75}"/>` +
      `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="${size}" font-weight="${major ? 700 : 400}" fill="#4e5968">${h}</text>`),
    ...wedges.flatMap((w) => w.lines).map((l) =>
      `<text x="${l.x}" y="${l.y}" text-anchor="middle" font-size="${l.size}" font-weight="${l.bold ? 600 : 400}" fill="${INK}">${esc(l.text)}</text>`),
    wedges.length ? '' : `<text x="${C}" y="${C + 4}" text-anchor="middle" font-size="12" fill="#6b7684">${esc(emptyText)}</text>`,
    '</g>',
    goal ? `<text x="${EXPORT_W / 2}" y="${top + chart + 24 + gs}" text-anchor="middle" font-size="${gs}" font-weight="600" fill="#333842">${esc(goal)}</text>` : '',
    `<text x="${EXPORT_W - 24}" y="${height - 16}" text-anchor="end" font-size="13" fill="#8b95a1">toolhub.ai.kr</text>`,
    '</svg>',
  ]
  return { svg: parts.join(''), width: EXPORT_W, height }
}
