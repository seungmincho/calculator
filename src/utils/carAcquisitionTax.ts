/**
 * 자동차 취득세 (CarTaxCalculator). 회귀 체크: node scripts/check-car-acquisition-tax.ts
 *
 * 근거 (2026-10 현행, law.go.kr)
 * - 지방세법 제12조①2호·시행령 제23조: 비영업용 승용 7%(경자동차 4%), 125cc 이하 이륜 2%,
 *   그 밖의 자동차 비영업용 5%(경자동차 4%)·영업용 4%. 등록세는 2011년 취득세에 통합돼 따로 없음
 * - 지방세법 제150조1호: 차량 취득세에는 지방교육세가 붙지 않음
 * - 지방세특례제한법 제67조①: 비영업용 승용 경자동차 취득세 75만원 한도 면제 (~2027.12.31)
 *   제66조④: 전기자동차 140만원 한도 면제 (~2026.12.31). 하이브리드(제66조③)는 2024.12.31 종료
 *   제22조의2: 18세 미만 자녀 3명↑ 면제(7인승 미만 승용은 140만원 한도), 2명 50%(7인승 미만 승용은 70만원 한도), ~2027.12.31
 *   제17조·제29조④: 장애인·국가유공자(상이 1~7급) 보철·생업용 — 승용 2,000cc 이하·7~10인승, 15인승 이하 승합,
 *   1톤 이하 화물, 250cc 이하 이륜 면제 (~2027.12.31)
 *   제177조의2: 면제세액이 200만원을 넘으면 85%만 감면 (제17·29·66조는 예외)
 *   제180조: 감면이 겹치면 감면세액이 큰 것 하나만
 */
export type CarType = 'passenger' | 'truck' | 'van' | 'motorcycle' | 'compact'
export type Usage = 'personal' | 'business'
export type VanSeats = '7-10' | '11+'
export type MotorcycleSize = 'small' | 'large'

export interface CarAcqInput {
  price: number
  carType: CarType
  usage: Usage
  vanSeats: VanSeats
  motorcycleSize: MotorcycleSize
  electric: boolean
  displacement: number // cc, 0 = 모름
  children: number     // 18세 미만 자녀 수 (0 = 해당 없음)
  disabled: boolean    // 장애인·국가유공자
}

export type Benefit = 'compact' | 'electric' | 'child2' | 'child3' | 'disabled'

const floor10 = (v: number) => Math.floor(v / 10 + 1e-6) * 10

/** 비영업용 승용 = 승용(7~10인승 포함) */
const isPassenger = (i: CarAcqInput) => i.carType === 'passenger' || i.carType === 'compact' || (i.carType === 'van' && i.vanSeats === '7-10')

export function carAcqRate(i: CarAcqInput): number {
  if (i.carType === 'motorcycle' && i.motorcycleSize === 'small') return 0.02
  if (i.usage === 'business') return 0.04
  if (i.carType === 'compact') return 0.04
  return isPassenger(i) ? 0.07 : 0.05
}

/** drop = 그 감면이 없다고 보고 계산 (종료 시 영향 비교용) */
export function carAcqTax(i: CarAcqInput, drop?: Benefit) {
  const price = Math.max(0, i.price)
  const rate = carAcqRate(i)
  const gross = floor10(price * rate)
  const personal = i.usage === 'personal'
  // 7인승 미만 승용 (다자녀 한도 적용 대상)
  const smallCar = i.carType === 'passenger' || i.carType === 'compact'
  const cands: { key: Benefit; amount: number }[] = []

  if (personal && i.carType === 'compact') cands.push({ key: 'compact', amount: Math.min(gross, 750_000) })
  if (i.electric && i.carType !== 'motorcycle') cands.push({ key: 'electric', amount: Math.min(gross, 1_400_000) })
  if (i.children >= 3) {
    const full = smallCar ? Math.min(gross, 1_400_000) : gross
    cands.push({ key: 'child3', amount: full === gross && gross > 2_000_000 ? floor10(gross * 0.85) : full })
  } else if (i.children === 2) {
    cands.push({ key: 'child2', amount: smallCar ? Math.min(floor10(gross * 0.5), 700_000) : floor10(gross * 0.5) })
  }
  // ponytail: 승합 15인승·화물 1톤·이륜 250cc 요건은 입력이 없어 충족으로 가정, 승용은 배기량을 아는 경우만 2,000cc 확인
  const disabledOk = !(i.carType === 'passenger' && i.displacement > 2000)
  if (i.disabled && disabledOk) cands.push({ key: 'disabled', amount: gross })

  const best = cands.filter((c) => c.key !== drop).reduce<{ key: Benefit; amount: number } | null>((a, b) => (!a || b.amount > a.amount ? b : a), null)
  const benefit = best?.amount ?? 0
  return { rate, gross, benefit, benefitKey: best?.key ?? null, tax: gross - benefit, disabledBlocked: i.disabled && !disabledOk }
}

/** 감면 일몰일(취득일 기준): 전기차 지특법 제66조④, 경차 제67조① */
export const RELIEF_END = { electric: '2026-12-31', compact: '2027-12-31' } as const

/** 그 감면이 끝나면 늘어나는 취득세 (다른 감면이 대신 적용되면 그만큼 덜 늘어남, 제180조) */
export const reliefAtStake = (i: CarAcqInput, key: keyof typeof RELIEF_END) => carAcqTax(i, key).tax - carAcqTax(i).tax

/** 도시철도·지역개발채권: 비영업용 승용 1,600cc 미만은 2023.3부터 매입 면제(행정안전부) */
export function bondExempt(i: CarAcqInput): boolean {
  return i.usage === 'personal' && isPassenger(i) && (i.carType === 'compact' || (i.displacement > 0 && i.displacement < 1600))
}
