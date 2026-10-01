// 내용증명 작성기 순수 로직: 목적별 초안 문안, A4 쪽 나눔 추정, 우편 요금, 임대차 통지 기간·소멸시효 검사.
// 검증: node scripts/check-certified-letter.ts
import { krDate, amountText } from './document.ts'
import { addMonths, addYears, daysBetween } from './dday.ts'

export type Purpose = 'deposit' | 'terminate' | 'payment' | 'loan' | 'wage' | 'defect' | 'custom'
export const PURPOSES: Purpose[] = ['deposit', 'terminate', 'payment', 'loan', 'wage', 'defect', 'custom']

export type ActionKey = 'leaseReg' | 'paymentOrder' | 'smallClaims' | 'lawsuit' | 'provisional' | 'laborOffice' | 'damages' | 'interest'
export type FieldKey = 'contractDate' | 'baseDate' | 'amount' | 'property' | 'item' | 'account'

/** 목적별 입력 칸 (라벨은 i18n fields.<purpose>.<key>) */
export const FIELDS: Record<Purpose, FieldKey[]> = {
  deposit: ['contractDate', 'baseDate', 'amount', 'property', 'account'],
  terminate: ['contractDate', 'baseDate', 'property', 'item'],
  payment: ['contractDate', 'baseDate', 'amount', 'item', 'account'],
  loan: ['contractDate', 'baseDate', 'amount', 'account'],
  wage: ['contractDate', 'baseDate', 'amount', 'item', 'account'],
  defect: ['contractDate', 'property', 'item', 'amount'],
  custom: [],
}

/** 목적별로 고를 수 있는 불이행 시 조치 */
export const ACTIONS: Record<Purpose, ActionKey[]> = {
  deposit: ['leaseReg', 'paymentOrder', 'lawsuit', 'interest'],
  terminate: ['lawsuit', 'damages'],
  payment: ['paymentOrder', 'smallClaims', 'provisional', 'lawsuit', 'interest'],
  loan: ['paymentOrder', 'smallClaims', 'provisional', 'lawsuit', 'interest'],
  wage: ['laborOffice', 'paymentOrder', 'lawsuit', 'interest'],
  defect: ['damages', 'lawsuit'],
  custom: ['paymentOrder', 'lawsuit', 'damages'],
}

const ACTION_TEXT: Record<Exclude<ActionKey, 'interest'>, string> = {
  leaseReg: '임차권등기명령 신청',
  paymentOrder: '지급명령 신청',
  smallClaims: '소액사건심판 청구',
  provisional: '재산 가압류 신청',
  lawsuit: '민사소송 제기',
  laborOffice: '관할 지방고용노동청 진정',
  damages: '손해배상 청구',
}

export const SMALL_CLAIMS_MAX = 30_000_000 // 소액사건심판규칙 제1조의2

export interface Letter {
  purpose: Purpose
  termKind: 'renewal' | 'contract'
  contractDate: string
  baseDate: string
  amount: number
  property: string
  item: string
  account: string
  hasIou: boolean
  demand: string
  deadline: string
  actions: Record<ActionKey, boolean>
  written: string
}

const b = (s: string, fill = '○○○') => s.trim() || fill
const won = (v: Letter) => amountText(v.amount)

/** 목적 + 날짜로 정해지는 초안 제목 */
export function draftTitle(v: Letter): string {
  switch (v.purpose) {
    case 'deposit':
      return beforeEnd(v) ? '임대차계약 갱신 거절 및 보증금 반환 요구의 건' : '임대차보증금 반환 요구의 건'
    case 'terminate':
      return v.termKind === 'renewal' ? '임대차계약 갱신 거절 통지의 건' : '계약 해지 통지의 건'
    case 'payment':
      return '미지급 대금 지급 요구의 건'
    case 'loan':
      return '대여금 반환 요구의 건'
    case 'wage':
      return '체불임금 지급 요구의 건'
    case 'defect':
      return '하자 보수 요구의 건'
    default:
      return '요청 사항 통지의 건'
  }
}

const beforeEnd = (v: Letter) => !!v.baseDate && !!v.written && v.written < v.baseDate

/** 선택한 조치 → 마지막 항목 문장 */
export function closing(v: Letter): string {
  const keys = ACTIONS[v.purpose].filter((k) => v.actions[k])
  const steps = keys.filter((k): k is Exclude<ActionKey, 'interest'> => k !== 'interest').map((k) => ACTION_TEXT[k])
  const cost = keys.includes('interest') ? '지연손해금과 소송비용 등' : '이로 인한 비용'
  if (!steps.length) return `만약 위 기한까지 이행하지 않으시면 부득이 법적 조치를 검토할 수밖에 없으며, ${cost} 일체를 귀하에게 청구할 것임을 알려드립니다.`
  return `만약 위 기한까지 이행하지 않으시면 부득이 ${steps.join(', ')} 등 법적 절차를 진행할 수밖에 없으며, ${cost} 일체를 귀하에게 청구할 것임을 알려드립니다.`
}

const accountLine = (v: Letter) => (v.account.trim() ? ` (입금 계좌: ${v.account.trim()})` : '')

/** 번호 매길 본문 항목들 (한 항목 = 한 줄) */
export function draftBody(v: Letter): string[] {
  const C = krDate(v.contractDate)
  const B = krDate(v.baseDate)
  const D = krDate(v.deadline)
  const out = ['귀하의 건승을 기원합니다.']
  switch (v.purpose) {
    case 'deposit':
      out.push(`발신인(임차인)은 ${C} 귀하(임대인)와 ${b(v.property, '○○시 ○○구 ○○로 ○○')} 주택에 관하여 임대차보증금 ${won(v)}, 계약 만료일 ${B}로 하는 임대차계약을 체결하고, 보증금을 모두 지급한 뒤 거주하여 왔습니다.`)
      if (beforeEnd(v)) {
        out.push(`발신인은 위 임대차계약을 갱신할 의사가 없으므로, 주택임대차보호법 제6조에 따라 이 통지로써 계약 갱신을 거절하며, 위 계약은 ${B} 기간 만료로 종료됨을 알려드립니다.`)
        out.push(`따라서 귀하는 계약 만료에 따른 주택 인도와 동시에 ${D}까지 위 보증금 ${won(v)}을 발신인에게 반환하여 주시기 바랍니다.${accountLine(v)}`)
      } else {
        out.push(`위 임대차계약은 ${B} 기간 만료로 종료되었으나, 귀하는 현재까지 보증금을 반환하지 않고 있습니다.`)
        out.push(`따라서 귀하는 ${D}까지 위 보증금 ${won(v)}을 발신인에게 반환하여 주시기 바랍니다.${accountLine(v)}`)
      }
      break
    case 'terminate':
      if (v.termKind === 'renewal') {
        out.push(`발신인과 귀하는 ${C} ${b(v.property, '○○시 ○○구 ○○로 ○○')} 주택에 관하여 계약 만료일을 ${B}로 하는 임대차계약을 체결하였습니다.`)
        out.push(`발신인은 위 계약을 갱신할 의사가 없으므로, 주택임대차보호법 제6조에 따라 이 통지로써 계약 갱신을 거절하며, 위 계약은 ${B} 기간 만료로 종료됨을 알려드립니다.`)
        out.push(`계약 종료에 따른 주택 인도와 보증금 반환 등 정산 절차를 ${D}까지 협의하여 주시기 바랍니다.`)
      } else {
        out.push(`발신인과 귀하는 ${C} ${b(v.property, '○○')}에 관한 계약을 체결하였습니다.`)
        out.push(`그러나 ${b(v.item, '귀하가 약정한 의무를 이행하지 않았으므로')}, 발신인은 이 통지로써 위 계약을 해지하며, 위 계약은 ${B} 자로 종료됨을 알려드립니다.`)
        out.push(`따라서 귀하는 ${D}까지 계약 해지에 따른 원상회복과 정산에 응하여 주시기 바랍니다.`)
      }
      break
    case 'payment':
      out.push(`발신인은 귀하와의 거래에 따라 ${C} 귀하에게 ${b(v.item, '○○ 물품')}을(를) 공급하였고, 그 대금 ${won(v)}은 ${B}까지 지급받기로 하였습니다.`)
      out.push('그러나 귀하는 지급기일이 지난 현재까지 위 대금을 지급하지 않고 있습니다.')
      out.push(`따라서 귀하는 ${D}까지 위 대금 ${won(v)}을 발신인에게 지급하여 주시기 바랍니다.${accountLine(v)}`)
      break
    case 'loan':
      out.push(`발신인은 ${C} 귀하에게 ${won(v)}을 변제기일 ${B}로 정하여 빌려주었습니다.${v.hasIou ? ' 귀하는 이를 확인하는 차용증을 작성하여 발신인에게 교부하였습니다.' : ''}`)
      out.push('그러나 귀하는 변제기일이 지난 현재까지 위 돈을 갚지 않고 있습니다.')
      out.push(`따라서 귀하는 ${D}까지 위 대여금 ${won(v)}을 발신인에게 반환하여 주시기 바랍니다.${accountLine(v)}`)
      break
    case 'wage':
      out.push(`발신인은 ${C}부터 ${B}까지 귀하의 사업장에서 근로하였습니다.`)
      out.push(`그런데 귀하는 발신인에게 ${b(v.item, '임금')} 합계 ${won(v)}을 현재까지 지급하지 않고 있습니다. 근로기준법 제36조에 따라 사용자는 근로자가 퇴직한 경우 지급 사유가 발생한 날부터 14일 이내에 임금 등 일체의 금품을 지급하여야 합니다.`)
      out.push(`따라서 귀하는 ${D}까지 위 금액 ${won(v)}을 발신인에게 지급하여 주시기 바랍니다.${accountLine(v)}`)
      break
    case 'defect':
      out.push(`발신인과 귀하는 ${C} ${b(v.property, '○○')}에 관한 계약을 체결하였습니다.`)
      out.push(`그런데 위 목적물에 ${b(v.item, '○○ 하자')}이(가) 발생하였습니다.`)
      out.push(`따라서 귀하는 ${D}까지 위 하자를 보수하여 주시기 바랍니다.${v.amount > 0 ? ` 기한까지 보수하지 않으시면 발신인이 직접 보수하고 그 비용(견적 ${won(v)})을 청구하겠습니다.` : ''}`)
      break
    default:
      out.push('발신인은 귀하에게 다음과 같이 통지합니다.')
      if (!v.demand.trim()) out.push('(요구 사항을 적어 주세요.)')
  }
  if (v.demand.trim()) out.push(...paragraphsOf(v.demand))
  if (v.purpose === 'custom') out.push(`위 사항에 대하여 ${D}까지 이행하거나 회신하여 주시기 바랍니다.`)
  out.push(closing(v))
  return out
}

/** 본문 문자열 → 항목 배열 (빈 줄 무시, 앞에 붙인 '1.' 같은 번호는 떼어 냄) */
export function paragraphsOf(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim().replace(/^\d+\s*[.)]\s*/, ''))
    .filter(Boolean)
}

// ── A4 쪽 나눔 (Page 폭 794px − 좌우 여백 160px, 14px, 줄 높이 25.9px) ─────────
// ponytail: 글자 폭 추정치(한글 1, 그 외 0.55). 실제 렌더 폭과 조금 어긋나도 여유를 둬서 넘치지 않게 함

export const LINE_PX = 26
const BODY_PX = 1123 - 152 - 40 // 위아래 여백, 쪽 번호 자리
const COLS = 42 // 번호 들여쓰기 뺀 한 줄 글자 수(한글 기준)

const charW = (ch: string) => (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(ch) ? 1 : 0.55)

export function estimateLines(text: string, cols = COLS): number {
  let w = 0
  for (const ch of text) w += charW(ch)
  return Math.max(1, Math.ceil(w / cols))
}

const paraPx = (p: string) => estimateLines(p) * LINE_PX + 8
/** 첫 장 머리(제목·당사자 표·제목줄)와 마지막 장 꼬리(날짜·서명) 높이 */
export const HEAD_PX = 95 + 290 + 70
export const TAIL_PX = 150

/** 항목을 쪽별로 나눔 → [[0,1,2],[3,4]]. 꼬리(날짜·서명)는 마지막 장에 들어가도록 보장 */
export function paginate(paras: string[], headPx = HEAD_PX, tailPx = TAIL_PX): number[][] {
  const pages: number[][] = [[]]
  let used = headPx
  paras.forEach((p, i) => {
    const h = paraPx(p)
    if (used + h > BODY_PX && pages[pages.length - 1].length) {
      pages.push([])
      used = 0
    }
    pages[pages.length - 1].push(i)
    used += h
  })
  if (used + tailPx > BODY_PX) pages.push([]) // 서명만 다음 장으로
  return pages
}

// ── 우편 요금 (우정사업본부 고시: 통상우편 2026-07-01, 특수취급 2026-05-11 시행) ──
export const FEE = { postage: 500, postageHeavy: 520, registered: 2400, certFirst: 1300, certExtra: 650, deliveryProof: 1600 }

/** 내용증명 1통 요금(배달증명 제외). A4 1장 ≈ 5g + 봉투 → 4장까지 25g 이하 규격 500원으로 봄 */
export function letterFee(pages: number): number {
  const n = Math.max(1, pages)
  return (n <= 4 ? FEE.postage : FEE.postageHeavy) + FEE.registered + FEE.certFirst + FEE.certExtra * (n - 1)
}

// ── 검사 ────────────────────────────────────────────────────────────────────

export type LeaseStatus = 'expired' | 'late' | 'early' | 'ok'

/** 주택임대차보호법 제6조: 임대인 만료 6개월~2개월 전, 임차인 2개월 전까지 갱신 거절 통지 */
export function leaseWindow(written: string, end: string): { status: LeaseStatus; sixBefore: string; twoBefore: string; daysLeft: number } {
  const sixBefore = addMonths(end, -6)
  const twoBefore = addMonths(end, -2)
  const status: LeaseStatus = written >= end ? 'expired' : written > twoBefore ? 'late' : written < sixBefore ? 'early' : 'ok'
  return { status, sixBefore, twoBefore, daysLeft: daysBetween(written, end) }
}

/** 소멸시효: 물품대금 3년(민법 제163조), 임금 3년(근로기준법 제49조), 대여금 10년(민법 제162조) */
export const PRESCRIPTION_YEARS: Partial<Record<Purpose, number>> = { payment: 3, wage: 3, loan: 10 }

export function prescription(purpose: Purpose, base: string, written: string): { years: number; expire: string; status: 'past' | 'soon' | 'ok' } | null {
  const years = PRESCRIPTION_YEARS[purpose]
  if (!years || !base || !written) return null
  const expire = addYears(base, years)
  const status = written >= expire ? 'past' : daysBetween(written, expire) <= 183 ? 'soon' : 'ok'
  return { years, expire, status }
}
