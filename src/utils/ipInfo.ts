// 내 IP 확인 도구 순수 헬퍼 (IP 버전/분류, UA 파싱, 시간대 비교, WebRTC 후보 파싱, 텍스트 리포트)
// 회귀 체크: node scripts/check-ip-info.ts

export type IpVersion = 4 | 6

const V4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

/** IPv6를 8개 16비트 그룹으로 펼침. 형식이 틀리면 null. (IPv4 내장 형식 ::ffff:1.2.3.4 지원, zone id %eth0 무시) */
export function expandIPv6(input: string): number[] | null {
  let s = input.trim().replace(/^\[|\]$/g, '').split('%')[0].toLowerCase()
  if (!s.includes(':')) return null
  // 끝부분 IPv4 → 16진 2그룹
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (m) {
    if (!V4.test(m[2])) return null
    const b = m[2].split('.').map(Number)
    s = m[1] + ((b[0] << 8) | b[1]).toString(16) + ':' + ((b[2] << 8) | b[3]).toString(16)
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const part = (h: string) => (h === '' ? [] : h.split(':'))
  const head = part(halves[0])
  const tail = halves.length === 2 ? part(halves[1]) : []
  const groups = [...head, ...tail]
  if (!groups.every(g => /^[0-9a-f]{1,4}$/.test(g))) return null
  const fill = 8 - groups.length
  if (halves.length === 2 ? fill < 1 : fill !== 0) return null
  return [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail].map(g => parseInt(g, 16))
}

export function ipVersion(ip: string): IpVersion | null {
  const s = ip.trim()
  if (V4.test(s)) return 4
  return expandIPv6(s) ? 6 : null
}

/** 전체 표기 (2001:0db8:0000:...) */
export function fullIPv6(ip: string): string | null {
  const g = expandIPv6(ip)
  return g ? g.map(n => n.toString(16).padStart(4, '0')).join(':') : null
}

export type IpClass = 'public' | 'private' | 'loopback' | 'linkLocal' | 'cgnat' | 'uniqueLocal' | 'multicast' | 'reserved'

export function classifyIp(ip: string): IpClass | null {
  const v = ipVersion(ip)
  if (v === 4) {
    const [a, b] = ip.trim().split('.').map(Number)
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private'
    if (a === 127) return 'loopback'
    if (a === 169 && b === 254) return 'linkLocal'
    if (a === 100 && b >= 64 && b <= 127) return 'cgnat'
    if (a >= 224 && a <= 239) return 'multicast'
    if (a === 0 || a >= 240) return 'reserved'
    return 'public'
  }
  if (v === 6) {
    const g = expandIPv6(ip)!
    if (g.every((x, i) => (i < 7 ? x === 0 : x === 1))) return 'loopback'
    if (g.every(x => x === 0)) return 'reserved'
    // IPv4-mapped (::ffff:a.b.c.d) → 내장 IPv4 기준
    if (g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff) {
      return classifyIp(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`)
    }
    if ((g[0] & 0xffc0) === 0xfe80) return 'linkLocal'
    if ((g[0] & 0xfe00) === 0xfc00) return 'uniqueLocal'
    if ((g[0] & 0xff00) === 0xff00) return 'multicast'
    if (g[0] === 0x2001 && g[1] === 0x0db8) return 'reserved' // 문서용
    return 'public'
  }
  return null
}

export interface ParsedUA {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: 'mobile' | 'tablet' | 'desktop'
}

/** 최소 UA 파서 — 주요 브라우저/OS만. 순서 중요(Edge/Whale/Samsung/Opera가 Chrome 토큰을 포함). */
export function parseUA(ua: string): ParsedUA {
  const pick = (re: RegExp) => ua.match(re)?.[1] ?? ''
  const browsers: [string, RegExp][] = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ['Whale', /Whale\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['KakaoTalk', /KAKAOTALK\s+([\d.]+)/i],
    ['NAVER', /NAVER\(inapp;[^)]*?([\d.]+)\)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ]
  let browser = 'Unknown'
  let browserVersion = ''
  for (const [name, re] of browsers) {
    const v = ua.match(re)
    if (v) { browser = name; browserVersion = v[1].split('.')[0]; break }
  }

  let os = 'Unknown'
  let osVersion = ''
  if (/iPhone|iPad|iPod/.test(ua)) { os = 'iOS'; osVersion = pick(/OS (\d+(?:_\d+)?)/).replace('_', '.') }
  else if (/Android/.test(ua)) { os = 'Android'; osVersion = pick(/Android ([\d.]+)/) }
  else if (/Windows NT/.test(ua)) { os = 'Windows'; osVersion = pick(/Windows NT ([\d.]+)/) === '10.0' ? '10/11' : pick(/Windows NT ([\d.]+)/) }
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Mac OS X/.test(ua)) { os = 'macOS'; osVersion = pick(/Mac OS X (\d+(?:[_.]\d+)?)/).replace('_', '.') }
  else if (/Linux/.test(ua)) os = 'Linux'

  const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'tablet'
    : /Mobi|iPhone|iPod/.test(ua) ? 'mobile' : 'desktop'
  return { browser, browserVersion, os, osVersion, device }
}

/** 해당 시간대의 UTC 오프셋(분). 알 수 없는 tz면 null */
export function tzOffsetMinutes(tz: string, at: Date): number | null {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? ''
    if (name === 'GMT') return 0
    const m = name.match(/GMT([+-])(\d{2}):(\d{2})/)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null
  } catch {
    return null
  }
}

/** 브라우저 시간대와 IP 위치 시간대의 현재 오프셋이 다르면 true (이름만 다른 Asia/Seoul·Asia/Tokyo는 같음 처리) */
export function tzMismatch(browserTz: string, ipTz: string, at: Date): boolean {
  if (!browserTz || !ipTz) return false
  const a = tzOffsetMinutes(browserTz, at)
  const b = tzOffsetMinutes(ipTz, at)
  return a !== null && b !== null && a !== b
}

export function formatOffset(min: number): string {
  const sign = min < 0 ? '-' : '+'
  const abs = Math.abs(min)
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

export interface IceAddress {
  address: string
  type: string // host | srflx | relay | prflx
  mdns: boolean
}

/** ICE candidate 문자열에서 주소 추출. "candidate:... 1 udp 2122260223 192.168.0.5 54321 typ host ..." */
export function parseCandidate(line: string): IceAddress | null {
  const m = line.match(/candidate:\S+ \d+ \S+ \d+ (\S+) \d+ typ (\w+)/)
  if (!m) return null
  return { address: m[1], type: m[2], mdns: m[1].endsWith('.local') }
}

/** "라벨: 값" 줄 목록 → 복사용 텍스트 (빈 값은 제외, 섹션 사이 빈 줄) */
export function buildReport(sections: { title: string; rows: [string, string | undefined | null][] }[]): string {
  return sections
    .map(s => {
      const rows = s.rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`)
      return rows.length ? [`[${s.title}]`, ...rows].join('\n') : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
