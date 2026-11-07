// 건강보험 피부양자 자격 판정 — 부양·소득·재산요건. 회귀 체크: node scripts/check-dependent-eligibility.ts
// 금액 단위: 원(연간). 모든 기준은 2026-11-07 원문 확인.
//
// 출처
// [R]  국민건강보험법 시행규칙 제2조(인정기준·취득·상실), 제44조(소득 산정방법) — 2026.9.28 시행본
//      https://www.law.go.kr/법령/국민건강보험법시행규칙
// [B1] 시행규칙 [별표 1] 피부양자 자격의 인정기준 중 부양요건 <개정 2018.3.6>
//      https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsNm=국민건강보험법+시행규칙&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=&bylEfYdYn=Y
// [B2] 시행규칙 [별표 1의2] 피부양자 자격의 인정기준 중 소득 및 재산요건 <개정 2025.4.23>
//      https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsNm=국민건강보험법+시행규칙&bylNo=0001&bylBrNo=02&bylCls=BE&bylEfYd=&bylEfYdYn=Y
// [D]  국민건강보험법 시행령 제41조 ①소득 종류(공적연금은 전액) ③소득자료 반영 시기 — 2026.10.1 시행본
//      https://www.law.go.kr/법령/국민건강보험법시행령
// [N]  국민건강보험공단 「피부양자 자격의 인정기준 중 소득 및 재산요건」(주택임대소득 예외, 형제자매 '만' 나이, 정관 제43조의4 재산자료 반영 시기)
//      https://www.nhis.or.kr/nhis/policy/wbhada07400m01.do
//
// 확인 필요(판정에 넣지 않음):
// - 금융소득 1천만원 이하 제외: 시행규칙 제44조① 단서는 '소득월액(보험료)' 산정에 대한 규정이다. 피부양자 소득요건([B2] 1.가)에도
//   적용되는지는 법령·공단 안내에서 확인되지 않아, 판정은 금융소득을 합계에 넣고 빼면 결과가 바뀌는 경우만 financialUncertain 으로 알린다.
// - 친생부모(법률상 부모가 아닌 경우, [B1] 2.나)·사실혼 세부·주택재건축 사업소득([B2] 1.다) 등 공단 개별 인정은 다루지 않는다.

export const DEP = {
  incomeLimit: 20_000_000,       // [B2] 1.가 소득 합계 연 2천만원 이하
  businessLimit: 5_000_000,      // [B2] 1.나 단서 사업소득 연 500만원 이하면 '없는 것'으로 봄
  propertyBase: 540_000_000,     // [B2] 2.가 2) 재산세 과세표준 합 5억4천만원 이하
  propertyMax: 900_000_000,      // [B2] 2.가 1) 5억4천만원 초과 9억원 이하이면서
  propertyMidIncome: 10_000_000, //            소득 합계 연 1천만원 이하
  siblingProperty: 180_000_000,  // [B2] 2.나 형제자매([B1] 10호) 1억8천만원 이하
  siblingUnder: 30,              // [B1] 10호 가. 30세 미만 ([N] 만 나이)
  siblingFrom: 65,               // [B1] 10호 나. 65세 이상
  financialExclusion: 10_000_000, // [R] 제44조① 단서 — 보험료 산정용. 피부양자 판정 적용은 확인 필요
} as const

export const RELATIONS = ['spouse', 'parent', 'grandparent', 'child', 'stepchild', 'grandchild', 'childSpouse', 'sibling', 'other'] as const
export type Relation = typeof RELATIONS[number]
export const MARITALS = ['single', 'divorced', 'married'] as const // 미혼 / 이혼·사별 / 기혼
export type Marital = typeof MARITALS[number]
export type Blocker = 'parentApart' | 'grandparentApart' | 'grandchildTogether' | 'grandchildApart' | 'siblingTogether' | 'siblingApart'

export interface DependentInput {
  relation: Relation
  together: boolean      // 직장가입자와 동거
  age: number            // 만 나이 (형제자매만 씀, 모르면 NaN)
  disabled: boolean      // 등록 장애인 또는 상이등급 국가유공자·보훈보상대상자 ([B1] 10호 다~마, [B2] 1.나 2)~4))
  marital: Marital
  blocker: boolean       // asks().blocker 질문에 '예' — 보수·소득 있는 다른 가족(손자녀 따로 살면: 부모가 있음)
  kidsIncome: boolean    // 이혼·사별: 그 사람의 자녀 중 보수·소득 있는 사람이 있음
  business: number
  bizRegistered: boolean
  housingRental: boolean // 사업소득에 주택임대소득 포함 ([B2] 1.나 1) 괄호)
  financial: number      // 이자·배당
  pension: number        // 공적연금 전액 ([D] 제41조①5호)
  wage: number           // 근로소득(비과세 제외 총급여)
  other: number          // 기타소득금액
  propertyTaxBase: number // 토지·건축물·주택·선박·항공기 재산세 과세표준 합
}

/** 관계·동거 여부에 따라 더 물어볼 것 ([B1] 표의 동거/비동거 칸) */
export function asks(relation: Relation, together: boolean): { age: boolean; marital: boolean; blocker: Blocker | null } {
  const marital = relation === 'sibling' || (!together && (relation === 'child' || relation === 'grandchild')) || (together && relation === 'stepchild')
  const blocker: Blocker | null =
    relation === 'parent' && !together ? 'parentApart'
      : relation === 'grandparent' && !together ? 'grandparentApart'
        : relation === 'grandchild' ? (together ? 'grandchildTogether' : 'grandchildApart')
          : relation === 'sibling' ? (together ? 'siblingTogether' : 'siblingApart')
            : null
  return { age: relation === 'sibling', marital, blocker }
}

export type SupportReason =
  | 'spouse' | 'together' | 'noEarner' | 'single' | 'divorcedOk' | 'noParents'
  | 'earner' | 'parentsAlive' | 'married' | 'divorcedKids' | 'apart' | 'siblingStatus' | 'other'

/** 부양요건 [B1] */
export function support(i: Pick<DependentInput, 'relation' | 'together' | 'age' | 'disabled' | 'marital' | 'blocker' | 'kidsIncome'>): { ok: boolean; reason: SupportReason } {
  const r = (ok: boolean, reason: SupportReason) => ({ ok, reason })
  // 이혼·사별: 자녀인 직계비속이 없거나 있어도 보수·소득이 없어야 함 (3·5·9·10호 단서)
  const kids = () => (i.marital === 'divorced' ? (i.kidsIncome ? r(false, 'divorcedKids') : r(true, 'divorcedOk')) : null)
  switch (i.relation) {
    case 'spouse': return r(true, 'spouse')                                    // 1호
    case 'parent':                                                             // 2호·7호
    case 'grandparent':                                                        // 4호·8호
      return i.together ? r(true, 'together') : i.blocker ? r(false, 'earner') : r(true, 'noEarner')
    case 'childSpouse': return i.together ? r(true, 'together') : r(false, 'apart') // 6호
    case 'child':                                                              // 3호
      if (i.together) return r(true, 'together')
      if (i.marital === 'married') return r(false, 'married')
      return kids() ?? r(true, 'single')
    case 'stepchild':                                                          // 9호: 비동거 불인정
      if (!i.together) return r(false, 'apart')
      if (i.marital === 'married') return r(false, 'married')
      return kids() ?? r(true, 'single')
    case 'grandchild':                                                         // 5호
      if (i.together) return i.blocker ? r(false, 'earner') : r(true, 'noEarner')
      if (i.marital === 'married') return r(false, 'married')
      if (i.blocker) return r(false, 'parentsAlive')
      return kids() ?? r(true, 'noParents')
    case 'sibling':                                                            // 10호
      if (!(i.age < DEP.siblingUnder || i.age >= DEP.siblingFrom || i.disabled)) return r(false, 'siblingStatus')
      if (i.marital === 'married') return r(false, 'married')
      if (i.blocker) return r(false, 'earner')
      return kids() ?? r(true, 'noEarner')
    default: return r(false, 'other')
  }
}

export type BusinessReason = 'none' | 'small' | 'registered' | 'housingRental' | 'over'

/** 사업소득 요건 [B2] 1.나 — 없어야 하나, 예외 대상이면 연 500만원 이하를 '없음'으로 봄 */
export function businessTest(amount: number, registered: boolean, housingRental: boolean, disabled: boolean): { ok: boolean; reason: BusinessReason } {
  if (amount <= 0) return { ok: true, reason: 'none' }
  const exempt = disabled || (!registered && !housingRental)
  if (!exempt) return { ok: false, reason: registered ? 'registered' : 'housingRental' }
  return amount <= DEP.businessLimit ? { ok: true, reason: 'small' } : { ok: false, reason: 'over' }
}

export type PropertyBand = 'low' | 'mid' | 'high' | 'sibling'

/** 재산요건 [B2] 2. — total = 소득 합계 */
export function propertyTest(relation: Relation, base: number, total: number): { ok: boolean; band: PropertyBand } {
  if (relation === 'sibling') return { ok: base <= DEP.siblingProperty, band: 'sibling' }
  if (base <= DEP.propertyBase) return { ok: true, band: 'low' }
  if (base <= DEP.propertyMax) return { ok: total <= DEP.propertyMidIncome, band: 'mid' }
  return { ok: false, band: 'high' }
}

function evaluate(i: DependentInput) {
  const total = i.business + i.financial + i.pension + i.wage + i.other
  const biz = businessTest(i.business, i.bizRegistered, i.housingRental, i.disabled)
  const totalOk = total <= DEP.incomeLimit
  const property = propertyTest(i.relation, i.propertyTaxBase, total)
  const sup = support(i)
  // 소득 합계 기준까지 남은 금액 (재산 5.4억 초과 구간이면 1천만원 기준이 더 낮음). 9억 초과·형제자매 1.8억 초과면 의미 없음
  const limit = property.band === 'mid' ? DEP.propertyMidIncome : DEP.incomeLimit
  return {
    support: sup,
    income: { ok: totalOk && biz.ok, total, totalOk, business: biz },
    property,
    room: property.ok ? limit - total : NaN,
    eligible: sup.ok && totalOk && biz.ok && property.ok,
  }
}

/** 판정. 금융소득이 1천만원 이하인데 빼고 계산하면 결과가 바뀌면 financialUncertain (위 '확인 필요' 참고) */
export function judge(i: DependentInput) {
  const v = evaluate(i)
  const alt = i.financial > 0 && i.financial <= DEP.financialExclusion ? evaluate({ ...i, financial: 0 }) : v
  return { ...v, financialUncertain: alt.eligible !== v.eligible }
}

/** 지금 판정에 쓰이는 자료 연도 — 소득 [D] 제41조③ (별표 1의2 1.가가 같은 항을 따름), 재산 [N] 정관 제43조의4(6월 1일 기준, 11월~다음 해 10월) */
export function dataYears(year: number, month: number): { income: number; pension: number; property: number } {
  return month >= 11 ? { income: year - 1, pension: year - 1, property: year } : { income: year - 2, pension: year - 1, property: year - 1 }
}
