// QR 코드 순수 로직: 유형별 payload 문자열, 이스케이프, 색 대비, SVG·로고·인쇄 배치 계산.
// 회귀 체크: node scripts/check-qr-payload.ts

export const QR_TYPES = ['url', 'text', 'wifi', 'vcard', 'sms', 'email', 'phone', 'geo'] as const
export type QrType = (typeof QR_TYPES)[number]
export type WifiSecurity = 'WPA' | 'WEP' | 'nopass'
export type Ecc = 'L' | 'M' | 'Q' | 'H'

export interface QrFields {
  url: string
  text: string
  ssid: string
  password: string
  security: WifiSecurity
  hidden: boolean
  name: string
  tel: string
  email: string
  org: string
  site: string
  smsTo: string
  smsBody: string
  mailTo: string
  subject: string
  body: string
  phone: string
  place: string
  geoFormat: 'map' | 'geo'
}

export const EMPTY_FIELDS: QrFields = {
  url: '', text: '', ssid: '', password: '', security: 'WPA', hidden: false,
  name: '', tel: '', email: '', org: '', site: '', smsTo: '', smsBody: '',
  mailTo: '', subject: '', body: '', phone: '', place: '', geoFormat: 'map',
}

/** Wi-Fi(ZXing 형식) 특수문자 \ ; , : " 앞에 백슬래시 */
export const escapeWifi = (s: string) => s.replace(/[\\;,:"]/g, (c) => '\\' + c)

/** vCard 텍스트 값: \ , ; 이스케이프, 줄바꿈 → \n */
export const escapeVcard = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\r\n|\r|\n/g, '\\n')

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
/** 전화번호: 공백·하이픈·괄호·점 제거 (+, 숫자, *, # 유지) */
export const cleanPhone = (s: string) => s.replace(/[\s\-().]/g, '')

/** 스킴이 없으면 https:// 붙임 */
export const normalizeUrl = (s: string) => {
  const v = s.trim()
  if (!v) return ''
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
}

/** "37.5665, 126.978" → [37.5665, 126.978] (범위 밖이면 null) */
export function parseCoords(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return null
  const lat = +m[1], lng = +m[2]
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
}

/** 유형별 QR 문자열. 필수값이 비면 '' */
export function buildPayload(type: QrType, f: QrFields): string {
  switch (type) {
    case 'url':
      return normalizeUrl(f.url)
    case 'text':
      return f.text.trim() ? f.text : ''
    case 'wifi': {
      if (!f.ssid) return ''
      const pass = f.security === 'nopass' ? '' : `P:${escapeWifi(f.password)};`
      return `WIFI:T:${f.security};S:${escapeWifi(f.ssid)};${pass}H:${f.hidden ? 'true' : 'false'};;`
    }
    case 'vcard': {
      const name = f.name.trim()
      if (!name) return ''
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVcard(name)};;;;`, `FN:${escapeVcard(name)}`]
      if (f.org.trim()) lines.push(`ORG:${escapeVcard(f.org.trim())}`)
      if (f.tel.trim()) lines.push(`TEL;TYPE=CELL:${cleanPhone(oneLine(f.tel))}`)
      if (f.email.trim()) lines.push(`EMAIL:${oneLine(f.email)}`)
      if (f.site.trim()) lines.push(`URL:${normalizeUrl(oneLine(f.site))}`)
      lines.push('END:VCARD')
      return lines.join('\r\n')
    }
    case 'sms': {
      const to = cleanPhone(f.smsTo)
      return to ? `SMSTO:${to}:${f.smsBody}` : ''
    }
    case 'email': {
      const to = f.mailTo.trim()
      if (!to) return ''
      const q = [
        f.subject.trim() && `subject=${encodeURIComponent(f.subject.trim())}`,
        f.body.trim() && `body=${encodeURIComponent(f.body)}`,
      ].filter(Boolean)
      return `mailto:${to}${q.length ? '?' + q.join('&') : ''}`
    }
    case 'phone': {
      const p = cleanPhone(f.phone)
      return p ? `tel:${p}` : ''
    }
    case 'geo': {
      const place = f.place.trim()
      if (!place) return ''
      const c = parseCoords(place)
      if (f.geoFormat === 'geo') return c ? `geo:${c[0]},${c[1]}` : `geo:0,0?q=${encodeURIComponent(place)}`
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c ? `${c[0]},${c[1]}` : place)}`
    }
  }
}

// ── 색 대비 (WCAG 상대 휘도) ──
export function parseHex(s: string): string | null {
  const m = s.trim().replace(/^#/, '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return '#' + h.toLowerCase()
}

export function luminance(hex: string): number {
  const h = parseHex(hex) ?? '#000000'
  const ch = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** ponytail: 스캔 대비 기준은 공식 수치가 없어 4:1을 "권장"으로 둠 */
export const MIN_CONTRAST = 4

// ── 밀도 ──
export const density = (version: number): 'low' | 'mid' | 'high' => (version <= 4 ? 'low' : version <= 10 ? 'mid' : 'high')

// ── 로고 위치 (모듈 단위, 여백 포함 좌표) ──
export function logoRect(n: number, margin: number, pct: number, aspect: number) {
  const box = (n * pct) / 100
  const w = aspect >= 1 ? box : box * aspect
  const h = aspect >= 1 ? box / aspect : box
  const c = margin + n / 2
  const pad = box * 0.08
  return { x: c - w / 2, y: c - h / 2, w, h, pad }
}

export interface SvgOpts {
  margin: number
  fg: string
  bg: string
  px: number
  logo?: { href: string; pct: number; aspect: number; opacity: number }
}

/** QR 행렬 → SVG 문자열 (가로 연속 칸을 하나의 사각형으로 합침) */
export function qrSvg(modules: { size: number; data: ArrayLike<number> }, o: SvgOpts): string {
  const n = modules.size
  const t = n + o.margin * 2
  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules.data[r * n + c]) continue
      let len = 1
      while (c + len < n && modules.data[r * n + c + len]) len++
      d += `M${c + o.margin} ${r + o.margin}h${len}v1h-${len}z`
      c += len - 1
    }
  }
  let logo = ''
  if (o.logo) {
    const L = logoRect(n, o.margin, o.logo.pct, o.logo.aspect)
    const f = (v: number) => +v.toFixed(3)
    logo = `<rect x="${f(L.x - L.pad)}" y="${f(L.y - L.pad)}" width="${f(L.w + L.pad * 2)}" height="${f(L.h + L.pad * 2)}" rx="${f(L.pad)}" fill="${o.bg}"/>` +
      `<image x="${f(L.x)}" y="${f(L.y)}" width="${f(L.w)}" height="${f(L.h)}" opacity="${o.logo.opacity}" preserveAspectRatio="xMidYMid meet" xlink:href="${o.logo.href}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${o.px}" height="${o.px}" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges">` +
    `<rect width="${t}" height="${t}" fill="${o.bg}"/><path fill="${o.fg}" d="${d}"/>${logo}</svg>`
}

// ── 인쇄 배치 (A4 세로 210×297mm, 여백 10mm) ──
export const PRINT_LAYOUTS = [[2, 3], [3, 4], [4, 5]] as const
export function printQrMm(cols: number, rows: number, caption: boolean): number {
  const cellW = 190 / cols, cellH = 277 / rows
  return Math.floor(Math.min(cellW - 6, cellH - 6 - (caption ? 8 : 0)))
}
