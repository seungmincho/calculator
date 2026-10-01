// 네모로직(Picross) 순수 로직: 힌트 · 라인 솔버(유일해 보장) · 퍼즐 생성 · 오늘의 퍼즐 · 연속 기록 · 공유 문구
// 회귀 체크: node scripts/check-picross.ts

export type GridSize = 5 | 10 | 15
export const SIZES: GridSize[] = [5, 10, 15]

export function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── 힌트 ───────────────────────────────────────────────────────────────────
/** 칠해진 칸 연속 길이 목록. 빈 줄 = [0] */
export function lineClue(line: boolean[]): number[] {
  const out: number[] = []
  let run = 0
  for (const v of line) {
    if (v) run++
    else if (run) { out.push(run); run = 0 }
  }
  if (run) out.push(run)
  return out.length ? out : [0]
}
export const rowClues = (g: boolean[][]) => g.map(lineClue)
export const colClues = (g: boolean[][]) => g[0].map((_, c) => lineClue(g.map(row => row[c])))

// ── 라인 솔버 ──────────────────────────────────────────────────────────────
// 칸 값: -1 미정, 0 빈칸, 1 칠함
/** 한 줄에서 힌트와 현재 칸으로 확정 가능한 칸을 채운 새 배열. 모순이면 null */
export function solveLine(clue: number[], cells: number[]): number[] | null {
  const blocks = clue[0] === 0 ? [] : clue
  const n = cells.length, k = blocks.length
  // filledUpTo[i] = cells[0..i)에 1이 있는지 판정용 누적합 / 0 누적합
  const ones = [0], zeros = [0]
  for (const v of cells) { ones.push(ones[ones.length - 1] + (v === 1 ? 1 : 0)); zeros.push(zeros[zeros.length - 1] + (v === 0 ? 1 : 0)) }
  const hasOne = (a: number, b: number) => ones[b] - ones[a] > 0
  const hasZero = (a: number, b: number) => zeros[b] - zeros[a] > 0
  // ok[b][i]: 블록 b..k-1을 칸 i..n-1에 놓을 수 있는가 (i는 새 구간의 시작)
  const ok: boolean[][] = Array.from({ length: k + 1 }, () => Array(n + 2).fill(false))
  for (let i = n + 1; i >= 0; i--) ok[k][i] = i >= n || !hasOne(i, n)
  for (let b = k - 1; b >= 0; b--) {
    const L = blocks[b]
    for (let i = n; i >= 0; i--) {
      let v = i < n && cells[i] !== 1 && ok[b][i + 1]
      if (!v && i + L <= n && !hasZero(i, i + L) && (i + L === n || cells[i + L] !== 1)) v = ok[b + 1][Math.min(i + L + 1, n)]
      ok[b][i] = v
    }
  }
  if (!ok[0][0]) return null
  const canFill = Array(n).fill(false), canEmpty = Array(n).fill(false)
  const seen = new Set<number>()
  const stack: [number, number][] = [[0, 0]]
  while (stack.length) {
    const [b, i] = stack.pop()!
    const key = b * (n + 2) + i
    if (seen.has(key)) continue
    seen.add(key)
    if (b === k) { for (let x = i; x < n; x++) canEmpty[x] = true; continue }
    if (i >= n) continue
    const L = blocks[b]
    if (cells[i] !== 1 && ok[b][i + 1]) { canEmpty[i] = true; stack.push([b, i + 1]) }
    if (i + L <= n && !hasZero(i, i + L) && (i + L === n || cells[i + L] !== 1) && ok[b + 1][Math.min(i + L + 1, n)]) {
      for (let x = i; x < i + L; x++) canFill[x] = true
      if (i + L < n) canEmpty[i + L] = true
      stack.push([b + 1, Math.min(i + L + 1, n)])
    }
  }
  return cells.map((v, x) => (v !== -1 ? v : canFill[x] && !canEmpty[x] ? 1 : canEmpty[x] && !canFill[x] ? 0 : -1))
}

/** 줄 단위 추론만으로 풀기. 다 풀리면 해(=유일해), 막히면 null. 추측 없이 풀리는 퍼즐만 통과 */
export function lineSolve(rows: number[][], cols: number[][]): boolean[][] | null {
  const R = rows.length, C = cols.length
  const g: number[][] = Array.from({ length: R }, () => Array(C).fill(-1))
  let dirtyR = new Set(rows.map((_, i) => i)), dirtyC = new Set(cols.map((_, i) => i))
  while (dirtyR.size || dirtyC.size) {
    const nextR = new Set<number>(), nextC = new Set<number>()
    for (const r of dirtyR) {
      const res = solveLine(rows[r], g[r])
      if (!res) return null
      res.forEach((v, c) => { if (g[r][c] !== v) { g[r][c] = v; nextC.add(c) } })
    }
    for (const c of [...dirtyC, ...nextC]) {
      const res = solveLine(cols[c], g.map(row => row[c]))
      if (!res) return null
      res.forEach((v, r) => { if (g[r][c] !== v) { g[r][c] = v; nextR.add(r) } })
    }
    dirtyR = nextR
    dirtyC = new Set()
  }
  return g.every(row => row.every(v => v !== -1)) ? g.map(row => row.map(v => v === 1)) : null
}

// ── 생성 ───────────────────────────────────────────────────────────────────
const BASE_DENSITY = 0.55
const MAX_ATTEMPTS = 60

function randomGrid(size: number, density: number, rng: () => number): boolean[][] {
  const g = Array.from({ length: size }, () => Array.from({ length: size }, () => rng() < density))
  // 빈 줄 없게 (0 힌트만 있는 줄은 재미 없음)
  for (let r = 0; r < size; r++) if (!g[r].some(Boolean)) g[r][Math.floor(rng() * size)] = true
  for (let c = 0; c < size; c++) if (!g.some(row => row[c])) g[Math.floor(rng() * size)][c] = true
  return g
}

/**
 * 시드 고정 퍼즐: 줄 추론만으로 유일하게 풀리는 것만 반환 (같은 시드 = 같은 퍼즐).
 * 실패하면 밀도를 조금씩 올려 재시도 — 밀도가 높을수록 겹침 추론이 쉬워짐.
 * 평균 밀도 ~0.57, 15×15도 몇 ms (check-picross가 450개로 측정).
 */
export function generatePuzzle(size: GridSize, seed: number): boolean[][] {
  const rng = mulberry32((seed ^ (size * 0x9e3779b1)) | 0)
  for (let a = 0; a < MAX_ATTEMPTS; a++) {
    const density = Math.min(0.9, BASE_DENSITY + a * 0.006)
    const g = randomGrid(size, density, rng)
    if (lineSolve(rowClues(g), colClues(g))) return g
  }
  // 안전망: 밀도 0.9 = 거의 꽉 찬 줄이라 겹침만으로 풀림 — 사실상 도달하지 않음
  for (;;) {
    const g = randomGrid(size, 0.9, rng)
    if (lineSolve(rowClues(g), colClues(g))) return g
  }
}

// ── 오늘의 퍼즐 (KST, 한글 워들·행맨과 같은 회차 번호) ──────────────────────
const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const EPOCH = Date.UTC(2026, 0, 1) / DAY_MS // 2026-01-01(KST) = #1
export const dayNumber = (now: number) => Math.floor((now + KST_MS) / DAY_MS) - EPOCH + 1
export const msToNextDay = (now: number) => DAY_MS - ((now + KST_MS) % DAY_MS)
/** 회차·크기별 고정 시드 (모두에게 같은 퍼즐) */
export const dailySeed = (day: number, size: GridSize) => (Math.imul(day, 2654435761) ^ (size * 40503)) >>> 0

// ── 기록 ───────────────────────────────────────────────────────────────────
export interface SolveRecord { time: number; mistakes: number; rows: number[] }
/** 회차 → 크기 → 기록 */
export type DailyRecords = Record<number, Partial<Record<GridSize, SolveRecord>>>

/** 연속 기록: 하루에 아무 크기나 하나 풀면 그날 성공. 오늘 아직 안 풀었으면 어제까지로 계산 */
export function computeStreak(records: DailyRecords, today: number) {
  const days = new Set(Object.entries(records).filter(([, r]) => r && Object.keys(r).length).map(([d]) => Number(d)))
  let current = 0
  for (let d = days.has(today) ? today : today - 1; days.has(d); d--) current++
  let max = 0, run = 0, prev = -Infinity
  for (const d of [...days].sort((a, b) => a - b)) { run = d === prev + 1 ? run + 1 : 1; prev = d; max = Math.max(max, run) }
  return { current, max, played: days.size }
}

// ── 공유 ───────────────────────────────────────────────────────────────────
export const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/** 스포일러 없는 줄별 정확도: 🟩 실수 없음 · 🟨 1번 · 🟥 2번 이상 (5칸마다 줄바꿈) */
export function shareRows(rows: number[]): string {
  const e = rows.map(m => (m === 0 ? '🟩' : m === 1 ? '🟨' : '🟥'))
  const lines: string[] = []
  for (let i = 0; i < e.length; i += 5) lines.push(e.slice(i, i + 5).join(''))
  return lines.join('\n')
}

export function shareText(o: { title: string; day?: number; size: GridSize; time: number; mistakes: number; rows: number[]; streak?: number; url?: string }) {
  const head = `${o.title}${o.day ? ` #${o.day}` : ''} ${o.size}×${o.size} ⏱${formatTime(o.time)}${o.mistakes ? ` ❌${o.mistakes}` : ' ✨'}${o.streak && o.streak > 1 ? ` 🔥${o.streak}` : ''}`
  return [head, shareRows(o.rows), ...(o.url ? [o.url] : [])].join('\n')
}
