// 주택 임대차계약서 작성기 순수 로직: 법무부·국토부 주택임대차표준계약서(2023.10.6. 개정) 조항 문안,
// 특약 추천 문구, 검사(금액 합계·기간·5% 상한·전월세 신고), A4 쪽 나눔.
// 검증: node scripts/check-lease-contract.ts
import { estimateLines } from './certifiedLetter.ts'
import { addDays, addYears } from './dday.ts'

export type Kind = 'jeonse' | 'monthly'
export type ContractType = 'new' | 'agreed' | 'renew' // 신규 / 합의 재계약 / 갱신요구권 행사 갱신

/** 전월세 신고 대상 금액 (부동산 거래신고 등에 관한 법률 시행령 제4조의3): 둘 중 하나라도 초과 */
export const REPORT_DEPOSIT = 60_000_000
export const REPORT_RENT = 300_000
/** 차임·보증금 증액 상한 (주택임대차보호법 제7조 제2항) */
export const RENEW_CAP = 0.05
/** 정액관리비 월 10만원 이상이면 비목별 금액 기재 (표준계약서 2023.10.6. 개정) */
export const MGMT_DETAIL_MIN = 100_000

export const MGMT_ITEMS = ['general', 'electric', 'water', 'gas', 'heating', 'internet', 'tv', 'other'] as const
export type MgmtItem = (typeof MGMT_ITEMS)[number]
export const MGMT_LABEL: Record<MgmtItem, string> = {
  general: '일반관리비', electric: '전기료', water: '수도료', gas: '가스사용료',
  heating: '난방비', internet: '인터넷사용료', tv: 'TV사용료', other: '기타관리비',
}

// ── 특약 추천 문구 (체크하면 특약란에 한 줄씩 들어감, 사용자가 고칠 수 있음) ─────────

export const SPECIAL_KEYS = ['rights', 'ownerAccount', 'tax', 'prior', 'loan', 'insurance', 'returnDeposit', 'settle', 'restore', 'pet', 'earlyExit'] as const
export type SpecialKey = (typeof SPECIAL_KEYS)[number]

export const SPECIALS: Record<SpecialKey, string> = {
  rights: '임대인은 잔금 지급일 다음 날까지 등기사항증명서상 권리관계를 계약 체결 당시 상태로 유지하며, 근저당권·전세권 등의 설정이나 소유권 이전을 하지 아니한다. 이를 위반한 경우 임차인은 계약을 해제할 수 있고, 임대인은 받은 금액 전부를 즉시 반환하며 계약금과 같은 금액을 손해배상금으로 지급한다.',
  ownerAccount: '계약금·중도금·잔금은 등기사항증명서상 소유자인 임대인 명의의 계좌로만 지급한다.',
  tax: '임대인은 계약 체결일 현재 미납·체납한 국세 및 지방세가 없음을 고지한다. 이와 다른 사실이 확인되면 임차인은 계약을 해제할 수 있고, 임대인은 받은 금액 전부를 즉시 반환한다.',
  prior: '임대인이 계약 체결 시 고지한 선순위 확정일자 부여 현황 및 다른 임차인의 보증금 정보가 사실과 다른 경우 임차인은 계약을 해제할 수 있고, 임대인은 받은 금액 전부를 즉시 반환한다.',
  loan: '임차인이 전세자금대출을 신청하였으나 임차인의 신용 등 개인 사유가 아닌 주택 또는 임대인의 사유로 대출이 승인되지 아니한 경우 이 계약은 없던 것으로 하며, 임대인은 받은 계약금 전액을 즉시 반환한다.',
  insurance: '임대인은 임차인의 전세보증금반환보증(주택도시보증공사·한국주택금융공사·서울보증보험) 가입에 필요한 서류 제공 등에 협조한다. 임대인 또는 주택의 사유로 가입이 거절된 경우 임차인은 계약을 해제할 수 있고, 임대인은 받은 금액 전부를 즉시 반환한다.',
  returnDeposit: '임대인은 임대차가 끝나는 날 새 임차인의 입주 여부와 관계없이 보증금을 반환한다.',
  settle: '잔금 지급일 전날까지의 관리비·공과금은 임대인이 정산하고, 임차인이 납부한 장기수선충당금은 계약 종료 시 임대인이 반환한다.',
  restore: '원상복구는 입주 당시 상태(입주일에 함께 촬영한 사진 기준)를 기준으로 하며, 통상의 사용에 따른 마모·노후화와 못 자국 등 경미한 손상은 원상복구 대상에서 제외한다.',
  pet: '임차인은 반려동물을 기를 수 있으며, 반려동물로 인한 파손·오염은 계약 종료 시 임차인이 원상복구한다.',
  earlyExit: '임차인이 임대차기간 중 계약 해지를 원하는 경우 새 임차인이 입주하는 날 보증금을 반환받으며, 이때 새 임대차계약의 중개보수는 임차인이 부담한다.',
}

export const DEFAULT_SPECIALS: SpecialKey[] = ['rights', 'ownerAccount', 'tax', 'loan', 'insurance']

/** 특약 텍스트 → 줄 목록 (빈 줄 제거, 앞의 '1.' 번호 떼기) */
export function specialLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim().replace(/^\d+\s*[.)]\s*/, ''))
    .filter(Boolean)
}

export const hasSpecial = (text: string, k: SpecialKey) => specialLines(text).includes(SPECIALS[k])

/** 체크 → 맨 끝에 한 줄 추가 / 해제 → 그 줄만 삭제 (사용자가 고친 줄은 건드리지 않음) */
export function toggleSpecial(text: string, k: SpecialKey, on: boolean): string {
  const lines = specialLines(text)
  const has = lines.includes(SPECIALS[k])
  if (on && !has) return [...lines, SPECIALS[k]].join('\n')
  if (!on && has) return lines.filter((l) => l !== SPECIALS[k]).join('\n')
  return text
}

// ── 검사 ───────────────────────────────────────────────────────────────────

/** 2년 임대차의 만료일: 인도일 + 2년의 전날. 해당일이 없으면(2/29 시작) 그 달 말일 (민법 제160조) */
export function twoYearEnd(start: string): string {
  const t = addYears(start, 2)
  return t.slice(8) === start.slice(8) ? addDays(t, -1) : t
}

/** 2년 미만 계약인가 (주택임대차보호법 제4조 제1항: 임차인은 2년 주장 가능) */
export const isShortTerm = (start: string, end: string) => !!start && !!end && end < twoYearEnd(start)

/** 계약금+중도금+잔금 − 보증금 (0이면 맞음) */
export const payGap = (deposit: number, down: number, middle: number, balance: number) => down + middle + balance - deposit

/** 증액률 (0.05 = 5%). 종전 값이 없으면 0 */
export const increaseRate = (prev: number, next: number) => (prev > 0 ? (next - prev) / prev : 0)

/** 갱신계약 증액 5% 상한 초과 여부 (보증금·차임 각각) */
export function overRenewCap(prevDeposit: number, deposit: number, prevRent: number, rent: number) {
  const eps = 1e-9
  return {
    deposit: increaseRate(prevDeposit, deposit) > RENEW_CAP + eps,
    rent: increaseRate(prevRent, rent) > RENEW_CAP + eps,
    maxDeposit: Math.floor(prevDeposit * (1 + RENEW_CAP)),
    maxRent: Math.floor(prevRent * (1 + RENEW_CAP)),
  }
}

const METRO = /^(서울|경기|인천|부산|대구|광주|대전|울산|세종)/

/**
 * 전월세 신고 대상 지역인가 (시행령 제4조의3): 특별자치시·특별자치도·시·구, 군은 광역시·경기도 관할만.
 * = 수도권 전역·광역시·세종·제주·도의 시 (도의 군 제외).
 * ponytail: 주소 문자열 추정 — 확실할 때만 true/false, 모르면 null (강원·전북특별자치도의 군은 해석 불명확 → null)
 */
export function reportRegion(address: string): boolean | null {
  const a = address.trim()
  if (!a) return null
  if (METRO.test(a) || /^제주/.test(a)) return true
  if (/^(강원|충청|충북|충남|전라|전북|전남|경상|경북|경남)/.test(a)) {
    const second = a.split(/\s+/)[1] ?? ''
    if (/시$/.test(second)) return true
    if (/군$/.test(second)) return /^(강원|전북|전라북)/.test(a) ? null : false
  }
  return null
}

/** 금액 기준 신고 대상인가 (갱신 시 금액 변동 없으면 제외) */
export function reportByAmount(deposit: number, rent: number, type: ContractType, prevDeposit: number, prevRent: number): boolean {
  if (type !== 'new' && deposit === prevDeposit && rent === prevRent) return false
  return deposit > REPORT_DEPOSIT || rent > REPORT_RENT
}

export const mgmtSum = (items: Partial<Record<MgmtItem, number>>) => MGMT_ITEMS.reduce((s, k) => s + (items[k] || 0), 0)

// ── 조항 문안 (제4조~) ─────────────────────────────────────────────────────

export interface Clause {
  title: string
  body: string // '\n'으로 항 구분
}

export function laterClauses(brokered: boolean): Clause[] {
  const list: Clause[] = [
    {
      title: '임차주택의 사용·관리·수선',
      body: [
        '① 임차인은 임대인의 동의 없이 임차주택의 구조변경 및 전대나 임차권 양도를 할 수 없으며, 임대차 목적인 주거 이외의 용도로 사용할 수 없다.',
        '② 임대인은 계약 존속 중 임차주택을 사용·수익에 필요한 상태로 유지하여야 하고, 임차인은 임대인이 임차주택의 보존에 필요한 행위를 하는 때 이를 거절하지 못한다.',
        '③ 계약 존속 중 발생하는 수선비용은 다음과 같이 부담하며, 합의되지 아니한 수선비용은 민법·판례 기타 관습에 따른다. 임대인 부담: 난방·상하수도·전기시설 등 주요 설비의 노후·불량으로 인한 수선(민법 제623조). 임차인 부담: 임차인의 고의·과실에 의한 파손, 전구 등 통상의 간단한 수선과 소모품 교체.',
        '④ 임차인이 임대인의 부담에 속하는 수선비용을 지출한 때에는 임대인에게 그 상환을 청구할 수 있다.',
      ].join('\n'),
    },
    {
      title: '계약의 해제',
      body: '임차인이 임대인에게 중도금(중도금이 없을 때는 잔금)을 지급하기 전까지, 임대인은 계약금의 배액을 상환하고, 임차인은 계약금을 포기하고 이 계약을 해제할 수 있다.',
    },
    {
      title: '채무불이행과 손해배상',
      body: '당사자 일방이 채무를 이행하지 아니하는 때에는 상대방은 상당한 기간을 정하여 그 이행을 최고하고 계약을 해제할 수 있으며, 그로 인한 손해배상을 청구할 수 있다. 다만, 채무자가 미리 이행하지 아니할 의사를 표시한 경우의 계약해제는 최고를 요하지 아니한다.',
    },
    {
      title: '계약의 해지',
      body: [
        '① 임차인은 본인의 과실 없이 임차주택의 일부가 멸실 기타 사유로 인하여 임대차의 목적대로 사용할 수 없는 경우에는 계약을 해지할 수 있다.',
        '② 임대인은 임차인이 2기의 차임액에 달하도록 연체하거나, 제4조 제1항을 위반한 경우 계약을 해지할 수 있다.',
      ].join('\n'),
    },
    {
      title: '계약의 갱신',
      body: [
        '① 임차인은 임대차기간이 끝나기 6개월 전부터 2개월 전까지 사이에 계약갱신을 요구할 수 있다. 다만, 임대인은 자신 또는 그 직계존속·직계비속의 실거주 등 주택임대차보호법 제6조의3 제1항 각 호의 사유가 있는 경우에 한하여 계약갱신의 요구를 거절할 수 있다.',
        '② 임대인이 실거주를 사유로 갱신을 거절하였음에도 갱신요구가 거절되지 아니하였더라면 갱신되었을 기간이 만료되기 전에 정당한 사유 없이 제3자에게 임차주택을 임대한 경우, 임대인은 갱신거절로 인하여 임차인이 입은 손해를 주택임대차보호법 제6조의3 제6항에 따라 배상하여야 한다.',
      ].join('\n'),
    },
    {
      title: '계약의 종료',
      body: '임대차계약이 종료된 경우에 임차인은 임차주택을 원래의 상태로 복구하여 임대인에게 반환하고, 이와 동시에 임대인은 보증금을 임차인에게 반환하여야 한다. 다만, 시설물의 노후화나 통상 생길 수 있는 파손 등은 임차인의 원상복구의무에 포함되지 아니한다.',
    },
    {
      title: '비용의 정산',
      body: [
        '① 임차인은 계약종료 시 공과금과 관리비를 정산하여야 한다.',
        '② 임차인은 이미 납부한 관리비 중 장기수선충당금을 소유자에게 반환 청구할 수 있다. 다만, 관리사무소 등 관리주체가 장기수선충당금을 정산하는 경우에는 그 관리주체에게 청구할 수 있다.',
      ].join('\n'),
    },
  ]
  if (brokered) {
    list.push(
      {
        title: '중개보수 등',
        body: '중개보수는 법령이 정한 한도에서 임대인과 임차인이 각각 부담한다. 다만, 개업공인중개사의 고의 또는 과실로 인하여 중개의뢰인 간의 거래행위가 무효·취소 또는 해제된 경우에는 그러하지 아니하다.',
      },
      {
        title: '중개대상물확인·설명서 교부',
        body: '개업공인중개사는 중개대상물 확인·설명서를 작성하고 업무보증관계증서(공제증서 등) 사본을 첨부하여 임대인과 임차인에게 각각 교부한다.',
      },
    )
  }
  return list
}

/** 표준계약서에 인쇄된 특약 (선택 값 반영) */
export function standardSpecials(o: { moveInBy: string; mediation: boolean; demolish: boolean; demolishNote: string; addressConsent: boolean }, date: (s: string) => string): string[] {
  const box = (on: boolean) => (on ? '■' : '□')
  return [
    `주택을 인도받은 임차인은 ${date(o.moveInBy)}까지 주민등록(전입신고)과 주택임대차계약서상 확정일자를 받기로 하고, 임대인은 위 약정일자의 다음 날까지 임차주택에 저당권 등 담보권을 설정하지 아니한다. 임대인이 이를 위반한 경우 임차인은 임대차계약을 해제 또는 해지할 수 있으며, 임대인은 그로 인한 손해를 배상하여야 한다.`,
    '임차인은 임대차기간이 시작하는 날까지, 임대인이 계약 체결 시 고지하지 아니한 선순위 임대차 정보(주택임대차보호법 제3조의7)나 미납·체납한 국세·지방세가 있는 것을 확인한 경우 손해배상 청구 없이 이 계약을 해제할 수 있다.',
    `주택임대차계약과 관련하여 분쟁이 있는 경우 임대인 또는 임차인은 법원에 소를 제기하기 전에 먼저 주택임대차분쟁조정위원회에 조정을 신청한다. (${box(o.mediation)} 동의 ${box(!o.mediation)} 미동의)`,
    `주택의 철거 또는 재축 계획 (${box(!o.demolish)} 없음 ${box(o.demolish)} 있음${o.demolish && o.demolishNote.trim() ? `: ${o.demolishNote.trim()}` : ''})`,
    `상세주소가 없는 경우 임차인의 상세주소부여 신청에 대한 소유자 동의 여부 (${box(o.addressConsent)} 동의 ${box(!o.addressConsent)} 미동의)`,
  ]
}

// ── A4 쪽 나눔 (용지 글꼴 12.5px·줄 높이 1.6 → 20px, 본문 폭 674px ≈ 한글 52자) ─────
// ponytail: 글자 폭 추정치(certifiedLetter.estimateLines). 여유를 둬서 실제 렌더가 A4를 넘지 않게 함

export const LINE = 20
export const COLS = 50
export const BODY_PX = 1123 - 112 - 40 // 위아래 여백 56px, 쪽 번호 자리

/** 문단('\n'으로 줄 구분) 높이 */
export const textPx = (s: string, cols = COLS) => s.split('\n').reduce((h, l) => h + estimateLines(l, cols) * LINE, 0)

/** 블록 높이 목록을 쪽별로 나눔. firstPx = 1쪽 머리 높이, 마지막 장에는 tailPx(서명란)가 들어가도록 보장 */
export function paginate(heights: number[], tailPx: number, bodyPx = BODY_PX, firstPx = 0): number[][] {
  const pages: number[][] = [[]]
  let used = firstPx
  heights.forEach((h, i) => {
    if (used + h > bodyPx && (pages[pages.length - 1].length || used > 0)) {
      pages.push([])
      used = 0
    }
    pages[pages.length - 1].push(i)
    used += h
  })
  if (used + tailPx > bodyPx) pages.push([])
  return pages
}
