// 교통 범칙금·과태료·벌점 — 데이터와 순수 계산. 금액은 만원 단위로 적고 계산에서 원으로 바꾼다.
//
// 출처(국가법령정보센터 현행 원문, 확인일 CHECKED). 별표는 PDF 원문을 직접 읽었다.
// | 항목 | 법령 | 현행 시행일(개정) |
// |------|------|------------------|
// | 범칙금(운전자) | 도로교통법 시행령 별표 8 | 영 시행 2026-10-02(대통령령 제36728호), 별표 8 개정 2025-06-02 |
// | 과태료(고용주등) | 도로교통법 시행령 별표 6 | 별표 6 개정 2025-03-18 |
// | 보호구역 과태료(오전 8시~오후 8시, 신호·속도·주정차) | 도로교통법 시행령 제88조제4항 단서·별표 7 | 별표 7 개정 2020-12-01 |
// | 보호구역 범칙금(오전 8시~오후 8시) | 도로교통법 시행령 제93조제2항·별표 10 | 별표 10 개정 2022-07-11 |
// | 벌점·정지(40점↑, 1점=1일)·취소(1년 121·2년 201·3년 271)·소멸·교육 감경 | 도로교통법 시행규칙 별표 28 | 규칙 시행 2026-08-24(행정안전부령 제636호), 별표 28 개정 2025-12-02 |
// | 과태료 자진납부 감경 대상·비율(20%) — 표에 없는 위반은 감경 없음 | 도로교통법 시행규칙 제146조·별표 39 | 별표 39 개정 2021-12-31 |
// | 자진납부 감경(의견 제출 기한 안, 100분의 20 범위) | 질서위반행위규제법 제16·18조, 같은 법 시행령 제5조 | 법 시행 2026-10-02, 영 시행 2026-06-30 |
// | 과태료 체납 가산금 3%·중가산금 월 1.2%(60개월까지) | 질서위반행위규제법 제24조 | 법 시행 2026-10-02 |
// | 범칙금 10일 납부, 미납 시 20일 안 20% 가산, 이후 즉결심판(청구 전·선고 전 50% 가산 납부) | 도로교통법 제164·165조 | 법 시행 2026-10-13(법률 제22067호) |
// | 시속 80km 초과는 범칙행위가 아님: 80~100 초과 30만원 이하 벌금·구류, 100 초과 100만원 이하 벌금·구류, 100 초과 3회 이상 1년 이하 징역·500만원 이하 벌금 | 도로교통법 제151조의2·제153조제2항·제154조제9호·제156조 | 법 시행 2026-10-13 |
// | 무인 단속 과태료 대상 조문 | 도로교통법 제160조제3항 | 법 시행 2026-10-13 |
// 차종: 승합자동차등 = 승합차·4톤 초과 화물·특수·건설기계, 승용자동차등 = 승용차·4톤 이하 화물, 이륜자동차등 = 이륜차·원동기장치자전거(개인형 이동장치 제외) — 각 별표 비고

export const CHECKED = '2026-11-22'

const law = (name: string) => `https://www.law.go.kr/${encodeURIComponent('법령')}/${encodeURIComponent(name)}`
export const SOURCES = {
  enf: law('도로교통법시행령'),
  rule: law('도로교통법시행규칙'),
  act: law('도로교통법'),
  qa: law('질서위반행위규제법'),
  efine: 'https://www.efine.go.kr',
} as const

export type Veh = 'van' | 'car' | 'moto'
export const VEHS = ['car', 'van', 'moto'] as const
const VI: Record<Veh, number> = { van: 0, car: 1, moto: 2 }
/** [승합등, 승용등, 이륜등] 만원. null = 해당 기준 없음 */
type Tri = readonly [number | null, number | null, number | null]

export type Zone = 'none' | 'child' | 'elder'
export const ZONES = ['none', 'child', 'elder'] as const

export type Vid = 'speed' | 'signal' | 'centerline' | 'crosswalk' | 'intersection' | 'cutIn' | 'solidLine' | 'distance'
  | 'phone' | 'belt' | 'shoulder' | 'overtake' | 'parking' | 'hydrant'

type Rule = {
  /** 범칙금(현장 적발) — 시행령 별표 8 */
  fine: Tri
  /** 과태료(무인 단속, 차 소유자) — 시행령 별표 6. null = 무인 단속 과태료 대상 아님 */
  penalty: Tri | null
  /** 벌점 — 시행규칙 별표 28 3. 가. */
  points: number
  /** 보호구역 가중 종류 */
  zone?: 'signal' | 'crosswalk' | 'parking'
  /** 과태료 자진납부 20% 감경 대상(시행규칙 별표 39) */
  cut?: boolean
  /** 같은 장소 2시간 이상 주정차면 과태료 +1만원(별표 6·7 비고) */
  twoHour?: boolean
  /** 고속도로·자동차전용도로 범칙금(안전거리) */
  fineHw?: Tri
}

/** 속도위반 외 위반. 괄호는 별표의 호 */
export const RULES: Record<Exclude<Vid, 'speed'>, Rule> = {
  // 별표 8 제4호 7/6/4 · 별표 6 제1호 8/7/5 · 별표 28 제14호 15점
  signal: { fine: [7, 6, 4], penalty: [8, 7, 5], points: 15, zone: 'signal' },
  // 별표 8 제5호 · 별표 6 제2호가목 10/9/7 · 별표 28 제8호 30점
  centerline: { fine: [7, 6, 4], penalty: [10, 9, 7], points: 30 },
  // 별표 8 제11호 · 별표 6 제4호의5 8/7/5 · 별표 28 제25호 10점
  crosswalk: { fine: [7, 6, 4], penalty: [8, 7, 5], points: 10, zone: 'crosswalk' },
  // 별표 8 제25호 5/4/3 · 별표 6 제4호의4(꼬리물기 다목 포함) 6/5/4 · 벌점 없음
  intersection: { fine: [5, 4, 3], penalty: [6, 5, 4], points: 0 },
  // 별표 8 제49호 3/3/2 · 별표 6 제4호의3 4/4/3 · 벌점 없음
  cutIn: { fine: [3, 3, 2], penalty: [4, 4, 3], points: 0 },
  // 진로변경 금지 장소(실선) 진로변경: 별표 8 제45호 3/3/2 · 별표 6 제2호의3다목 4/4/3 · 별표 28 제21호 10점
  solidLine: { fine: [3, 3, 2], penalty: [4, 4, 3], points: 10 },
  // 일반도로 별표 8 제60호 2/2/1, 고속도로·자동차전용도로 제23호 5/4/3 · 무인 과태료 대상 아님 · 별표 28 제23호 10점
  distance: { fine: [2, 2, 1], fineHw: [5, 4, 3], penalty: null, points: 10 },
  // 별표 8 제15호 · 별표 6 제8호의2 8/7/5 · 별표 28 제17호 15점
  phone: { fine: [7, 6, 4], penalty: [8, 7, 5], points: 15 },
  // 운전자 좌석안전띠(제56호)·이륜 인명보호장구(제57호) 3/3/2 · 이륜 고용주등 과태료 별표 6 제10호의2 3만원 · 벌점 없음
  belt: { fine: [3, 3, 2], penalty: [null, null, 3], points: 0 },
  // 고속도로·자동차전용도로 갓길: 별표 8 제19호 · 별표 6 제2호다목 10/9/7 · 별표 28 제11호 30점
  shoulder: { fine: [7, 6, 4], penalty: [10, 9, 7], points: 30 },
  // 앞지르기 금지 시기·장소: 별표 8 제9호 · 별표 6 제4호의2다목 8/7/5 · 별표 28 제16호 15점
  overtake: { fine: [7, 6, 4], penalty: [8, 7, 5], points: 15 },
  // 정차·주차 금지·주차금지·방법 위반: 별표 8 제29~31호 5/4/3 · 별표 6 제6호 승합 5(6)·승용 4(5), 이륜 없음 · 벌점 없음
  parking: { fine: [5, 4, 3], penalty: [5, 4, null], points: 0, zone: 'parking', cut: true, twoHour: true },
  // 소화전 등 소방시설 주변 안전표지 설치 장소: 별표 8 제3호의3 9/8/6 · 별표 6 제6호의2가목 9(10)/8(9)
  // ponytail: 별표 39 제12호 감경 금액 칸은 4만(5만)원 기준이지만 '제32~34조 위반 주정차'로 정해 같은 20%를 적용한다
  hydrant: { fine: [9, 8, 6], penalty: [9, 8, null], points: 0, zone: 'parking', cut: true, twoHour: true },
}

// ── 보호구역(오전 8시~오후 8시) — 범칙금 별표 10, 과태료 별표 7
const ZONE_FINE = {
  signal: [13, 12, 8], crosswalk: [13, 12, 8], // 별표 10 제1·2호
  child: [13, 12, 9], elder: [9, 8, 6], // 별표 10 제6~9호 정차·주차
} as const satisfies Record<string, Tri>
const ZONE_PENALTY = {
  signal: [14, 13, 9], // 별표 7 제1호
  child: [13, 12, null], elder: [9, 8, null], // 별표 7 제3호(2시간 이상 +1만원)
} as const satisfies Record<string, Tri>

// ── 속도위반: 초과 km/h 구간
export type Band = 'b20' | 'b40' | 'b60' | 'b80' | 'b100' | 'b100p'
export function speedBand(over: number): Band | null {
  if (!(over > 0)) return null
  return over <= 20 ? 'b20' : over <= 40 ? 'b40' : over <= 60 ? 'b60' : over <= 80 ? 'b80' : over <= 100 ? 'b100' : 'b100p'
}
/** 범칙금·과태료 표는 60 초과가 한 칸 */
const tier = (b: Band) => (b === 'b20' || b === 'b40' || b === 'b60' ? b : 'b60p')
const SPEED_FINE = { b20: [3, 3, 2], b40: [7, 6, 4], b60: [10, 9, 6], b60p: [13, 12, 8] } as const satisfies Record<string, Tri> // 별표 8 제46·6·2·1호
const SPEED_PENALTY = { b20: [4, 4, 3], b40: [8, 7, 5], b60: [11, 10, 7], b60p: [14, 13, 9] } as const satisfies Record<string, Tri> // 별표 6 제4호
const SPEED_ZONE_FINE = { b20: [6, 6, 4], b40: [10, 9, 6], b60: [13, 12, 8], b60p: [16, 15, 10] } as const satisfies Record<string, Tri> // 별표 10 제3호
const SPEED_ZONE_PENALTY = { b20: [7, 7, 5], b40: [11, 10, 7], b60: [14, 13, 9], b60p: [17, 16, 11] } as const satisfies Record<string, Tri> // 별표 7 제2호
const SPEED_POINTS: Record<Band, number> = { b20: 0, b40: 15, b60: 30, b80: 60, b100: 80, b100p: 100 } // 별표 28 제15·9·3의2·3·1호

export type Input = { v: Vid; veh: Veh; zone: Zone; hours: boolean; over: number; twoHour: boolean }
export type Crime = 'over80' | 'over100'
export type Result = {
  /** 범칙금(원). null = 범칙금 대상 아님(80km/h 초과는 형사처벌) */
  fine: number | null
  /** 고속도로·자동차전용도로 범칙금(원, 안전거리) */
  fineHw: number | null
  /** 과태료(원). null = 이 차종·위반은 과태료 기준 없음 */
  penalty: number | null
  /** 의견 제출 기한 안 자진납부 금액(원). null = 감경 대상 아님 */
  penaltyCut: number | null
  points: number
  crime: Crime | null
  /** 보호구역 가중을 적용했나 */
  zoneOn: boolean
  band: Band | null
}

const won = (t: Tri | null, veh: Veh) => { const x = t?.[VI[veh]]; return x == null ? null : x * 10_000 }

export function calc(i: Input): Result | null {
  const zoneOn = i.zone !== 'none' && i.hours
  if (i.v === 'speed') {
    const band = speedBand(i.over)
    if (!band) return null
    const tr = tier(band)
    const penalty = won((zoneOn ? SPEED_ZONE_PENALTY : SPEED_PENALTY)[tr], i.veh)
    let points = SPEED_POINTS[band]
    if (zoneOn) {
      // 별표 28 주4: 80 초과 120점, 20 초과는 2배. 어린이보호구역 20 이내는 제15호의2 15점
      points = band === 'b100' || band === 'b100p' ? 120 : band === 'b20' ? (i.zone === 'child' ? 15 : 0) : points * 2
    }
    const crime: Crime | null = band === 'b100p' ? 'over100' : band === 'b100' ? 'over80' : null
    return {
      fine: crime ? null : won((zoneOn ? SPEED_ZONE_FINE : SPEED_FINE)[tr], i.veh),
      fineHw: null,
      penalty,
      penaltyCut: band === 'b20' && penalty !== null ? penalty - penalty / 5 : null, // 별표 39 제9·10호
      points, crime, zoneOn, band,
    }
  }
  const r = RULES[i.v]
  let fine = won(r.fine, i.veh)
  let penalty = won(r.penalty, i.veh)
  let points = r.points
  const zoneHit = zoneOn && !!r.zone
  if (zoneHit) {
    if (r.zone === 'parking') {
      const z = i.zone === 'child' ? 'child' : 'elder'
      fine = won(ZONE_FINE[z], i.veh)
      penalty = won(ZONE_PENALTY[z], i.veh)
    } else if (r.zone === 'signal') {
      fine = won(ZONE_FINE.signal, i.veh)
      penalty = won(ZONE_PENALTY.signal, i.veh)
      points *= 2
    } else {
      fine = won(ZONE_FINE.crosswalk, i.veh) // 과태료는 별표 7 대상이 아니라 별표 6 그대로
      points *= 2
    }
  }
  if (penalty !== null && r.twoHour && i.twoHour) penalty += 10_000
  return {
    fine, fineHw: won(r.fineHw ?? null, i.veh), penalty,
    penaltyCut: r.cut && penalty !== null ? penalty - penalty / 5 : null,
    points, crime: null, zoneOn: zoneHit, band: null,
  }
}

/** 이 위반에 보호구역 가중이 있나(UI 안내용) */
export const zoneApplies = (v: Vid) => v === 'speed' || !!RULES[v as Exclude<Vid, 'speed'>]?.zone

// ── 범칙금 납부 단계(도로교통법 제164·165조)
export const finePlan = (fine: number) => ({ first: fine, second: fine + fine / 5, court: fine + fine / 2 })

// ── 누적 벌점(시행규칙 별표 28 1. 다.)
export const SUSPEND_AT = 40
export const REVOKE = { y1: 121, y2: 201, y3: 271 } as const
export type Verdict = { total: number; status: 'ok' | 'suspend' | 'revoke'; days: number; toSuspend: number; toRevoke: number }
/** cur = 지금 처분벌점(최근 1년 누산과 같다고 본다). 정지 일수 = 처분벌점(1점 1일) */
export function verdict(cur: number, add: number): Verdict {
  const total = cur + add
  return {
    total,
    status: total >= REVOKE.y1 ? 'revoke' : total >= SUSPEND_AT ? 'suspend' : 'ok',
    days: total >= SUSPEND_AT && total < REVOKE.y1 ? total : 0,
    toSuspend: Math.max(0, SUSPEND_AT - total),
    toRevoke: Math.max(0, REVOKE.y1 - total),
  }
}

// ── URL
export const VIDS: readonly Vid[] = ['speed', 'signal', 'centerline', 'crosswalk', 'intersection', 'cutIn', 'solidLine', 'distance', 'phone', 'belt', 'shoulder', 'overtake', 'parking', 'hydrant']
export type State = { v: Vid; veh: Veh; zone: Zone; hours: boolean; lim: number; spd: number; two: boolean; pts: number }
export const DEFAULT: State = { v: 'speed', veh: 'car', zone: 'none', hours: true, lim: 60, spd: 85, two: false, pts: 0 }
export const LIM_RANGE = [10, 130] as const
export const SPD_RANGE = [1, 300] as const
export const PTS_RANGE = [0, 400] as const

const int = (s: string | null, [lo, hi]: readonly [number, number], d: number) => {
  if (s === null || !/^\d+$/.test(s)) return d
  const n = Number(s)
  return n >= lo && n <= hi ? n : d
}
const oneOf = <T extends string>(s: string | null, list: readonly T[], d: T): T => (list as readonly string[]).includes(s ?? '') ? (s as T) : d

export function parseState(get: (k: string) => string | null): State {
  return {
    v: oneOf(get('v'), VIDS, DEFAULT.v),
    veh: oneOf(get('c'), VEHS, DEFAULT.veh),
    zone: oneOf(get('z'), ZONES, DEFAULT.zone),
    hours: get('h') !== '0',
    lim: int(get('l'), LIM_RANGE, DEFAULT.lim),
    spd: int(get('s'), SPD_RANGE, DEFAULT.spd),
    two: get('t') === '1',
    pts: int(get('p'), PTS_RANGE, DEFAULT.pts),
  }
}

/** 기본값과 다른 것만, 지금 화면에서 쓰는 값만(속도는 속도위반, 시간대는 보호구역, 2시간은 주정차). 모두 기본이면 '' */
export function toQuery(s: State): string {
  const q = new URLSearchParams()
  const speed = s.v === 'speed'
  if (s.v !== DEFAULT.v) q.set('v', s.v)
  if (s.veh !== DEFAULT.veh) q.set('c', s.veh)
  if (s.zone !== DEFAULT.zone) q.set('z', s.zone)
  if (!s.hours && s.zone !== 'none') q.set('h', '0')
  if (speed && s.lim !== DEFAULT.lim) q.set('l', String(s.lim))
  if (speed && s.spd !== DEFAULT.spd) q.set('s', String(s.spd))
  if (s.two && (s.v === 'parking' || s.v === 'hydrant')) q.set('t', '1')
  if (s.pts !== DEFAULT.pts) q.set('p', String(s.pts))
  return q.toString()
}

export const inputOf = (s: State): Input => ({ v: s.v, veh: s.veh, zone: s.zone, hours: s.hours, over: s.spd - s.lim, twoHour: s.two })
