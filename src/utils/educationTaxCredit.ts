// 교육비 세액공제 계산기(/education-tax-credit) 전용 로직. 세금은 yearEndTax.ts(연말정산 계산기와 같은 함수)로 계산.
// 회귀 체크: node scripts/check-education-tax-credit.ts
// 근거(2026-11-08 law.go.kr 원문 확인, 2026년 지급분):
//  - 소득세법 §59의4③ — 2025.12.23 법률 제21221호(2026.1.1 시행)로 본문 "나이" → "나이 및 소득"(부양가족 소득요건 폐지),
//    1호 마목 신설(9세 미만 또는 2학년 이하 초등학생 예능 학원·체육시설), 부칙 §5 "이 법 시행 이후 교육비를 지급하는 경우부터"
//  - 1호 단서: 1호 "각 목의 교육비를 합산한 금액"에 대학생 1명당 900만, 취학 전 아동과 초·중·고등학생 1명당 300만 한도.
//    마목도 1호 안이므로 초등 1·2학년의 학교 교육비와 예체능 학원비는 합쳐서 1명당 300만 (별도 한도 아님).
//    대학원과 직계비속등이 학자금 대출로 낸 교육비는 1호에서 제외. 2호(본인)·3호(장애인 특수교육비)는 한도 없음.
//  - 시행령 §118의6 (2026.2.27 개정): ①4 교복(중·고생) 1명당 50만, ①6 현장체험학습 1명당 30만, ①7 수능 응시료·입학전형료,
//    ⑦ 취학 전 학원·체육시설 / ⑩ 마목 — 월 단위·주 1회 이상 교습과정 수강료, ⑧ 마목 학원 = 학원법 시행령 별표 2 예능분야
import { itemTaxSaving } from './yearEndTax.ts'

export const KINDS = ['self', 'preschool', 'lower', 'school', 'univ', 'disabled'] as const
export type Kind = (typeof KINDS)[number]

/** 구분별 입력 항목. 순서 = 공유 URL 값 순서 (바꾸면 예전 링크가 어긋남) */
export const ITEMS = {
  self: ['grad', 'training', 'loan', 'exam'],     // §59의4③2: 대학·대학원 등록금, 직업훈련 수강료, 학자금 대출 상환, 1호가목(수능 응시료 등)
  preschool: ['care', 'academy'],                // 1호가목 유치원·라목 어린이집, 라목 학원·체육시설
  lower: ['school', 'trip', 'arts'],             // 1호가목 학교 + 마목 예능 학원·체육시설
  school: ['school', 'uniform', 'trip', 'exam'], // 1호가목 (교과 학원은 공제 대상 아님)
  univ: ['tuition', 'exam'],                     // 1호가목 (대학원 제외)
  disabled: ['special'],                         // 3호 장애인 특수교육비 (직계존속도 대상)
} as const satisfies Record<Kind, readonly string[]>
export type Item = (typeof ITEMS)[Kind][number]

/** 1명당 연 한도 (§59의4③1 단서). 본인·장애인 특수교육비는 한도 없음 */
export const PERSON_CAP: Record<Kind, number> = {
  self: Infinity, preschool: 3_000_000, lower: 3_000_000, school: 3_000_000, univ: 9_000_000, disabled: Infinity,
}
/** 항목별 1명당 연 한도 (시행령 §118의6①4·6) — 1명당 한도 안에서 다시 묶인다 */
export const ITEM_CAP: Partial<Record<Item, number>> = { uniform: 500_000, trip: 300_000 }
export const RATE = 0.15

export interface Person { kind: Kind; a: Partial<Record<Item, number>> }

export function personOf(p: Person) {
  const items = ITEMS[p.kind].map((key) => {
    const amount = Math.max(0, p.a[key] ?? 0)
    return { key, amount, counted: Math.min(amount, ITEM_CAP[key] ?? Infinity) }
  })
  const spent = items.reduce((s, x) => s + x.amount, 0)
  const counted = items.reduce((s, x) => s + x.counted, 0)
  const cap = PERSON_CAP[p.kind]
  const eligible = Math.min(counted, cap)
  return { kind: p.kind, items, spent, counted, cap, eligible, over: spent - eligible, room: Math.max(0, cap - eligible) }
}

/** 공제 대상 교육비 합계 → 줄어드는 세금(지방소득세 포함).
 *  1인별 한도는 personOf에서 이미 적용했으므로 합계를 한도 없는 eduSelf 자리에 넣는다 → yearEndTax.educationCredit = floor(합계 × 15%).
 *  eduSchool·eduUniv 자리는 '자녀 수 × 300만/900만' 합산 한도라 1인별 한도(한 명은 넘고 한 명은 남는 경우)를 표현하지 못한다.
 *  결정세액 한도·표준세액공제(13만원) 선택은 calc가 처리 */
export const savingOf = (salary: number, eligible: number) => itemTaxSaving({ salary }, { eduSelf: eligible })

/** none 교육비 없음 / noTax 낼 세금이 원래 0 / standard 표준세액공제(13만)가 더 유리 / partial 결정세액 한도로 일부만 / full 공제액(+지방소득세 10%)만큼 그대로 */
export type Status = 'none' | 'noTax' | 'standard' | 'partial' | 'full'

export function analyze(salary: number, people: Person[]) {
  const base = people.map(personOf)
  const spent = base.reduce((s, x) => s + x.spent, 0)
  const eligible = base.reduce((s, x) => s + x.eligible, 0)
  const credit = Math.floor(eligible * RATE)
  const { before, after, saving } = savingOf(salary, eligible)
  const status: Status = spent === 0 ? 'none' : before.determined === 0 ? 'noTax'
    : after.standard ? 'standard' : saving + 2 < Math.floor(credit * 1.1) ? 'partial' : 'full'
  // 한도가 남은 사람(1명당 한도가 있는 구분)이 올해 안에 남은 한도만큼 더 내면 추가로 줄어드는 세금
  const rows = base.map((x) => ({ ...x, more: Number.isFinite(x.room) && x.room > 0 ? savingOf(salary, eligible + x.room).saving - saving : 0 }))
  return { rows, spent, eligible, over: spent - eligible, credit, saving, status, tax: before.totalTax }
}

/** 연말정산 계산기(/year-end-tax) 키. es = 한도 없는 칸(본인 + 장애인 특수교육비), esc = 취학 전·초중고, eu = 대학생.
 *  1인별 한도는 허브가 자녀 수로 다시 적용하므로 넘기기 전 금액, 교복·체험학습 항목 한도만 적용한 금액(허브에 그 칸이 없음) */
export function hubAmounts(people: Person[]) {
  const out = { es: 0, esc: 0, eu: 0 }
  for (const x of people.map(personOf)) {
    const key = x.kind === 'univ' ? 'eu' : x.kind === 'self' || x.kind === 'disabled' ? 'es' : 'esc'
    out[key] += x.counted
  }
  return out
}

// ── 페이지 예시 (page.tsx 본문·FAQ가 이 값으로 렌더링, check 스크립트가 숫자 고정) ──
export const EXAMPLES = {
  /** 계산기 첫 화면 기본값: 연봉 5,000만, 초2 자녀 피아노 월 15만 + 태권도 월 15만 = 연 360만 → 300만 한도 */
  d: { salary: 50_000_000, people: [{ kind: 'lower', a: { arts: 3_600_000 } }] as Person[] },
  /** 연봉 6,000만, 중학생: 방과후·급식 등 180만 + 교복 60만 + 수학여행 40만 → 180 + 50 + 30 = 260만 */
  mid: { salary: 60_000_000, people: [{ kind: 'school', a: { school: 1_800_000, uniform: 600_000, trip: 400_000 } }] as Person[] },
  /** 연봉 8,000만, 대학생 자녀 등록금 연 1,000만 → 900만 한도 */
  univ: { salary: 80_000_000, people: [{ kind: 'univ', a: { tuition: 10_000_000 } }] as Person[] },
  /** 결정세액 한도: 연봉 2,500만, 본인 대학원 등록금 800만 */
  low: { salary: 25_000_000, people: [{ kind: 'self', a: { grad: 8_000_000 } }] as Person[] },
}
