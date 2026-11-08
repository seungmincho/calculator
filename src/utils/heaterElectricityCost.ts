// 난방기구 전기세 계산기(/heater-electricity-cost) 전용 로직. 회귀 체크: node scripts/check-heater-electricity-cost.ts
// 요금은 전부 electricityBill.ts calcBill(전기요금 계산기와 같은 함수, 한전 주택용 요금표 · 기준일 RATE_DATE).
// 난방으로 늘어나는 요금 = calcBill(평소 + 난방 kWh) − calcBill(평소) → 누진 구간·기본요금 변화·부가세·기금 절사가 모두 반영된다.
// 소비전력 프리셋은 흔한 제품의 정격(라벨) 소비전력 예시일 뿐 출처 있는 평균값이 아니다. 화면에 '예시'로 표시하고 사용자가 고친다.
// 온도조절 제품은 설정 온도에 닿으면 히터가 쉬어 실제 소비가 정격보다 낮다. 근거 있는 보정 계수가 없어 넣지 않는다(정격 = 상한).
import { calcBill, seasonOf, applianceKwh, boundaryTip, LIMITS, type Voltage, type Options } from './electricityBill.ts'

export const KINDS = ['mat', 'blanket', 'waterMat', 'fanHeater', 'radiator', 'heater', 'carbon', 'stove'] as const
export type Kind = (typeof KINDS)[number]

/** 흔한 제품 정격 소비전력 예시(W). thermo = 온도 설정에 따라 실제 소비가 정격보다 낮다고 안내하는 침구류 */
export const PRESET: Record<Kind, { watt: number; thermo?: boolean }> = {
  mat: { watt: 200, thermo: true }, // 전기장판(2인용)
  blanket: { watt: 100, thermo: true }, // 전기요(1인용)
  waterMat: { watt: 300, thermo: true }, // 온수매트(물 데우는 히터)
  fanHeater: { watt: 2000 }, // 온풍기
  radiator: { watt: 2000 }, // 오일 라디에이터
  heater: { watt: 1000 }, // 전기히터(석영관·할로겐)
  carbon: { watt: 900 }, // 카본히터
  stove: { watt: 1500 }, // 전기난로
}

export interface Device { kind: Kind; watt: number; hours: number; days: number }
export interface Input { base: number; month: number; voltage: Voltage; devices: Device[] }

export const device = (kind: Kind, hours = 4, days = 30): Device => ({ kind, watt: PRESET[kind].watt, hours, days })
export const optsOf = (month: number, voltage: Voltage): Options => ({ season: seasonOf(month), voltage, month })

/** 평소 사용량 위에 kWh를 얹었을 때 늘어나는 한 달 요금 */
export const extraCost = (base: number, kwh: number, o: Options) => calcBill(base + kwh, o).total - calcBill(base, o).total

/** 누진 구간 안내. 난방이 경계를 넘겼으면 넘긴 가장 높은 경계 아래로 내려가는 데 줄일 kWh·절약액,
 *  아니면 전기요금 계산기와 같은 경계 30kWh 근처 안내 (boundaryTip은 낮은 경계부터 보므로 within을 넘긴 만큼으로 좁힌다) */
export function tierTip(base: number, total: number, o: Options) {
  const [l1, l2] = LIMITS[o.season ?? 'normal']
  const lim = total > l2 ? l2 : total > l1 ? l1 : 0
  return lim && base <= lim ? boundaryTip(total, o, total - lim) : boundaryTip(total, o)
}

export function analyze({ base, month, voltage, devices }: Input) {
  const o = optsOf(month, voltage)
  const list = devices.map((d) => ({ ...d, kwh: applianceKwh(d.watt, d.hours, d.days) }))
  const kwh = list.reduce((s, r) => s + r.kwh, 0)
  const before = calcBill(base, o)
  const after = calcBill(base + kwh, o)
  const extra = after.total - before.total
  // ponytail: 누진제라 기구별 요금을 정확히 나눌 수 없어 kWh 비율로 나눈 근사
  const rows = list.map((r) => ({ ...r, share: kwh > 0 ? r.kwh / kwh : 0, cost: kwh > 0 ? (extra * r.kwh) / kwh : 0 }))
  const days = Math.max(0, ...rows.filter((r) => r.kwh > 0).map((r) => r.days)) // 난방한 날
  const tip = tierTip(before.kwh, after.kwh, o)
  // 넘긴 경계 아래로 내려가려면 가장 많이 쓰는 기구를 하루 몇 시간 덜 켜면 되는지 (그 기구만으로 안 되면 null)
  const top = rows.reduce<(typeof rows)[number] | null>((a, r) => (r.kwh > (a?.kwh ?? 0) ? r : a), null)
  const cut = tip?.kind === 'above' && top ? tip.over / ((top.watt * top.days) / 1000) : null
  return { o, rows, kwh, before, after, extra, days, perDay: days ? extra / days : 0, tip, top, cutHours: top && cut !== null && cut <= top.hours ? cut : null }
}

/** 같은 시간을 썼을 때 종류별 한 달 추가 요금 — 평소 사용량 위 증분, 프리셋 소비전력 */
export const compare = (base: number, hours: number, o: Options, days = 30) =>
  KINDS.map((kind) => {
    const kwh = applianceKwh(PRESET[kind].watt, hours, days)
    const extra = extraCost(base, kwh, o)
    return { kind, watt: PRESET[kind].watt, kwh, extra, perHour: hours * days > 0 ? extra / (hours * days) : 0 }
  })

// ── 기본값·페이지 예시 (page.tsx 본문·FAQ가 이 값으로 렌더링, check 스크립트가 숫자 고정) ──
/** 계산기 첫 화면: 평소 280kWh, 1월, 전기장판 200W 8시간 + 온풍기 2,000W 2시간, 30일 */
export const DEFAULTS: Input = { base: 280, month: 1, voltage: 'low', devices: [device('mat', 8), device('fanHeater', 2)] }
export const SIM_HOURS = 4
export const EXAMPLES = {
  d: DEFAULTS,
  mat: { ...DEFAULTS, devices: [device('mat', 8)] },
  waterMat: { ...DEFAULTS, devices: [device('waterMat', 8)] },
}
