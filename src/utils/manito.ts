// 마니또(비밀 친구) 뽑기 순수 로직. 검증: node scripts/check-manito.ts
// 배정 = 한 바퀴(A→B→C→…→A). 서로 맞뽑기·자기 자신이 없고, 제외 쌍은 어느 방향으로도 잇지 않는다.
// 개인 링크 = /manito/#1<가린 JSON>. # 뒤는 서버로 가지 않고, 가림은 화면·주소창에서 이름이 바로 읽히지 않게 할 뿐 암호가 아니다.

export const MIN_PEOPLE = 3
export const MAX_PEOPLE = 50
export const MAX_NAME = 20
export const MAX_GROUP = 30
export const MAX_MEMO = 100

/** 줄바꿈·쉼표로 나눈 이름 (앞뒤 공백 제거, 빈 칸 제외, 20자까지) */
export const parseNames = (text: string) => text.split(/[\n,]+/).map(s => s.trim().slice(0, MAX_NAME)).filter(Boolean)
export const duplicates = (names: string[]) => [...new Set(names.filter((n, i) => names.indexOf(n) !== i))]

/** 같은 시드면 같은 수열 (첫 화면 예시 배정을 서버·브라우저가 똑같이 그리도록) */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = <T,>(xs: T[], rand: () => number) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export type Pair = [string, string]

/**
 * 한 바퀴 배정 {주는 사람: 받는 사람}. 이름은 서로 달라야 한다.
 * 무작위 순서로 이어 가다 막히면 되돌아가는 탐색(제외 규칙이 없으면 첫 시도에 끝나고, 균등한 무작위 순환이 된다).
 * 불가능하거나 탐색이 너무 길어지면 null.
 */
export function drawCycle(names: string[], exclude: Pair[] = [], rand: () => number = Math.random): Record<string, string> | null {
  const n = names.length
  if (n < MIN_PEOPLE || new Set(names).size !== n) return null
  const banned = new Set(exclude.flatMap(([a, b]) => [`${a}\u0000${b}`, `${b}\u0000${a}`]))
  const ok = (a: string, b: string) => a !== b && !banned.has(`${a}\u0000${b}`)
  const order = shuffle(names, rand)
  const path = [order[0]]
  const used = new Set(path)
  let budget = 200_000 // ponytail: 탐색 상한, 50명에 제외 규칙이 아주 많으면 '불가'로 본다
  const extend = (): boolean => {
    if (--budget < 0) return false
    const last = path[path.length - 1]
    if (path.length === n) return ok(last, path[0])
    for (const next of shuffle(order.filter(x => !used.has(x) && ok(last, x)), rand)) {
      path.push(next); used.add(next)
      if (extend()) return true
      path.pop(); used.delete(next)
    }
    return false
  }
  if (!extend()) return null
  return Object.fromEntries(path.map((p, i) => [p, path[(i + 1) % n]]))
}

/** 개인 링크에 담는 내용 */
export interface Card { g?: string; f: string; t: string; b?: number; d?: string; m?: string }

const KEY = 'toolhub-manito'
const mask = (bytes: Uint8Array) => bytes.map((x, i) => x ^ KEY.charCodeAt(i % KEY.length))

export function encodeCard(c: Card): string {
  const body: Card = { f: c.f, t: c.t, ...(c.g ? { g: c.g } : {}), ...(c.b ? { b: c.b } : {}), ...(c.d ? { d: c.d } : {}), ...(c.m ? { m: c.m } : {}) }
  const bytes = mask(new TextEncoder().encode(JSON.stringify(body)))
  let bin = ''
  for (const x of bytes) bin += String.fromCharCode(x)
  return '1' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const str = (v: unknown, max: number, required = false) =>
  v === undefined && !required ? true : typeof v === 'string' && v.length > 0 && v.length <= max

export function decodeCard(hash: string): Card | null {
  const s = hash.replace(/^#/, '')
  if (!s.startsWith('1') || !/^[A-Za-z0-9_-]+$/.test(s.slice(1))) return null
  try {
    const b64 = s.slice(1).replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    const c = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mask(Uint8Array.from(bin, ch => ch.charCodeAt(0))))) as Card
    if (!c || typeof c !== 'object' || !str(c.f, MAX_NAME, true) || !str(c.t, MAX_NAME, true) || !str(c.g, MAX_GROUP) || !str(c.m, MAX_MEMO)) return null
    if (c.b !== undefined && !(Number.isInteger(c.b) && c.b > 0 && c.b <= 100_000_000)) return null
    if (c.d !== undefined && !(typeof c.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.d))) return null
    return { f: c.f, t: c.t, ...(c.g ? { g: c.g } : {}), ...(c.b ? { b: c.b } : {}), ...(c.d ? { d: c.d } : {}), ...(c.m ? { m: c.m } : {}) }
  } catch {
    return null
  }
}

/** 미션 아이디어 k개를 링크마다 다르게(같은 링크는 늘 같게) 고른다 */
export function pickMissions(seed: string, total: number, k: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return shuffle(Array.from({ length: total }, (_, i) => i), seeded(h)).slice(0, Math.min(k, total))
}
