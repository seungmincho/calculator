// 연금저축·IRP 세액공제 (/pension-tax-credit). 회귀 체크: node scripts/check-pension-tax-credit.ts
// 세금 계산은 yearEndTax.ts(연말정산 계산기와 같은 함수). 여기서는 ISA 만기 전환 추가 한도와 인출 시 세금만 더한다.
// 근거(2026-10-04 확인, law.go.kr): 소득세법 §59의3(2025.12.23 개정 법률 제21221호), 시행령 §40의2·§40의3·§118의2③·§118의3,
//   §129①5의2·6나(연금소득 5/4/3%, 연금외수령 기타소득 15%), §14③9호(사적연금 연 1,500만 분리과세), §64의4(초과 시 15% 분리과세 선택)
import { itemTaxSaving, pensionRate } from './yearEndTax.ts'

export const PS_CAP = 6_000_000        // 연금저축 공제 한도
export const TOTAL_CAP = 9_000_000     // 연금저축(600 이내) + 퇴직연금(IRP 등) 합산 한도
export const ISA_RATE = 0.1            // §59의3④ 전환금액의 10%
export const ISA_CAP = 3_000_000       //   최대 300만
export const ANNUAL_PAY_CAP = 18_000_000 // 시행령 §40의2②1가 연간 납입 한도(연금계좌 합산, ISA 전환금액 별도)
export const EXIT_RATE = 0.165         // 연금외수령(중도해지) 기타소득세 15% + 지방소득세
export const ANNUITY_RATES = [0.055, 0.044, 0.033] as const // 연금수령 시 70세 미만 / 70~79세 / 80세 이상 (지방세 포함)
export const LIFE_ANNUITY_RATE = 0.033 // 종신형 (2026.1.1 이후 수령분, 4% → 3%)
export const PRIVATE_PENSION_LIMIT = 15_000_000 // 사적연금 연 1,500만 이하 → 저율 분리과세
export const SEPARATE_RATE = 0.165     // 초과 시 선택 가능한 분리과세 15% + 지방세

export type IsaTo = 'ps' | 'irp'
export interface PensionIn { salary: number; ps: number; irp: number; isa?: number; isaTo?: IsaTo }

/** 공제 대상 납입액. ISA 전환금액도 연금계좌 납입액(§59의3③) → 들어간 계좌의 일반 한도를 먼저 채우고,
 *  한도가 전환금액의 10%(최대 300만)만큼 늘어난다(④). 공제 대상은 실제 납입액을 넘지 못함 */
export function creditBase({ ps, irp, isa = 0, isaTo = 'ps' }: Omit<PensionIn, 'salary'>) {
  const p = ps + (isaTo === 'ps' ? isa : 0)
  const r = irp + (isaTo === 'irp' ? isa : 0)
  const regular = Math.min(Math.min(p, PS_CAP) + r, TOTAL_CAP)
  const isaExtra = Math.min(p + r - regular, Math.min(Math.floor(isa * ISA_RATE), ISA_CAP))
  // 한도 초과 납입(직접 넣은 돈 기준) — 다음 해 이후 납입액으로 전환 신청 가능(시행령 §118의3)
  const over = ps + irp - Math.min(Math.min(ps, PS_CAP) + irp, TOTAL_CAP)
  return { p, r, regular, isaExtra, base: regular + isaExtra, psRoom: Math.max(0, PS_CAP - p), room: TOTAL_CAP - regular, over }
}

/** 실제로 줄어드는 세금(지방소득세 포함). 결정세액이 바닥나면 공제액이 커도 더 줄지 않는다.
 *  기본 상황 = 연봉만(본인 기본공제·4대보험 자동·카드 0, 표준세액공제 13만과 특별공제 중 유리한 쪽) — itemTaxSaving과 같음 */
export function pensionTax(x: PensionIn) {
  const b = creditBase(x)
  const rate = pensionRate(x.salary)
  const r = itemTaxSaving({ salary: x.salary }, { pensionSavings: b.p, irp: b.r })
  // ISA 추가 한도분: 같은 공제율, 일반 공제 뒤 남은 결정세액까지만
  const extra = Math.min(Math.floor(b.isaExtra * rate), r.after.determined)
  const determined = r.after.determined - extra
  const taxAfter = determined + Math.floor(determined * 0.1)
  const credit = Math.floor(b.base * rate)
  const det0 = r.before.determined // 연금 공제 전 결정세액(소득세) = 공제로 줄일 수 있는 최대치
  const usefulBase = Math.ceil(det0 / rate) // 이 납입액을 넘으면 세금이 더 줄지 않음
  return {
    ...b, rate, det0, usefulBase,
    nominal: credit + Math.floor(credit * 0.1), // 공제액(지방세 포함, 결정세액 한도 전)
    taxBefore: r.before.totalTax, taxAfter,
    saving: r.before.totalTax - taxAfter,
    wasted: Math.max(0, b.base - usefulBase),
  }
}

/** add원을 12월 31일까지 더 넣을 때 (연금저축 600만 한도부터, 나머지 IRP) */
export function topUp(x: PensionIn, add: number) {
  const cur = pensionTax(x)
  const amt = Math.max(0, Math.min(add, cur.room))
  const toPs = Math.min(amt, cur.psRoom)
  const next = pensionTax({ ...x, ps: x.ps + toPs, irp: x.irp + amt - toPs })
  return { cur, next, amt, toPs, toIrp: amt - toPs, gain: next.saving - cur.saving }
}

/** 공제받은 납입액(base)을 나중에 꺼낼 때 세금. gainRate = 그때까지 누적 운용수익률. 공제받지 않은 납입액은 비과세 */
export function exitTax(base: number, gainRate: number) {
  const total = base + Math.round(base * gainRate)
  return {
    total,
    early: Math.floor(total * EXIT_RATE),
    annuity: ANNUITY_RATES.map((r) => Math.floor(total * r)),
  }
}
