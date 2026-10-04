// 자동차 소모품 교체주기·유지비 순수 로직. 회귀 체크: node scripts/check-car-maintenance.ts
// 날짜는 모두 'YYYY-MM-DD' 문자열(UTC 산술) → 시간대 영향 없음.

export type Fuel = 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
export const FUELS: Fuel[] = ['gasoline', 'diesel', 'lpg', 'hybrid', 'electric']

export interface ItemSpec {
  id: string
  /** 교체 주기 km (null = 시간 기준만) */
  km: number | null
  /** 교체 주기 개월 (null = 거리 기준만) */
  months: number | null
  /** 가혹조건 배수 (주기 × severe) */
  severe: number
  /** 해당 연료 (생략 = 전 차종) */
  fuels?: Fuel[]
  /** 연료별 km 예외 */
  kmByFuel?: Partial<Record<Fuel, number>>
  /** 최초 교체 주기 (냉각수처럼 첫 교체만 긴 항목) */
  first?: { km: number; months: number }
  /** 1회 비용 예시 범위(원) — 공임 포함 대략치, 차종·정비소별 편차 큼 */
  cost: [number, number]
  /** hmg = 현대차그룹 공식 안내 참고, general = 업계 일반적 기준 */
  src: 'hmg' | 'general'
}

const ICE: Fuel[] = ['gasoline', 'diesel', 'lpg', 'hybrid']

// 출처: 현대자동차그룹 "자동차 소모품 교체 주기" 안내(엔진오일 1.5만km/12개월·가혹 7,500km/6개월,
// 냉각수 최초 20만km/10년 이후 4만km/2년, 브레이크액 5만km, 점화플러그 16만km, 가혹조건 미션오일 10만km).
// 나머지(src: general)는 업계 일반적 권장치 — 반드시 차량 취급설명서 우선.
export const ITEMS: ItemSpec[] = [
  { id: 'engineOil', km: 15000, months: 12, severe: 0.5, fuels: ICE, cost: [60000, 120000], src: 'hmg' },
  { id: 'airFilter', km: 30000, months: 24, severe: 0.5, fuels: ICE, cost: [15000, 40000], src: 'general' },
  { id: 'cabinFilter', km: 15000, months: 12, severe: 0.5, cost: [15000, 40000], src: 'general' },
  { id: 'brakePads', km: 40000, months: null, severe: 0.75, cost: [80000, 200000], src: 'general' },
  { id: 'brakeFluid', km: 50000, months: 24, severe: 1, cost: [40000, 80000], src: 'hmg' },
  { id: 'tireRotation', km: 10000, months: null, severe: 1, cost: [20000, 40000], src: 'general' },
  { id: 'tires', km: 50000, months: 60, severe: 1, cost: [400000, 1000000], src: 'general' },
  { id: 'battery', km: null, months: 48, severe: 1, cost: [120000, 250000], src: 'general' },
  { id: 'coolant', km: 40000, months: 24, severe: 1, first: { km: 200000, months: 120 }, cost: [50000, 100000], src: 'hmg' },
  { id: 'transmissionFluid', km: 100000, months: null, severe: 1, fuels: ICE, cost: [150000, 300000], src: 'general' },
  { id: 'sparkPlugs', km: 160000, months: null, severe: 1, fuels: ['gasoline', 'lpg', 'hybrid'], kmByFuel: { lpg: 40000 }, cost: [60000, 150000], src: 'hmg' },
  { id: 'wiperBlades', km: null, months: 12, severe: 1, cost: [20000, 40000], src: 'general' },
]

export interface Rec { km?: number; date?: string }
export interface Car {
  id: string
  name: string
  fuel: Fuel
  severe: boolean
  km: number
  monthlyKm: number
  /** 최초 등록 'YYYY-MM' */
  reg: string
  records: Record<string, Rec>
}

// ── 날짜 ──
const ms = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd || 1) }
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86400000)
export const addDays = (d: string, n: number) => iso(ms(d) + Math.round(n) * 86400000)
export function addMonths(d: string, n: number): string {
  const [y, m, dd] = d.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12), nm = total - ny * 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return iso(Date.UTC(ny, nm, Math.min(dd || 1, last)))
}
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(ms(s))
const DAYS_PER_MONTH = 365 / 12

export function appliesTo(spec: ItemSpec, fuel: Fuel) { return !spec.fuels || spec.fuels.includes(fuel) }

/** 연료·가혹조건을 반영한 주기 */
export function intervalFor(spec: ItemSpec, fuel: Fuel, severe: boolean) {
  const f = severe ? spec.severe : 1
  const baseKm = spec.kmByFuel?.[fuel] ?? spec.km
  return {
    km: baseKm == null ? null : Math.round(baseKm * f),
    months: spec.months == null ? null : Math.max(1, Math.round(spec.months * f)),
  }
}

export interface Due {
  id: string
  intervalKm: number | null
  intervalMonths: number | null
  lastKm: number
  lastDate: string
  /** 기록 없이 주기대로 교체했다고 가정한 값 */
  estimated: boolean
  dueKm: number | null
  dueDate: string | null
  /** 남은 일수 (음수 = 지남). null = 주행 0 & 거리 기준만 */
  daysLeft: number | null
  /** 교체 시점까지 남은 예상 주행거리 (음수 = 초과) */
  kmLeft: number | null
  overdue: boolean
  /** 먼저 도래하는 기준 */
  by: 'km' | 'time'
}

/** 한 항목의 다음 교체 시점: km·개월 중 먼저 오는 쪽 */
export function computeDue(spec: ItemSpec, car: Car, today: string): Due {
  const daily = Math.max(0, car.monthlyKm) / DAYS_PER_MONTH
  const regDate = /^\d{4}-\d{2}$/.test(car.reg) ? `${car.reg}-01` : today
  let { km: iKm, months: iM } = intervalFor(spec, car.fuel, car.severe)
  const rec = car.records[spec.id] ?? {}
  let lastKm: number, lastDate: string, estimated = false

  const hasKm = typeof rec.km === 'number' && rec.km >= 0 && rec.km <= car.km
  const hasDate = isDate(rec.date) && rec.date <= today
  if (hasKm && hasDate) { lastKm = rec.km!; lastDate = rec.date! }
  else if (hasKm) { lastKm = rec.km!; lastDate = daily > 0 ? addDays(today, -(car.km - lastKm) / daily) : today }
  else if (hasDate) { lastDate = rec.date!; lastKm = Math.max(0, Math.round(car.km - daysBetween(lastDate, today) * daily)) }
  else {
    estimated = true
    const ageMonths = Math.max(0, daysBetween(regDate, today) / DAYS_PER_MONTH)
    if (spec.first && car.km < spec.first.km && ageMonths < spec.first.months) {
      lastKm = 0; lastDate = regDate; iKm = spec.first.km; iM = spec.first.months
    } else {
      // 주기대로 교체해 왔다고 가정: 더 빨리 도래하는 기준으로 주기를 반복
      const kmCycleMonths = iKm != null && daily > 0 ? iKm / car.monthlyKm : Infinity
      if (iKm != null && kmCycleMonths <= (iM ?? Infinity)) {
        lastKm = Math.floor(car.km / iKm) * iKm
        lastDate = addDays(today, -(car.km - lastKm) / daily)
      } else if (iM != null) {
        const since = ageMonths % iM
        lastDate = addDays(today, -since * DAYS_PER_MONTH)
        lastKm = Math.max(0, Math.round(car.km - since * DAYS_PER_MONTH * daily))
      } else { lastKm = car.km; lastDate = today } // 거리 기준만인데 주행 0
    }
  }

  const dueKm = iKm == null ? null : lastKm + iKm
  const kmRemain = dueKm == null ? null : dueKm - car.km
  const daysByKm = kmRemain == null ? Infinity : daily > 0 ? kmRemain / daily : (kmRemain < 0 ? -Infinity : Infinity)
  const timeDue = iM == null ? null : addMonths(lastDate, iM)
  const daysByTime = timeDue == null ? Infinity : daysBetween(today, timeDue)
  const d = Math.min(daysByKm, daysByTime)
  const daysLeft = Number.isFinite(d) ? Math.round(d) : (d === -Infinity ? 0 : null)
  const by: 'km' | 'time' = daysByKm <= daysByTime ? 'km' : 'time'
  const kmLeft = by === 'km' ? kmRemain : (daysLeft == null ? null : Math.round(daysLeft * daily))
  return {
    id: spec.id, intervalKm: iKm, intervalMonths: iM, lastKm, lastDate, estimated,
    dueKm, dueDate: daysLeft == null ? null : addDays(today, daysLeft),
    daysLeft, kmLeft, overdue: (daysLeft ?? 1) < 0 || (kmRemain ?? 1) < 0, by,
  }
}

/** 해당 차량의 전체 일정 — 급한 순 */
export function schedule(car: Car, today: string): Due[] {
  return ITEMS.filter((s) => appliesTo(s, car.fuel))
    .map((s) => computeDue(s, car, today))
    .sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))
}

/** 연간 소모품 비용 예시: 항목별 연 교체 횟수(km·개월 중 잦은 쪽) × 1회 비용 */
export function annualCost(fuel: Fuel, severe: boolean, monthlyKm: number) {
  let lo = 0, hi = 0
  const items = ITEMS.filter((s) => appliesTo(s, fuel)).map((s) => {
    const { km, months } = intervalFor(s, fuel, severe)
    const perYear = Math.max(km ? (monthlyKm * 12) / km : 0, months ? 12 / months : 0)
    const c = { id: s.id, perYear, lo: Math.round(s.cost[0] * perYear), hi: Math.round(s.cost[1] * perYear) }
    lo += c.lo; hi += c.hi
    return c
  })
  return { lo, hi, mid: Math.round((lo + hi) / 2), items }
}

// ── 자동차세 (비영업용 승용, 지방세법 제127조 + 지방교육세 30%) ──
/** 차령 = 과세연도 − 최초등록연도 + 1 (상반기 등록 기준 근사). 3년차부터 5%씩, 12년차 이상 50% 경감 */
export function autoTax(cc: number, regYear: number, taxYear: number, electric = false): number {
  if (electric) return 130000 // 10만원 + 교육세 30%
  if (cc <= 0) return 0
  const perCc = cc <= 1000 ? 80 : cc <= 1600 ? 140 : 200
  const carAge = taxYear - regYear + 1
  const discount = carAge >= 3 ? Math.min(0.5, (carAge - 2) * 0.05) : 0
  return Math.round(cc * perCc * (1 - discount) * 1.3)
}

// ── ICS (RFC 5545) ──
/** end = 여러 날 일정의 마지막 날 (포함) */
export interface IcsEvent { uid: string; date: string; end?: string; title: string; description?: string; alarmDays?: number }
export const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** 75옥텟 초과 줄을 접음 (UTF-8 문자 중간에서 자르지 않음) */
export function icsFold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = '', bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    const limit = out.length ? 74 : 75 // 이어지는 줄은 앞 공백 1옥텟
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch; bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

export function buildIcs(events: IcsEvent[], stamp: string): string {
  const d = (s: string) => s.replace(/-/g, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//toolhub.ai.kr//car-maintenance//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@toolhub.ai.kr`,
      `DTSTAMP:${d(stamp)}T000000Z`,
      `DTSTART;VALUE=DATE:${d(e.date)}`,
      `DTEND;VALUE=DATE:${d(addDays(e.end ?? e.date, 1))}`,
      `SUMMARY:${icsEscape(e.title)}`,
    )
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`)
    if (e.alarmDays) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:-P${e.alarmDays}D`, 'END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(icsFold).join('\r\n') + '\r\n'
}

// ── 공유 URL (차 이름·교체 날짜 제외, km만) ──
export function encodeCar(car: Car): URLSearchParams {
  const p = new URLSearchParams()
  p.set('km', String(car.km)); p.set('mk', String(car.monthlyKm)); p.set('f', car.fuel)
  if (car.severe) p.set('sv', '1')
  p.set('reg', car.reg)
  const r = Object.entries(car.records).filter(([, v]) => typeof v.km === 'number').map(([k, v]) => `${k}.${v.km}`)
  if (r.length) p.set('r', r.join('_'))
  return p
}

const num = (s: string | null, lo: number, hi: number) => {
  const n = Number(s)
  return s != null && s !== '' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : null
}

export function decodeCar(get: (k: string) => string | null): Partial<Car> | null {
  const km = num(get('km'), 0, 2000000)
  if (km == null) return null
  const f = get('f') as Fuel
  const reg = get('reg') ?? ''
  const records: Record<string, Rec> = {}
  for (const part of (get('r') ?? '').split('_')) {
    const [id, v] = part.split('.')
    const n = num(v ?? null, 0, km)
    if (ITEMS.some((s) => s.id === id) && n != null) records[id] = { km: n }
  }
  return {
    km,
    monthlyKm: num(get('mk'), 0, 20000) ?? 1200,
    fuel: FUELS.includes(f) ? f : 'gasoline',
    severe: get('sv') === '1',
    ...(/^\d{4}-\d{2}$/.test(reg) ? { reg } : {}),
    records,
  }
}
