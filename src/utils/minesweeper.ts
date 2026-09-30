// 지뢰찾기 순수 로직: 시드 PRNG · 첫 클릭 3×3 안전 배치 · flood fill · chord · 3BV · 승리 판정
// · 추측 없는 판(기본 규칙 솔버 재시도) · 오늘의 지뢰찾기(KST) · 통계
// 회귀 체크: node scripts/check-minesweeper.ts
// 보드는 1차원 배열: i = r * w + c

export interface Layout { w: number; h: number; mine: boolean[]; count: number[] }
/** 0 = 없음, 1 = 깃발, 2 = 물음표 */
export type Mark = 0 | 1 | 2

export const PRESETS = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
} as const
export type Preset = keyof typeof PRESETS

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export function neighbors(w: number, h: number, i: number): number[] {
  const r = Math.floor(i / w), c = i % w, out: number[] = []
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < h && nc >= 0 && nc < w) out.push(nr * w + nc)
  }
  return out
}

/** 커스텀 입력 보정: 5~30열 · 5~24행 · 지뢰 1 ~ (칸 수 - 9) → 첫 클릭 3×3이 항상 비어 영역이 열림 */
export function clampConfig(w: number, h: number, mines: number) {
  const cw = Math.min(30, Math.max(5, Math.round(w) || 5))
  const ch = Math.min(24, Math.max(5, Math.round(h) || 5))
  return { w: cw, h: ch, mines: Math.min(cw * ch - 9, Math.max(1, Math.round(mines) || 1)) }
}

/** 첫 클릭 칸과 주변 8칸을 제외하고 지뢰 배치 (칸이 부족하면 첫 칸만 제외) */
export function generate(w: number, h: number, mines: number, first: number, rnd: () => number): Layout {
  const safe = new Set([first, ...neighbors(w, h, first)])
  let cand = Array.from({ length: w * h }, (_, i) => i).filter(i => !safe.has(i))
  if (cand.length < mines) cand = Array.from({ length: w * h }, (_, i) => i).filter(i => i !== first)
  for (let k = 0; k < mines; k++) { // 부분 Fisher-Yates
    const j = k + Math.floor(rnd() * (cand.length - k))
    ;[cand[k], cand[j]] = [cand[j], cand[k]]
  }
  const mine = new Array<boolean>(w * h).fill(false)
  for (let k = 0; k < mines; k++) mine[cand[k]] = true
  return withCounts(w, h, mine)
}

export function withCounts(w: number, h: number, mine: boolean[]): Layout {
  const count = mine.map((_, i) => neighbors(w, h, i).filter(n => mine[n]).length)
  return { w, h, mine, count }
}

/** 칸 열기(0이면 flood fill). open/marks는 호출자가 복사해서 넘길 것(변경됨). 깃발·물음표 칸은 안 열림 */
export function openCell(b: Layout, open: boolean[], marks: Mark[], i: number): { opened: number[]; boom: number } {
  if (open[i] || marks[i] === 1) return { opened: [], boom: -1 }
  if (b.mine[i]) { open[i] = true; return { opened: [i], boom: i } }
  const opened: number[] = []
  const stack = [i]
  open[i] = true
  while (stack.length) {
    const cur = stack.pop()!
    opened.push(cur)
    if (marks[cur] === 2) marks[cur] = 0
    if (b.count[cur]) continue
    for (const n of neighbors(b.w, b.h, cur)) {
      if (!open[n] && marks[n] !== 1 && !b.mine[n]) { open[n] = true; stack.push(n) }
    }
  }
  return { opened, boom: -1 }
}

/** 열린 숫자 칸 주변 깃발 수 == 숫자면 나머지 이웃을 모두 연다 (틀린 깃발이면 지뢰가 터짐) */
export function chord(b: Layout, open: boolean[], marks: Mark[], i: number): { opened: number[]; boom: number } {
  if (!open[i] || !b.count[i]) return { opened: [], boom: -1 }
  const ns = neighbors(b.w, b.h, i)
  if (ns.filter(n => marks[n] === 1).length !== b.count[i]) return { opened: [], boom: -1 }
  const opened: number[] = []
  let boom = -1
  for (const n of ns) {
    if (open[n] || marks[n] === 1) continue
    const r = openCell(b, open, marks, n)
    opened.push(...r.opened)
    if (r.boom >= 0 && boom < 0) boom = r.boom
  }
  return { opened, boom }
}

export const isWon = (b: Layout, open: boolean[]) => b.mine.every((m, i) => m || open[i])

/** 3BV: 최소 클릭 수 = 0 영역(openings) 수 + 0과 닿지 않은 숫자 칸 수 */
export function bbbv(b: Layout): number {
  const seen = new Array<boolean>(b.mine.length).fill(false)
  let n = 0
  for (let i = 0; i < b.mine.length; i++) {
    if (b.mine[i] || b.count[i] || seen[i]) continue
    n++
    const stack = [i]
    seen[i] = true
    while (stack.length) {
      const cur = stack.pop()!
      if (b.count[cur]) continue
      for (const x of neighbors(b.w, b.h, cur)) if (!seen[x]) { seen[x] = true; stack.push(x) }
    }
  }
  for (let i = 0; i < b.mine.length; i++) if (!b.mine[i] && !seen[i]) n++
  return n
}

/**
 * 추측 없이 풀리는지: 첫 칸에서 시작해 기본 규칙만 적용
 * ① 숫자 - 확정지뢰 = 미확정 이웃 수 → 전부 지뢰 / 0 → 전부 안전
 * ② 부분집합 규칙: A의 미확정 ⊂ B의 미확정 → B\A 에 (B남은 - A남은)개 → 0이면 안전, 크기와 같으면 지뢰
 * ③ 전체 남은 지뢰 수 0 → 나머지 안전 / 미확정 수와 같음 → 전부 지뢰
 * ponytail: 부분집합까지만(탱크 솔버·확률 없음) → 실제론 풀리는 판 일부를 '추측 필요'로 버림. 생성 재시도로 충분.
 */
export function solvable(b: Layout, first: number): boolean {
  const N = b.mine.length
  const open = new Array<boolean>(N).fill(false)
  const flag = new Array<boolean>(N).fill(false)
  const marks = new Array<Mark>(N).fill(0)
  const nb = Array.from({ length: N }, (_, i) => neighbors(b.w, b.h, i))
  const total = b.mine.filter(Boolean).length
  if (openCell(b, open, marks, first).boom >= 0) return false

  const reveal = (i: number) => { openCell(b, open, marks, i) } // 안전 판정만 하므로 지뢰일 수 없음
  for (;;) {
    let progress = false
    // 제약: 경계 숫자 칸의 (미확정 이웃, 남은 지뢰)
    const cons: { cells: number[]; left: number }[] = []
    for (let i = 0; i < N; i++) {
      if (!open[i] || !b.count[i]) continue
      const unk = nb[i].filter(n => !open[n] && !flag[n])
      if (!unk.length) continue
      const left = b.count[i] - nb[i].filter(n => flag[n]).length
      if (left === 0) { unk.forEach(reveal); progress = true }
      else if (left === unk.length) { unk.forEach(n => { flag[n] = true }); progress = true }
      else cons.push({ cells: unk, left })
    }
    if (progress) continue
    // 부분집합 규칙 (이웃하는 제약끼리만 비교)
    for (let a = 0; a < cons.length && !progress; a++) {
      const A = cons[a], setA = new Set(A.cells)
      for (let c = 0; c < cons.length; c++) {
        if (a === c) continue
        const B = cons[c]
        if (B.cells.length <= A.cells.length || !A.cells.every(x => B.cells.includes(x))) continue
        const rest = B.cells.filter(x => !setA.has(x)), diff = B.left - A.left
        if (diff === 0) { rest.forEach(reveal); progress = true; break }
        if (diff === rest.length) { rest.forEach(n => { flag[n] = true }); progress = true; break }
      }
    }
    if (progress) continue
    // 전체 지뢰 수
    const unknown = [...Array(N).keys()].filter(i => !open[i] && !flag[i])
    const minesLeft = total - flag.filter(Boolean).length
    if (!unknown.length) return true
    if (minesLeft === 0) { unknown.forEach(reveal); continue }
    if (minesLeft === unknown.length) return true
    return false
  }
}

/** 추측 없는 판 생성: 풀릴 때까지 재시도(최대 tries). 실패 시 마지막 판 + ok=false */
export function generateNoGuess(w: number, h: number, mines: number, first: number, rnd: () => number, tries = 400) {
  let b = generate(w, h, mines, first, rnd)
  for (let k = 1; k <= tries; k++) {
    if (solvable(b, first)) return { board: b, ok: true, tries: k }
    if (k < tries) b = generate(w, h, mines, first, rnd)
  }
  return { board: b, ok: false, tries }
}

// ── 오늘의 지뢰찾기 (KST) ────────────────────────────────────────────────────
const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const EPOCH = Date.UTC(2026, 0, 1) / DAY_MS // 2026-01-01(KST) = #1
export const dayNumber = (now: number) => Math.floor((now + KST_MS) / DAY_MS) - EPOCH + 1
export const msToNextDay = (now: number) => DAY_MS - ((now + KST_MS) % DAY_MS)

export const DAILY_PRESET: Preset = 'intermediate'
/** 모두 같은 판: 시드 = 회차. 시작 칸(가운데 부근)도 시드로 정하고 게임 시작 시 자동으로 열어 둔다 */
export function dailyBoard(day: number) {
  const { w, h, mines } = PRESETS[DAILY_PRESET]
  const rnd = mulberry32(0x5eed + day * 2654435761)
  const r = 4 + Math.floor(rnd() * (h - 8)), c = 4 + Math.floor(rnd() * (w - 8))
  const start = r * w + c
  return { ...generateNoGuess(w, h, mines, start, rnd), start }
}

export interface DailyRecord { won: boolean; ms: number; progress: number }
export type DailyRecords = Record<number, DailyRecord>

export function dailyStats(records: DailyRecords, today: number) {
  const days = Object.keys(records).map(Number).sort((a, b) => a - b)
  const wins = days.filter(d => records[d].won)
  let current = 0
  let d = records[today] ? today : today - 1
  while (records[d]?.won) { current++; d-- }
  return {
    played: days.length,
    winRate: days.length ? Math.round((wins.length / days.length) * 100) : 0,
    best: wins.length ? Math.min(...wins.map(x => records[x].ms)) : 0,
    current,
  }
}

/** 1:42.37 (precise) / 1:42 · 1시간 넘으면 분이 60 이상으로 계속 증가 */
export function fmtTime(ms: number, precise = true) {
  const s = Math.floor(ms / 1000)
  const base = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return precise ? `${base}.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}` : base
}
