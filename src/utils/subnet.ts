// IPv4/IPv6 서브넷 계산 순수 로직 (의존성 없음, v6는 BigInt). 회귀 체크: node scripts/check-subnet.ts
// IPv4 주소는 0 ~ 2^32-1 범위의 number(double)로 다룬다. 비트 연산은 >>>0으로 부호 없는 값 유지.

export interface Block { network: number; prefix: number }

export function parseIPv4(s: string): number | null {
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  let n = 0
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i])
    if (o > 255) return null
    n = n * 256 + o
  }
  return n
}

export const formatIPv4 = (n: number): string =>
  [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

export const prefixToMask = (p: number): number => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0)
export const blockSize = (p: number): number => 2 ** (32 - p)
export const networkOf = (ip: number, p: number): number => (ip & prefixToMask(p)) >>> 0
export const lastOf = (b: Block): number => b.network + blockSize(b.prefix) - 1
export const formatBlock = (b: Block): string => `${formatIPv4(b.network)}/${b.prefix}`

/** 연속된 1비트 마스크면 프리픽스 길이, 아니면 null */
export function maskToPrefix(m: number): number | null {
  const inv = ~m >>> 0
  if ((inv & (inv + 1)) !== 0) return null
  return 32 - Math.round(Math.log2(inv + 1))
}

/** 사용 가능 호스트 수: /31은 RFC 3021 point-to-point(2개), /32는 단일 호스트 */
export const usableHosts = (p: number): number => (p === 32 ? 1 : p === 31 ? 2 : blockSize(p) - 2)

// ── 입력 파싱 ──

export type V4Error = 'empty' | 'format' | 'ip' | 'prefix' | 'mask'
export type V4Via = 'cidr' | 'mask' | 'wildcard' | 'host'
export type V4Parsed = { ok: true; ip: number; prefix: number; via: V4Via } | { ok: false; error: V4Error }

/**
 * 허용 형식: 192.168.1.10/24 · 192.168.1.10/255.255.255.0 · 192.168.1.10 255.255.255.0
 *           10.0.0.0 0.255.255.255 (와일드카드) · 10.0.0.0 24 · 192.168.1.10 (단일 호스트 /32)
 */
export function parseV4Input(raw: string): V4Parsed {
  const s = raw.trim()
  if (!s) return { ok: false, error: 'empty' }
  const m = s.match(/^([\d.]+)(?:\s*\/\s*(\S+)|\s+(\S+))?$/)
  if (!m) return { ok: false, error: 'format' }
  const ip = parseIPv4(m[1])
  if (ip === null) return { ok: false, error: 'ip' }
  const part = m[2] ?? m[3]
  if (part === undefined) return { ok: true, ip, prefix: 32, via: 'host' }
  if (/^\d{1,2}$/.test(part)) {
    const p = Number(part)
    return p <= 32 ? { ok: true, ip, prefix: p, via: 'cidr' } : { ok: false, error: 'prefix' }
  }
  if (/^\d+$/.test(part)) return { ok: false, error: 'prefix' }
  const v = parseIPv4(part)
  if (v === null) return { ok: false, error: 'mask' }
  const p = maskToPrefix(v)
  if (p !== null) return { ok: true, ip, prefix: p, via: 'mask' }
  const wp = maskToPrefix(~v >>> 0)
  if (wp !== null) return { ok: true, ip, prefix: wp, via: 'wildcard' }
  return { ok: false, error: 'mask' }
}

// ── 주소 분류 ──

export type Scope =
  | 'thisNetwork' | 'private' | 'cgnat' | 'loopback' | 'linkLocal' | 'ietf' | 'documentation'
  | 'benchmark' | 'multicast' | 'broadcast' | 'reserved' | 'public'
  // v6 전용
  | 'unspecified' | 'v4mapped' | 'nat64' | 'sixToFour' | 'ula' | 'global'

// 순서 중요: 더 구체적인 대역을 먼저 (255.255.255.255 → 240/4 앞)
const V4_SPECIAL: [string, Scope, string][] = [
  ['0.0.0.0/8', 'thisNetwork', 'RFC 1122'],
  ['10.0.0.0/8', 'private', 'RFC 1918'],
  ['100.64.0.0/10', 'cgnat', 'RFC 6598'],
  ['127.0.0.0/8', 'loopback', 'RFC 1122'],
  ['169.254.0.0/16', 'linkLocal', 'RFC 3927'],
  ['172.16.0.0/12', 'private', 'RFC 1918'],
  ['192.0.0.0/24', 'ietf', 'RFC 6890'],
  ['192.0.2.0/24', 'documentation', 'RFC 5737'],
  ['192.168.0.0/16', 'private', 'RFC 1918'],
  ['198.18.0.0/15', 'benchmark', 'RFC 2544'],
  ['198.51.100.0/24', 'documentation', 'RFC 5737'],
  ['203.0.113.0/24', 'documentation', 'RFC 5737'],
  ['224.0.0.0/4', 'multicast', 'RFC 5771'],
  ['255.255.255.255/32', 'broadcast', 'RFC 919'],
  ['240.0.0.0/4', 'reserved', 'RFC 1112'],
]

export interface ScopeInfo { scope: Scope; rfc: string | null; block: string | null }

export function v4Scope(ip: number): ScopeInfo {
  for (const [cidr, scope, rfc] of V4_SPECIAL) {
    const [a, p] = cidr.split('/')
    const pre = Number(p)
    if (networkOf(ip, pre) === parseIPv4(a)) return { scope, rfc, block: cidr }
  }
  return { scope: 'public', rfc: null, block: null }
}

export function ipClass(ip: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  const o = ip >>> 24
  return o < 128 ? 'A' : o < 192 ? 'B' : o < 224 ? 'C' : o < 240 ? 'D' : 'E'
}

export const toBits = (n: number): string => n.toString(2).padStart(32, '0')
export const toHex = (n: number): string => n.toString(16).toUpperCase().padStart(8, '0')

/** 역방향 DNS 존. 옥텟 경계가 아니면 여러 존(최대 limit개), /25~/31은 RFC 2317 방식 */
export function reverseZones(network: number, p: number, limit = 4): { zones: string[]; total: number } {
  const o = [network >>> 24, (network >>> 16) & 255, (network >>> 8) & 255, network & 255]
  if (p === 32) return { zones: [`${o[3]}.${o[2]}.${o[1]}.${o[0]}.in-addr.arpa`], total: 1 }
  if (p > 24) return { zones: [`${o[3]}/${p}.${o[2]}.${o[1]}.${o[0]}.in-addr.arpa`], total: 1 }
  const k = Math.ceil(p / 8)
  const total = 2 ** (8 * k - p)
  const zones: string[] = []
  for (let i = 0; i < Math.min(total, limit); i++) {
    const a = network + i * 2 ** (32 - 8 * k)
    const oc = [a >>> 24, (a >>> 16) & 255, (a >>> 8) & 255, a & 255].slice(0, k).reverse()
    zones.push([...oc, 'in-addr', 'arpa'].join('.'))
  }
  return { zones, total }
}

export interface V4Info extends ScopeInfo {
  ip: number; prefix: number; mask: number; wildcard: number
  network: number; broadcast: number | null; first: number; last: number
  total: number; usable: number; cls: ReturnType<typeof ipClass>
}

export function v4Info(ip: number, prefix: number): V4Info {
  const mask = prefixToMask(prefix)
  const network = networkOf(ip, prefix)
  const end = lastOf({ network, prefix })
  return {
    ip, prefix, mask, wildcard: ~mask >>> 0, network,
    broadcast: prefix >= 31 ? null : end,
    first: prefix >= 31 ? network : network + 1,
    last: prefix >= 31 ? end : end - 1,
    total: blockSize(prefix),
    usable: usableHosts(prefix),
    cls: ipClass(ip),
    ...v4Scope(ip),
  }
}

// ── 서브넷팅 ──

/** network/prefix를 newPrefix로 균등 분할 (앞에서 limit개만) */
export function splitEqual(b: Block, newPrefix: number, limit = 256): { list: Block[]; total: number } {
  const total = 2 ** (newPrefix - b.prefix)
  const size = blockSize(newPrefix)
  const list: Block[] = []
  for (let i = 0; i < Math.min(total, limit); i++) list.push({ network: b.network + i * size, prefix: newPrefix })
  return { list, total }
}

/** h개 호스트를 수용하는 가장 작은 블록. ponytail: /30까지만 (VLSM의 LAN 관례), /31 링크는 계산 탭에서 */
export function prefixForHosts(h: number): number | null {
  if (!(h >= 1)) return null
  for (let p = 30; p >= 0; p--) if (usableHosts(p) >= h) return p
  return null
}

export interface VlsmReq { name: string; hosts: number }
export type VlsmRow = VlsmReq & ({ ok: true; block: Block } | { ok: false })

/** 큰 요구부터 순서대로 배치 (2의 거듭제곱 크기 + 내림차순이라 항상 정렬 경계에 맞음) */
export function vlsm(base: Block, reqs: VlsmReq[]): { rows: VlsmRow[]; used: number; free: Block[] } {
  const start = networkOf(base.network, base.prefix)
  const end = start + blockSize(base.prefix)
  const order = reqs.map((r, i) => ({ r, i })).sort((a, b) => b.r.hosts - a.r.hosts || a.i - b.i)
  let cur = start
  const rows: VlsmRow[] = []
  for (const { r } of order) {
    const p = prefixForHosts(r.hosts)
    if (p === null || cur + blockSize(p) > end) { rows.push({ ...r, ok: false }); continue }
    rows.push({ ...r, ok: true, block: { network: cur, prefix: p } })
    cur += blockSize(p)
  }
  return { rows, used: cur - start, free: cur < end ? rangeToCidrs(cur, end - 1) : [] }
}

/** "영업 60" / "영업: 60" / "60" 줄 목록 파싱 */
export function parseVlsmReqs(text: string): { reqs: VlsmReq[]; bad: string[] } {
  const reqs: VlsmReq[] = []
  const bad: string[] = []
  for (const line of text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)) {
    const m = line.match(/^(.*?)[\s:=]*(\d+)$/)
    const n = m ? Number(m[2]) : 0
    if (!m || n < 1) bad.push(line)
    else reqs.push({ name: m[1].trim(), hosts: n })
  }
  return { reqs, bad }
}

// ── 범위 · 요약 ──

/** start~end(포함)를 덮는 최소 CIDR 목록 */
export function rangeToCidrs(start: number, end: number): Block[] {
  const out: Block[] = []
  let cur = start
  while (cur <= end) {
    let p = 0
    while (cur % blockSize(p) !== 0 || cur + blockSize(p) - 1 > end) p++
    out.push({ network: cur, prefix: p })
    cur += blockSize(p)
  }
  return out
}

export type RangeParsed = { ok: true; start: number; end: number } | { ok: false; error: 'empty' | 'format' | 'ip' | 'order' }

/** "10.0.0.5 - 10.0.0.20", "10.0.0.5~10.0.0.20", "10.0.0.5-20"(끝 옥텟 축약) */
export function parseRange(raw: string): RangeParsed {
  const s = raw.trim()
  if (!s) return { ok: false, error: 'empty' }
  const m = s.match(/^([\d.]+)\s*(?:-|~|–|to)\s*([\d.]+)$/i)
  if (!m) return { ok: false, error: 'format' }
  const start = parseIPv4(m[1])
  const endStr = /^\d{1,3}$/.test(m[2]) ? m[1].replace(/\d+$/, m[2]) : m[2]
  const end = parseIPv4(endStr)
  if (start === null || end === null) return { ok: false, error: 'ip' }
  if (start > end) return { ok: false, error: 'order' }
  return { ok: true, start, end }
}

export interface ListEntry { text: string; block: Block | null; error: V4Error | null }

/** 줄/쉼표 구분 CIDR 목록. 단일 IP는 /32, 호스트 비트는 네트워크로 정규화 */
export function parseV4List(text: string): ListEntry[] {
  return text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean).map(t => {
    const r = parseV4Input(t)
    return r.ok
      ? { text: t, block: { network: networkOf(r.ip, r.prefix), prefix: r.prefix }, error: null }
      : { text: t, block: null, error: r.error }
  })
}

function mergedIntervals(blocks: Block[]): [number, number][] {
  const iv = blocks.map(b => [b.network, lastOf(b)] as [number, number]).sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const [s, e] of iv) {
    const last = out[out.length - 1]
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e)
    else out.push([s, e])
  }
  return out
}

/** 정확한 집계: 같은 주소 집합을 덮는 최소 CIDR 목록 (중복·포함·인접 병합) */
export const summarize = (blocks: Block[]): Block[] =>
  mergedIntervals(blocks).flatMap(([s, e]) => rangeToCidrs(s, e))

/** 전부 포함하는 단일 슈퍼넷 + 원래 목록에 없던 추가 주소 수 */
export function supernet(blocks: Block[]): { block: Block; extra: number } | null {
  if (!blocks.length) return null
  const iv = mergedIntervals(blocks)
  const lo = iv[0][0]
  const hi = iv[iv.length - 1][1]
  let p = 32
  while (networkOf(lo, p) !== networkOf(hi, p)) p--
  const covered = iv.reduce((s, [a, b]) => s + b - a + 1, 0)
  return { block: { network: networkOf(lo, p), prefix: p }, extra: blockSize(p) - covered }
}

export type Relation = 'same' | 'aContainsB' | 'bContainsA'

/** CIDR 블록은 포함 관계이거나 서로소 → 겹치면 항상 한쪽이 다른 쪽을 포함 */
export function overlaps(blocks: Block[]): { a: number; b: number; relation: Relation }[] {
  const out: { a: number; b: number; relation: Relation }[] = []
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const A = blocks[i], B = blocks[j]
      if (A.network > lastOf(B) || B.network > lastOf(A)) continue
      out.push({ a: i, b: j, relation: A.prefix === B.prefix ? 'same' : A.prefix < B.prefix ? 'aContainsB' : 'bContainsA' })
    }
  }
  return out
}

export const contains = (b: Block, ip: number): boolean => ip >= b.network && ip <= lastOf(b)

// ── IPv6 (BigInt, ES2017 타깃이라 리터럴 대신 BigInt()) ──

const B0 = BigInt(0)
const B1 = BigInt(1)
const B16 = BigInt(16)
const FFFF = BigInt(0xffff)
export const V6_MAX = (B1 << BigInt(128)) - B1

export function parseIPv6(raw: string): bigint | null {
  let s = raw.trim().toLowerCase()
  if (!s || /[^0-9a-f:.]/.test(s)) return null
  if (s.includes('.')) {
    const i = s.lastIndexOf(':')
    const v4 = i < 0 ? null : parseIPv4(s.slice(i + 1))
    if (v4 === null) return null
    s = `${s.slice(0, i + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  let groups: string[]
  if (halves.length === 1) {
    groups = head
  } else {
    const tail = halves[1] ? halves[1].split(':') : []
    if (head.length + tail.length > 7) return null
    groups = [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail]
  }
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return groups.reduce((acc, g) => (acc << B16) | BigInt(parseInt(g, 16)), B0)
}

const v6Groups = (n: bigint): number[] =>
  Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(112 - 16 * i)) & FFFF))

export const expandIPv6 = (n: bigint): string => v6Groups(n).map(g => g.toString(16).padStart(4, '0')).join(':')

/** RFC 5952: 소문자, 가장 긴(동률이면 앞) 2개 이상 0 그룹만 :: 압축 */
export function compressIPv6(n: bigint): string {
  const g = v6Groups(n)
  let bestS = -1, bestL = 0
  for (let i = 0; i < 8;) {
    if (g[i] !== 0) { i++; continue }
    let j = i
    while (j < 8 && g[j] === 0) j++
    if (j - i > bestL) { bestS = i; bestL = j - i }
    i = j
  }
  const h = g.map(x => x.toString(16))
  if (bestL < 2) return h.join(':')
  return `${h.slice(0, bestS).join(':')}::${h.slice(bestS + bestL).join(':')}`
}

export const v6Mask = (p: number): bigint => (p === 0 ? B0 : (((B1 << BigInt(p)) - B1) << BigInt(128 - p)))
export const v6Size = (p: number): bigint => B1 << BigInt(128 - p)

export type V6Parsed = { ok: true; ip: bigint; prefix: number } | { ok: false; error: 'empty' | 'ip' | 'prefix' }

export function parseV6Input(raw: string): V6Parsed {
  const s = raw.trim()
  if (!s) return { ok: false, error: 'empty' }
  const [addr, pre, ...rest] = s.split('/')
  const ip = parseIPv6(addr)
  if (ip === null || rest.length) return { ok: false, error: 'ip' }
  if (pre === undefined) return { ok: true, ip, prefix: 128 }
  if (!/^\d{1,3}$/.test(pre.trim()) || Number(pre) > 128) return { ok: false, error: 'prefix' }
  return { ok: true, ip, prefix: Number(pre) }
}

const V6_SPECIAL: [string, Scope, string][] = [
  ['::/128', 'unspecified', 'RFC 4291'],
  ['::1/128', 'loopback', 'RFC 4291'],
  ['::ffff:0:0/96', 'v4mapped', 'RFC 4291'],
  ['64:ff9b::/96', 'nat64', 'RFC 6052'],
  ['2001:db8::/32', 'documentation', 'RFC 3849'],
  ['2002::/16', 'sixToFour', 'RFC 3056'],
  ['fc00::/7', 'ula', 'RFC 4193'],
  ['fe80::/10', 'linkLocal', 'RFC 4291'],
  ['ff00::/8', 'multicast', 'RFC 4291'],
  ['2000::/3', 'global', 'RFC 4291'],
]

export function v6Scope(ip: bigint): ScopeInfo {
  for (const [cidr, scope, rfc] of V6_SPECIAL) {
    const [a, p] = cidr.split('/')
    const m = v6Mask(Number(p))
    if ((ip & m) === parseIPv6(a)) return { scope, rfc, block: cidr }
  }
  return { scope: 'reserved', rfc: null, block: null }
}

export function v6ReverseZones(network: bigint, p: number, limit = 4): { zones: string[]; total: number } {
  const k = Math.ceil(p / 4)
  if (k === 0) return { zones: ['ip6.arpa'], total: 1 }
  const total = 2 ** (4 * k - p)
  const nibbles = expandIPv6(network).replace(/:/g, '')
  const zones: string[] = []
  for (let i = 0; i < Math.min(total, limit); i++) {
    const head = nibbles.slice(0, k - 1) + (parseInt(nibbles[k - 1], 16) + i).toString(16)
    zones.push([...head.split('').reverse(), 'ip6', 'arpa'].join('.'))
  }
  return { zones, total }
}

export interface V6Info extends ScopeInfo {
  ip: bigint; prefix: number; network: bigint; last: bigint; total: bigint
}

export function v6Info(ip: bigint, prefix: number): V6Info {
  const mask = v6Mask(prefix)
  const network = ip & mask
  return { ip, prefix, network, last: network | (~mask & V6_MAX), total: v6Size(prefix), ...v6Scope(ip) }
}

/** 표준 할당 크기별 하위 서브넷 개수 (/48 → /64 = 65,536) */
export const V6_SPLIT_TARGETS = [32, 40, 44, 48, 52, 56, 60, 64]
export const v6SubnetCount = (p: number, target: number): bigint => B1 << BigInt(target - p)
