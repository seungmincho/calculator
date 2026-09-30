// 수도요금(가정용, 월 기준) 순수 계산. 요율 개정 시 REGIONS만 수정.
// 수돗물·하수도사용료는 부가가치세 면세 → VAT 없음.

/** 누진 구간: upTo = 누적 상한(㎥), 마지막은 Infinity */
export interface Tier { upTo: number; rate: number }

export interface Rates {
  /** 계량기 15mm 월 기본요금(원) */
  basic: number
  water: Tier[]
  sewer: Tier[]
  /** 물이용부담금(원/㎥) */
  levy: number
}

export type RegionId = 'seoul' | 'busan'

export const REGIONS: Record<RegionId, Rates & { source: string }> = {
  // 서울아리수본부 가정용 요금계산: 상수도 580원(2023.1.1~), 하수도 480원(2026.1.1~, 단일요금), 물이용부담금 170원, 15mm 기본 1,080원
  seoul: {
    basic: 1080,
    water: [{ upTo: Infinity, rate: 580 }],
    sewer: [{ upTo: Infinity, rate: 480 }],
    levy: 170,
    source: 'https://i121.seoul.go.kr/cs/cyber/front/cgcalc/NR_cgCalcHomePurpose.do?_m=m1_3_1',
  },
  // 부산 상수도사업본부 수도요금 산정표(2026년 2월 부과분~): 상수도 920원 단일, 15mm 기본 1,200원,
  // 하수도 누진 580/750/790/1,110원, 물이용부담금 170×0.881(BOD 3.0) = 149.8원
  busan: {
    basic: 1200,
    water: [{ upTo: Infinity, rate: 920 }],
    sewer: [
      { upTo: 10, rate: 580 },
      { upTo: 20, rate: 750 },
      { upTo: 30, rate: 790 },
      { upTo: Infinity, rate: 1110 },
    ],
    levy: 149.8,
    source: 'https://www.busan.go.kr/water/wtchargeguide01',
  },
}

/** 서울·부산 요금 인상 자료의 가구 예시 기준 1인당 월 6㎥ */
export const AVG_PER_PERSON = 6
export const avgUsage = (people: number) => AVG_PER_PERSON * people

export function tiered(usage: number, tiers: Tier[]): number {
  let fee = 0
  let prev = 0
  for (const { upTo, rate } of tiers) {
    if (usage <= prev) break
    fee += (Math.min(usage, upTo) - prev) * rate
    prev = upTo
  }
  return fee
}

export interface Bill { basic: number; water: number; sewer: number; levy: number; total: number }

// ponytail: 항목별 원 단위 절사. 실제 고지서는 10원 미만 절사·2개월 합산 등으로 수십 원 차이 가능.
export function calcBill(usage: number, r: Rates): Bill {
  const u = Math.max(0, usage)
  const water = Math.floor(tiered(u, r.water))
  const sewer = Math.floor(tiered(u, r.sewer))
  const levy = Math.floor(u * r.levy)
  return { basic: r.basic, water, sewer, levy, total: r.basic + water + sewer + levy }
}

/** 사용량을 saveM3 만큼 줄였을 때 월 절감액(누진 구간 반영) */
export const savingWon = (usage: number, saveM3: number, r: Rates) =>
  calcBill(usage, r).total - calcBill(Math.max(0, usage - saveM3), r).total

/** 하루 L × 인원 × 30일 → ㎥/월 */
export const dailyLitersToM3 = (litersPerPersonDay: number, people: number) =>
  (litersPerPersonDay * people * 30) / 1000
