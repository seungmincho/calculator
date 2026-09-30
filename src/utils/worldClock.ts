// 세계 시계 순수 로직 — Intl.DateTimeFormat(timeZone)만 사용 (tz 라이브러리 없음). 검증: node scripts/check-world-clock.ts

export interface City { id: string; tz: string; ko: string; en: string; country: string }

// 도시명은 검색용 데이터(한/영 동시 매칭 필요)라 i18n이 아닌 여기에 둔다.
const C = (id: string, tz: string, ko: string, en: string, country: string): City => ({ id, tz, ko, en, country })
export const CITIES: City[] = [
  C('seoul', 'Asia/Seoul', '서울', 'Seoul', '대한민국 South Korea'),
  C('busan', 'Asia/Seoul', '부산', 'Busan', '대한민국 South Korea'),
  C('tokyo', 'Asia/Tokyo', '도쿄', 'Tokyo', '일본 Japan'),
  C('osaka', 'Asia/Tokyo', '오사카', 'Osaka', '일본 Japan'),
  C('beijing', 'Asia/Shanghai', '베이징', 'Beijing', '중국 China'),
  C('shanghai', 'Asia/Shanghai', '상하이', 'Shanghai', '중국 China'),
  C('hongKong', 'Asia/Hong_Kong', '홍콩', 'Hong Kong', '홍콩 Hong Kong'),
  C('taipei', 'Asia/Taipei', '타이베이', 'Taipei', '대만 Taiwan'),
  C('manila', 'Asia/Manila', '마닐라', 'Manila', '필리핀 Philippines'),
  C('singapore', 'Asia/Singapore', '싱가포르', 'Singapore', '싱가포르 Singapore'),
  C('kualaLumpur', 'Asia/Kuala_Lumpur', '쿠알라룸푸르', 'Kuala Lumpur', '말레이시아 Malaysia'),
  C('bangkok', 'Asia/Bangkok', '방콕', 'Bangkok', '태국 Thailand'),
  C('hanoi', 'Asia/Bangkok', '하노이', 'Hanoi', '베트남 Vietnam'),
  C('hoChiMinh', 'Asia/Ho_Chi_Minh', '호찌민', 'Ho Chi Minh City', '베트남 Vietnam'),
  C('danang', 'Asia/Ho_Chi_Minh', '다낭', 'Da Nang', '베트남 Vietnam'),
  C('jakarta', 'Asia/Jakarta', '자카르타', 'Jakarta', '인도네시아 Indonesia'),
  C('bali', 'Asia/Makassar', '발리', 'Bali', '인도네시아 Indonesia'),
  C('ulaanbaatar', 'Asia/Ulaanbaatar', '울란바토르', 'Ulaanbaatar', '몽골 Mongolia'),
  C('vladivostok', 'Asia/Vladivostok', '블라디보스토크', 'Vladivostok', '러시아 Russia'),
  C('guam', 'Pacific/Guam', '괌', 'Guam', '미국령 Guam'),
  C('saipan', 'Pacific/Saipan', '사이판', 'Saipan', '미국령 Northern Mariana Islands'),
  C('mumbai', 'Asia/Kolkata', '뭄바이', 'Mumbai', '인도 India'),
  C('newDelhi', 'Asia/Kolkata', '뉴델리', 'New Delhi', '인도 India'),
  C('kathmandu', 'Asia/Kathmandu', '카트만두', 'Kathmandu', '네팔 Nepal'),
  C('dhaka', 'Asia/Dhaka', '다카', 'Dhaka', '방글라데시 Bangladesh'),
  C('tashkent', 'Asia/Tashkent', '타슈켄트', 'Tashkent', '우즈베키스탄 Uzbekistan'),
  C('almaty', 'Asia/Almaty', '알마티', 'Almaty', '카자흐스탄 Kazakhstan'),
  C('dubai', 'Asia/Dubai', '두바이', 'Dubai', '아랍에미리트 UAE'),
  C('riyadh', 'Asia/Riyadh', '리야드', 'Riyadh', '사우디아라비아 Saudi Arabia'),
  C('doha', 'Asia/Qatar', '도하', 'Doha', '카타르 Qatar'),
  C('tehran', 'Asia/Tehran', '테헤란', 'Tehran', '이란 Iran'),
  C('telAviv', 'Asia/Jerusalem', '텔아비브', 'Tel Aviv', '이스라엘 Israel'),
  C('istanbul', 'Europe/Istanbul', '이스탄불', 'Istanbul', '튀르키예 Turkey'),
  C('moscow', 'Europe/Moscow', '모스크바', 'Moscow', '러시아 Russia'),
  C('london', 'Europe/London', '런던', 'London', '영국 United Kingdom'),
  C('dublin', 'Europe/Dublin', '더블린', 'Dublin', '아일랜드 Ireland'),
  C('lisbon', 'Europe/Lisbon', '리스본', 'Lisbon', '포르투갈 Portugal'),
  C('paris', 'Europe/Paris', '파리', 'Paris', '프랑스 France'),
  C('berlin', 'Europe/Berlin', '베를린', 'Berlin', '독일 Germany'),
  C('frankfurt', 'Europe/Berlin', '프랑크푸르트', 'Frankfurt', '독일 Germany'),
  C('munich', 'Europe/Berlin', '뮌헨', 'Munich', '독일 Germany'),
  C('amsterdam', 'Europe/Amsterdam', '암스테르담', 'Amsterdam', '네덜란드 Netherlands'),
  C('brussels', 'Europe/Brussels', '브뤼셀', 'Brussels', '벨기에 Belgium'),
  C('zurich', 'Europe/Zurich', '취리히', 'Zurich', '스위스 Switzerland'),
  C('vienna', 'Europe/Vienna', '빈', 'Vienna', '오스트리아 Austria'),
  C('prague', 'Europe/Prague', '프라하', 'Prague', '체코 Czechia'),
  C('warsaw', 'Europe/Warsaw', '바르샤바', 'Warsaw', '폴란드 Poland'),
  C('budapest', 'Europe/Budapest', '부다페스트', 'Budapest', '헝가리 Hungary'),
  C('rome', 'Europe/Rome', '로마', 'Rome', '이탈리아 Italy'),
  C('milan', 'Europe/Rome', '밀라노', 'Milan', '이탈리아 Italy'),
  C('madrid', 'Europe/Madrid', '마드리드', 'Madrid', '스페인 Spain'),
  C('barcelona', 'Europe/Madrid', '바르셀로나', 'Barcelona', '스페인 Spain'),
  C('stockholm', 'Europe/Stockholm', '스톡홀름', 'Stockholm', '스웨덴 Sweden'),
  C('helsinki', 'Europe/Helsinki', '헬싱키', 'Helsinki', '핀란드 Finland'),
  C('athens', 'Europe/Athens', '아테네', 'Athens', '그리스 Greece'),
  C('cairo', 'Africa/Cairo', '카이로', 'Cairo', '이집트 Egypt'),
  C('nairobi', 'Africa/Nairobi', '나이로비', 'Nairobi', '케냐 Kenya'),
  C('lagos', 'Africa/Lagos', '라고스', 'Lagos', '나이지리아 Nigeria'),
  C('johannesburg', 'Africa/Johannesburg', '요하네스버그', 'Johannesburg', '남아프리카공화국 South Africa'),
  C('newYork', 'America/New_York', '뉴욕', 'New York', '미국 United States'),
  C('washington', 'America/New_York', '워싱턴 D.C.', 'Washington, D.C.', '미국 United States'),
  C('boston', 'America/New_York', '보스턴', 'Boston', '미국 United States'),
  C('atlanta', 'America/New_York', '애틀랜타', 'Atlanta', '미국 United States'),
  C('miami', 'America/New_York', '마이애미', 'Miami', '미국 United States'),
  C('chicago', 'America/Chicago', '시카고', 'Chicago', '미국 United States'),
  C('dallas', 'America/Chicago', '댈러스', 'Dallas', '미국 United States'),
  C('houston', 'America/Chicago', '휴스턴', 'Houston', '미국 United States'),
  C('denver', 'America/Denver', '덴버', 'Denver', '미국 United States'),
  C('phoenix', 'America/Phoenix', '피닉스', 'Phoenix', '미국 United States'),
  C('losAngeles', 'America/Los_Angeles', '로스앤젤레스(LA)', 'Los Angeles', '미국 United States'),
  C('sanFrancisco', 'America/Los_Angeles', '샌프란시스코', 'San Francisco', '미국 United States'),
  C('seattle', 'America/Los_Angeles', '시애틀', 'Seattle', '미국 United States'),
  C('lasVegas', 'America/Los_Angeles', '라스베이거스', 'Las Vegas', '미국 United States'),
  C('anchorage', 'America/Anchorage', '앵커리지', 'Anchorage', '미국 United States'),
  C('honolulu', 'Pacific/Honolulu', '호놀룰루(하와이)', 'Honolulu', '미국 United States'),
  C('toronto', 'America/Toronto', '토론토', 'Toronto', '캐나다 Canada'),
  C('vancouver', 'America/Vancouver', '밴쿠버', 'Vancouver', '캐나다 Canada'),
  C('mexicoCity', 'America/Mexico_City', '멕시코시티', 'Mexico City', '멕시코 Mexico'),
  C('cancun', 'America/Cancun', '칸쿤', 'Cancun', '멕시코 Mexico'),
  C('bogota', 'America/Bogota', '보고타', 'Bogota', '콜롬비아 Colombia'),
  C('lima', 'America/Lima', '리마', 'Lima', '페루 Peru'),
  C('santiago', 'America/Santiago', '산티아고', 'Santiago', '칠레 Chile'),
  C('buenosAires', 'America/Argentina/Buenos_Aires', '부에노스아이레스', 'Buenos Aires', '아르헨티나 Argentina'),
  C('saoPaulo', 'America/Sao_Paulo', '상파울루', 'Sao Paulo', '브라질 Brazil'),
  C('sydney', 'Australia/Sydney', '시드니', 'Sydney', '호주 Australia'),
  C('melbourne', 'Australia/Melbourne', '멜버른', 'Melbourne', '호주 Australia'),
  C('brisbane', 'Australia/Brisbane', '브리즈번', 'Brisbane', '호주 Australia'),
  C('perth', 'Australia/Perth', '퍼스', 'Perth', '호주 Australia'),
  C('adelaide', 'Australia/Adelaide', '애들레이드', 'Adelaide', '호주 Australia'),
  C('auckland', 'Pacific/Auckland', '오클랜드', 'Auckland', '뉴질랜드 New Zealand'),
  C('fiji', 'Pacific/Fiji', '피지', 'Fiji', '피지 Fiji'),
  C('utc', 'UTC', 'UTC (협정 세계시)', 'UTC', 'UTC GMT'),
]

export const DEFAULT_IDS = ['seoul', 'newYork', 'london', 'tokyo', 'sydney']

export function isValidTz(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

/** 목록 id 또는 임의 IANA 타임존 문자열 → City (없으면 null) */
export function resolveCity(id: string): City | null {
  const c = CITIES.find(x => x.id === id)
  if (c) return c
  if (!id.includes('/') || !isValidTz(id)) return null
  const name = id.split('/').pop()!.replace(/_/g, ' ')
  return { id, tz: id, ko: name, en: name, country: id }
}

/** 한글/영문/국가/IANA로 검색. 목록에 없는 IANA 존은 extraTz(Intl.supportedValuesOf)에서 */
export function searchCities(q: string, exclude: string[], extraTz: string[] = []): City[] {
  const s = q.trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return []
  const hit = (v: string) => v.toLowerCase().replace(/[\s_]+/g, '').includes(s)
  const out = CITIES.filter(c => !exclude.includes(c.id) && (hit(c.ko) || hit(c.en) || hit(c.country) || hit(c.tz)))
  const known = new Set(CITIES.map(c => c.tz))
  for (const tz of extraTz) {
    if (out.length >= 12) break
    if (!known.has(tz) && !exclude.includes(tz) && hit(tz)) out.push(resolveCity(tz)!)
  }
  return out.slice(0, 12)
}

// ── 시간 계산 ──
const fmtCache = new Map<string, Intl.DateTimeFormat>()
function partsFmt(tz: string) {
  let f = fmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', weekday: 'short',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
    fmtCache.set(tz, f)
  }
  return f
}
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface Local { y: number; mo: number; d: number; h: number; mi: number; s: number; wd: number }
export function localParts(tz: string, ms: number): Local {
  const p: Record<string, string> = {}
  for (const x of partsFmt(tz).formatToParts(new Date(ms))) p[x.type] = x.value
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD.indexOf(p.weekday) }
}

/** UTC 대비 오프셋(분). 서울 = 540 */
export function offsetMin(tz: string, ms: number): number {
  const l = localParts(tz, ms)
  const asUtc = Date.UTC(l.y, l.mo - 1, l.d, l.h, l.mi, l.s)
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000)
}

/** 서머타임 중: 올해 1/1·7/1 오프셋 중 작은 값(표준시)보다 크면. 남반구도 동작 */
export function isDST(tz: string, ms: number): boolean {
  const y = localParts(tz, ms).y
  const std = Math.min(offsetMin(tz, Date.UTC(y, 0, 1)), offsetMin(tz, Date.UTC(y, 6, 1)))
  return offsetMin(tz, ms) > std
}

/** "UTC+9", "UTC+5:30", "UTC-3", "UTC±0" */
export function fmtOffset(min: number): string {
  if (min === 0) return 'UTC±0'
  const a = Math.abs(min)
  return `UTC${min > 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`
}

/** 시차 분 → "+13", "-8:30", "0" (부호 포함 시간 표기) */
export function fmtDiff(min: number): string {
  if (min === 0) return '0'
  const a = Math.abs(min)
  return `${min > 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`
}

const dayNum = (l: Local) => Date.UTC(l.y, l.mo - 1, l.d) / 86400000
/** tz의 달력 날짜 - base의 달력 날짜 (-1 어제, 0 오늘, 1 내일) */
export function dayDiff(tz: string, baseTz: string, ms: number): number {
  return dayNum(localParts(tz, ms)) - dayNum(localParts(baseTz, ms))
}

/** tz의 벽시계 시각(y-mo-d h:mi) → epoch ms. DST 갭 시각은 뒤 오프셋으로 밀림 */
export function zonedToUtc(tz: string, y: number, mo: number, d: number, h = 0, mi = 0): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let ms = wall - offsetMin(tz, wall) * 60000
  ms = wall - offsetMin(tz, ms) * 60000 // 경계 근처 한 번 더 보정
  return ms
}

export const isNight = (h: number) => h < 6 || h >= 18
export const hm = (l: Local) => `${String(l.h).padStart(2, '0')}:${String(l.mi).padStart(2, '0')}`
export const ymd = (l: Local) => `${l.y}-${String(l.mo).padStart(2, '0')}-${String(l.d).padStart(2, '0')}`
/** "10/15(수)" — weekdays는 일~토 7개 */
export const mdw = (l: Local, weekdays: string[]) => `${l.mo}/${l.d}(${weekdays[l.wd]})`

// ── 미팅 플래너 ──
/** base 존의 날짜(YYYY-MM-DD) 00:00부터 1시간 간격 24칸의 epoch ms */
export function daySlots(baseTz: string, date: string): number[] {
  const [y, mo, d] = date.split('-').map(Number)
  const start = zonedToUtc(baseTz, y, mo, d)
  return Array.from({ length: 24 }, (_, i) => start + i * 3600000)
}

/** 현지 평일이고 슬롯 시작 시각이 [start, end) 시 사이면 업무시간 (30분 존은 9:30 시작 칸도 업무로 봄) */
export function inWork(tz: string, ms: number, start: number, end: number): boolean {
  const l = localParts(tz, ms)
  const m = l.h * 60 + l.mi
  return l.wd !== 0 && l.wd !== 6 && m >= start * 60 && m < end * 60
}

export const overlap = (tzs: string[], slots: number[], start: number, end: number): boolean[] =>
  slots.map(ms => tzs.every(tz => inWork(tz, ms, start, end)))

/** 연속 true 구간 → [시작 index, 끝 index(포함 안 함)] */
export function ranges(flags: boolean[]): [number, number][] {
  const out: [number, number][] = []
  flags.forEach((f, i) => {
    if (!f) return
    const last = out[out.length - 1]
    if (last && last[1] === i) last[1] = i + 1
    else out.push([i, i + 1])
  })
  return out
}

/** "10/15(수) 21:00 서울 = 08:00 뉴욕 = 13:00 런던(10/16 목)" — 첫 도시 기준, 날짜 다르면 괄호 */
export function shareLine(ms: number, cities: { tz: string; name: string }[], weekdays: string[]): string {
  if (!cities.length) return ''
  const b = localParts(cities[0].tz, ms)
  return cities.map((c, i) => {
    const l = localParts(c.tz, ms)
    if (i === 0) return `${mdw(l, weekdays)} ${hm(l)} ${c.name}`
    return `${hm(l)} ${c.name}${ymd(l) !== ymd(b) ? `(${mdw(l, weekdays)})` : ''}`
  }).join(' = ')
}

// ── 증시 정규장 (공휴일 미반영) ──
// NYSE·NASDAQ 정규장 09:30–16:00 ET, KRX 정규장 09:00–15:30 KST (각 거래소 공식 안내 기준)
export const MARKETS = [
  { id: 'nyse', tz: 'America/New_York', open: [9, 30], close: [16, 0] },
  { id: 'krx', tz: 'Asia/Seoul', open: [9, 0], close: [15, 30] },
] as const

/** 지금 열려 있으면 이번 세션, 아니면 다음 평일 세션 {open, close, isOpen} */
export function marketSession(m: (typeof MARKETS)[number], now: number) {
  const l = localParts(m.tz, now)
  for (let k = 0; k < 8; k++) {
    const day = new Date(Date.UTC(l.y, l.mo - 1, l.d + k))
    const wd = day.getUTCDay()
    if (wd === 0 || wd === 6) continue
    const [y, mo, d] = [day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate()]
    const open = zonedToUtc(m.tz, y, mo, d, m.open[0], m.open[1])
    const close = zonedToUtc(m.tz, y, mo, d, m.close[0], m.close[1])
    if (now < close) return { open, close, isOpen: now >= open }
  }
  throw new Error('unreachable')
}
