// 랜덤 뽑기(경품 추첨) 순수 로직. 검증: node scripts/check-random-picker.ts

export interface Entry {
  name: string
  /** 추첨권 수(가중치). "홍길동 x3" → 3 */
  weight: number
}

export interface ParseResult {
  entries: Entry[]
  /** dedupe로 합쳐진 줄 수 */
  removed: number
}

const WEIGHT_RE = /^(.+?)(?:\s+[xX×*]|\s*[×*])\s*(\d{1,4})$/
export const MAX_WEIGHT = 1000

/** 줄바꿈 또는 쉼표로 구분된 목록 → 참가자. dedupe=true면 같은 이름은 첫 줄만 남김. */
export function parseEntries(text: string, dedupe: boolean): ParseResult {
  const entries: Entry[] = []
  const seen = new Set<string>()
  let removed = 0
  for (const raw of text.split(/[\n,]+/)) {
    const line = raw.trim()
    if (!line) continue
    const m = WEIGHT_RE.exec(line)
    const name = (m ? m[1] : line).trim()
    const weight = m ? Math.min(MAX_WEIGHT, Math.max(1, parseInt(m[2], 10))) : 1
    if (dedupe) {
      const key = name.toLowerCase()
      if (seen.has(key)) { removed++; continue }
      seen.add(key)
    }
    entries.push({ name, weight })
  }
  return { entries, removed }
}

// ── 시드 PRNG: cyrb128 해시 → sfc32 (128비트 상태) ──
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

/** 같은 시드 문자열 → 항상 같은 [0,1) 수열 */
export function seededRng(seed: string): () => number {
  let [a, b, c, d] = cyrb128(seed)
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

/** crypto.getRandomValues로 만든 시드 (영소문자+숫자 10자, 약 51비트) */
export function newSeed(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789' // 헷갈리는 l/o/0/1 제외, 32자
  const buf = new Uint8Array(10)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => chars[b & 31]).join('')
}

/**
 * 가중치 비복원 추첨. 반환 = 당첨 순서대로의 entries 인덱스.
 * exclude: 이전 라운드 당첨자 이름(대소문자 무시) — 해당 이름의 모든 줄 제외.
 */
export function drawWinners(entries: Entry[], count: number, rng: () => number, exclude: Iterable<string> = []): number[] {
  const ex = new Set(Array.from(exclude, (n) => n.toLowerCase()))
  const pool = entries.map((e, i) => i).filter((i) => !ex.has(entries[i].name.toLowerCase()))
  const winners: number[] = []
  // ponytail: O(n·k) 누적합 탐색 — 수만 명 이상이면 Fenwick 트리로
  while (winners.length < count && pool.length > 0) {
    const total = pool.reduce((s, i) => s + entries[i].weight, 0)
    let r = rng() * total
    let k = 0
    while (k < pool.length - 1 && r >= entries[pool[k]].weight) { r -= entries[pool[k]].weight; k++ }
    const idx = pool[k]
    winners.push(idx)
    // 같은 이름이 여러 줄(중복 허용)이어도 한 사람은 한 번만 당첨
    const name = entries[idx].name.toLowerCase()
    for (let j = pool.length - 1; j >= 0; j--) if (entries[pool[j]].name.toLowerCase() === name) pool.splice(j, 1)
  }
  return winners
}

/** 뽑을 수 있는 서로 다른 이름 수 */
export function eligibleCount(entries: Entry[], exclude: Iterable<string> = []): number {
  const ex = new Set(Array.from(exclude, (n) => n.toLowerCase()))
  return new Set(entries.map((e) => e.name.toLowerCase()).filter((n) => !ex.has(n))).size
}

/** 참가자 목록을 URL용 텍스트로 (가중치 표기 유지) */
export function serializeEntries(entries: Entry[]): string {
  return entries.map((e) => (e.weight > 1 ? `${e.name} x${e.weight}` : e.name)).join('\n')
}
