// 연말정산 부양가족 공제 판정(/dependent-deduction) 전용 로직. 세금은 yearEndTax.ts(연말정산 계산기와 같은 함수)로 계산.
// 회귀 체크: node scripts/check-dependent-deduction.ts
// 근거 (2026-11-08 casenote.kr 조문 확인):
//  소득세법 §50① 기본공제 1명당 150만: 배우자·부양가족은 연간 소득금액 합계 100만원 이하(총급여 500만원 이하의 근로소득만 있으면 포함).
//    부양가족 = 직계존속 60세 이상, 직계비속·입양자 20세 이하, 형제자매 20세 이하·60세 이상, 기초생활 수급자, 가정위탁 아동.
//    장애인은 나이 요건 없음. 배우자는 나이 무관
//  §53⑤ 나이 요건은 과세기간 중 해당 나이가 되는 날이 하루라도 있으면 충족 → 출생연도로 판정 (2026 귀속 1966년 이전·2006년 이후)
//  §53①②③ 주민등록 동거 + 생계 같이. 직계비속·입양자는 예외, 취학·질병·근무 일시퇴거 인정, 직계존속은 주거 형편상 별거 인정
//  §51① 경로우대(70세 이상) 100만, 장애인 200만, 부녀자 50만(종합소득금액 3천만 이하), 한부모 100만, 둘 다면 한부모만
//  §47의2 연금소득공제(총연금액, 분리과세 제외): 350만 이하 전액 / 700만 이하 350만+초과분 40% / 1,400만 이하 490만+20% / 초과 630만+10%, 한도 900만
//  §14③ 분리과세(소득금액에서 빠짐): 일용근로(2호), 이자·배당 합계 2천만 이하(6호), 기타소득금액 300만 이하 선택(8호), 사적연금 1,500만 이하 선택(9호)
//  §59의2 자녀세액공제: 기본공제 자녀(입양자·위탁아동 포함)·손자녀. 2026 귀속 대상 나이는 yearEndTax.ts 주석(2016년 이전 출생)
// 확인 못 함: 시행령 §106(위탁아동 나이·양육 기간, 일시퇴거 사유 세부)은 casenote에 없어 위탁아동은 직계비속처럼 20세 이하로 판정.
// 미반영: 2026.8 정부 세제개편안(소득금액 300만·총급여 750만으로 상향) — 국회 심의 중, 적용 연도 미확정
import { earnedIncomeDeduction, itemTaxSaving, TAX_YEAR, type YetInput } from './yearEndTax.ts'

export const RELATIONS = ['spouse', 'parent', 'child', 'grandchild', 'sibling', 'foster', 'recipient'] as const
export type Relation = (typeof RELATIONS)[number]
export const INCOMES = ['wage', 'daily', 'business', 'publicPension', 'privatePension', 'financial', 'other', 'capitalGains', 'retirement'] as const
export type IncomeKey = (typeof INCOMES)[number]
export type Incomes = Record<IncomeKey, number>
export const NO_INCOME = Object.fromEntries(INCOMES.map((k) => [k, 0])) as Incomes

/** apart: 주민등록상 따로 삶(형제자매·수급자만 판정에 씀). spouseClaims: 맞벌이일 때 지금 배우자가 공제받고 있음 */
export interface Member { rel: Relation; born: number; disabled: boolean; apart: boolean; spouseClaims: boolean; inc: Incomes }
export interface Me { salary: number; female: boolean; single: boolean }

export const LIMIT = { income: 1_000_000, wageOnly: 5_000_000, financial: 20_000_000, other: 3_000_000, privatePension: 15_000_000, woman: 30_000_000 }
export const EXTRA = { elderly: 1_000_000, disabled: 2_000_000, woman: 500_000, single: 1_000_000, basic: 1_500_000 }
/** 이 해 이전(parent·elderly)/이후(young) 출생이면 나이 요건 충족 */
export const BORN = { parent: TAX_YEAR - 60, young: TAX_YEAR - 20, elderly: TAX_YEAR - 70 }
/** 2026 귀속 자녀세액공제 대상 = 2016년 이전 출생 (yearEndTax.ts kidsUnder8 주석). 귀속연도가 바뀌면 함께 고친다 */
export const CHILD_CREDIT_BORN_BY = 2016
/** 다른 소득 없이 공적연금만 있을 때 통과하는 총연금액 상한 (check 스크립트가 경계 확인) */
export const PENSION_LIMIT = 5_166_666

const KIDS: Relation[] = ['child', 'grandchild', 'foster']

export function pensionDeduction(total: number) {
  const d = total <= 3_500_000 ? total : total <= 7_000_000 ? 3_500_000 + (total - 3_500_000) * 0.4
    : total <= 14_000_000 ? 4_900_000 + (total - 7_000_000) * 0.2 : 6_300_000 + (total - 14_000_000) * 0.1
  return Math.floor(Math.min(d, 9_000_000))
}

/** 소득금액(종합+퇴직+양도). parts = 소득 종류별 소득금액(분리과세는 0), separated = 분리과세라 빠진 종류 */
export function incomeOf(inc: Incomes) {
  const privateIn = inc.privatePension > LIMIT.privatePension
  const pensionTotal = inc.publicPension + (privateIn ? inc.privatePension : 0)
  const pensionAmt = pensionTotal - pensionDeduction(pensionTotal)
  // 연금소득공제는 합계에 한 번 — 이유 문장용으로만 총연금액 비율로 나눈다
  const pubShare = pensionTotal ? Math.round(pensionAmt * (inc.publicPension / pensionTotal)) : 0
  const parts: Incomes = {
    wage: inc.wage - earnedIncomeDeduction(inc.wage),
    daily: 0,
    business: inc.business,
    publicPension: pubShare,
    privatePension: pensionAmt - pubShare,
    financial: inc.financial > LIMIT.financial ? inc.financial : 0,
    other: inc.other > LIMIT.other ? inc.other : 0,
    capitalGains: inc.capitalGains,
    retirement: inc.retirement,
  }
  const total = INCOMES.reduce((a, k) => a + parts[k], 0)
  const wageOnly = inc.wage > 0 && total === parts.wage
  const ok = wageOnly ? inc.wage <= LIMIT.wageOnly : total <= LIMIT.income
  const sources = INCOMES.filter((k) => parts[k] > 0).sort((a, b) => parts[b] - parts[a])
  const separated = INCOMES.filter((k) => inc[k] > 0 && parts[k] === 0 && k !== 'wage')
  return { total, parts, wageOnly, ok, sources, separated }
}

export function ageOk(rel: Relation, born: number) {
  if (rel === 'parent') return born <= BORN.parent
  if (KIDS.includes(rel)) return born >= BORN.young
  if (rel === 'sibling') return born >= BORN.young || born <= BORN.parent
  return true // 배우자·수급자
}

export type Fail = 'age' | 'apart' | 'wage' | 'income'
export function judge(m: Member) {
  const inc = incomeOf(m.inc)
  const fails: Fail[] = []
  if (!m.disabled && !ageOk(m.rel, m.born)) fails.push('age')
  if ((m.rel === 'sibling' || m.rel === 'recipient') && m.apart) fails.push('apart')
  if (!inc.ok) fails.push(inc.wageOnly ? 'wage' : 'income')
  const ok = fails.length === 0
  const elderly = m.born <= BORN.elderly
  return { ok, fails, inc, elderly, extra: ok ? (elderly ? EXTRA.elderly : 0) + (m.disabled ? EXTRA.disabled : 0) : 0 }
}
export type Judged = ReturnType<typeof judge>

/** 올해 태어난 자녀의 출산공제 순서(첫째 1 … 셋째 이상 3). 자녀 행 전체 기준.
 *  ponytail: 쌍둥이 등 올해 2명 이상이면 yearEndTax 입력이 하나라 마지막 순서 하나만 */
export function birthOrder(all: Member[]) {
  const kids = all.filter((m) => m.rel === 'child')
  return kids.some((m) => m.born === TAX_YEAR) ? Math.min(3, kids.length) : 0
}

/** §51①3·6 부녀자 50만 / 한부모 100만 (둘 다면 한부모). 배우자 없는 여성의 세대주 요건은 입력받지 않음(안내 문구) */
export function selfExtra(me: Me, list: Member[]) {
  if (me.single && list.some((m) => m.rel === 'child' || m.rel === 'grandchild')) return { kind: 'single' as const, amount: EXTRA.single }
  const income = me.salary - earnedIncomeDeduction(me.salary)
  if (me.female && income <= LIMIT.woman && (!me.single || list.length > 0)) return { kind: 'woman' as const, amount: EXTRA.woman }
  return { kind: null, amount: 0 }
}

/** 공제받는 가족 → yearEndTax 입력. extra(부녀자·한부모)는 calc 입력 칸이 없어 elderly(1명 = 100만)에 비율로 얹는다 */
export function toInput(list: Member[], order: number, extra = 0): Partial<YetInput> {
  const kids = list.filter((m) => KIDS.includes(m.rel))
  return {
    spouse: list.some((m) => m.rel === 'spouse'),
    children: kids.length,
    kidsUnder8: kids.filter((m) => m.born > CHILD_CREDIT_BORN_BY).length,
    others: list.filter((m) => m.rel !== 'spouse' && !KIDS.includes(m.rel)).length,
    elderly: list.filter((m) => m.born <= BORN.elderly).length + extra / EXTRA.elderly,
    disabled: list.filter((m) => m.disabled).length,
    birth: list.some((m) => m.rel === 'child' && m.born === TAX_YEAR) ? order : 0,
  }
}

const taxOf = (salary: number, list: Member[], order: number, extra = 0) => itemTaxSaving({ salary }, toInput(list, order, extra)).after.totalTax

/** 맞벌이: 공제 가능한 가족(배우자 행 제외)을 누가 받을지 모든 조합 → 두 사람 세금(지방소득세 포함) 합이 가장 적은 배분.
 *  부녀자·한부모는 배분과 관계없어 비교에서 뺀다. 각자 다른 공제가 없다고 본 근사 (medicalTaxCredit couple과 같음) */
export const MAX_SPLIT = 12 // ponytail: 2^12 조합 상한. 13번째 가족부터는 지금 배분 그대로
export function couple(salary: number, spouseSalary: number, members: Member[], rows: Judged[], order: number) {
  const ok = members.map((m, i) => rows[i].ok)
  const fixedMe = members.filter((m, i) => ok[i] && m.rel === 'spouse')
  const movable = members.map((_, i) => i).filter((i) => ok[i] && members[i].rel !== 'spouse')
  const free = movable.slice(0, MAX_SPLIT)
  const memo = new Map<string, number>()
  const tax = (s: number, list: Member[]) => {
    const key = `${s}|${JSON.stringify(toInput(list, order))}`
    if (!memo.has(key)) memo.set(key, taxOf(s, list, order))
    return memo.get(key)!
  }
  const evalMask = (mask: number) => {
    const toSpouse = (i: number) => { const j = free.indexOf(i); return j >= 0 ? !!(mask & (1 << j)) : members[i].spouseClaims }
    const mine = [...fixedMe, ...movable.filter((i) => !toSpouse(i)).map((i) => members[i])]
    const theirs = movable.filter(toSpouse).map((i) => members[i])
    const me = tax(salary, mine)
    const sp = tax(spouseSalary, theirs)
    return { mask, toSpouse: members.map((_, i) => ok[i] && members[i].rel !== 'spouse' && toSpouse(i)), me, spouse: sp, total: me + sp }
  }
  const curMask = free.reduce((a, i, j) => a | (members[i].spouseClaims ? 1 << j : 0), 0)
  const bits = (n: number) => n.toString(2).replace(/0/g, '').length
  const current = evalMask(curMask)
  let best = current
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const r = evalMask(mask)
    // 같은 세금이면 지금 배분에서 덜 옮기는 쪽
    if (r.total < best.total || (r.total === best.total && bits(mask ^ curMask) < bits(best.mask ^ curMask))) best = r
  }
  return { current, best, gain: current.total - best.total, before: tax(salary, []) + tax(spouseSalary, []), capped: movable.length > MAX_SPLIT }
}

/** 전체 판정 + 줄어드는 세금. 맞벌이(spouseSalary > 0)면 가족은 지금 공제받는 사람(spouseClaims) 쪽으로 계산 */
export function analyze(me: Me, members: Member[], spouseSalary = 0) {
  const rows = members.map(judge)
  const order = birthOrder(members)
  const dual = spouseSalary > 0
  const toSpouse = (m: Member) => dual && m.spouseClaims && m.rel !== 'spouse'
  const mine = members.filter((m, i) => rows[i].ok && !toSpouse(m))
  const theirs = members.filter((m, i) => rows[i].ok && toSpouse(m))
  // 맞벌이면 부녀자·한부모 제외 (couple 주석)
  const self = dual ? { kind: null, amount: 0 } : selfExtra(me, mine)
  const myTax = (list: Member[]) => taxOf(me.salary, list, order, dual ? 0 : selfExtra(me, list).amount)
  const spTax = (list: Member[]) => taxOf(spouseSalary, list, order)
  // 아무도 안 넣은 세금 (부녀자·한부모도 없음) vs 공제 가능 가족을 모두 넣은 세금
  const before = taxOf(me.salary, [], order) + (dual ? spTax([]) : 0)
  const after = myTax(mine) + (dual ? spTax(theirs) : 0)
  // 가족별 기여: 그 사람을 뺐을 때 공제받는 쪽 세금이 늘어나는 금액
  const contrib = members.map((m, i) => {
    if (!rows[i].ok) return 0
    if (toSpouse(m)) return spTax(theirs.filter((x) => x !== m)) - spTax(theirs)
    return myTax(mine.filter((x) => x !== m)) - myTax(mine)
  })
  const okCount = mine.length + theirs.length
  return {
    rows, order, self, before, after, saving: before - after, contrib, okCount,
    basic: okCount * EXTRA.basic,
    extra: rows.reduce((a, r) => a + r.extra, 0) + self.amount,
    /** 연말정산 계산기(/year-end-tax)로 넘길 내 쪽 인원 (부녀자·한부모는 그쪽에 입력 칸이 없음) */
    mineInput: toInput(mine, order),
    couple: dual ? couple(me.salary, spouseSalary, members, rows, order) : null,
  }
}

// ── 페이지 예시 (page.tsx 본문·FAQ와 계산기 기본값, check 스크립트가 숫자 고정) ──
export const member = (rel: Relation, born: number, inc: Partial<Incomes> = {}, more: Partial<Member> = {}): Member =>
  ({ rel, born, disabled: false, apart: false, spouseClaims: false, inc: { ...NO_INCOME, ...inc }, ...more })
export const EXAMPLES = {
  /** 첫 화면: 총급여 5,000만, 국민연금 연 540만원 받는 아버지(1956년생, 경로우대 대상인데 연금 때문에 탈락) + 자녀 2명 */
  d: { me: { salary: 50_000_000, female: false, single: false } as Me, family: [member('parent', 1956, { publicPension: 5_400_000 }), member('child', 2015), member('child', 2019)] },
  /** 같은 가족, 아버지 연금이 상한(PENSION_LIMIT) 이하일 때 */
  pass: { me: { salary: 50_000_000, female: false, single: false } as Me, family: [member('parent', 1956, { publicPension: PENSION_LIMIT }), member('child', 2015), member('child', 2019)] },
  /** 올해 퇴직금 3,000만원을 받은 어머니(1960년생): 나이는 되지만 퇴직소득금액 때문에 탈락 */
  retired: member('parent', 1960, { retirement: 30_000_000 }),
  /** 맞벌이: 총급여 1억 + 배우자 6,000만, 75세 어머니를 지금은 배우자가 공제 */
  c: { salary: 100_000_000, spouseSalary: 60_000_000, family: [member('parent', 1951, {}, { spouseClaims: true })] },
}
