// 내용증명 작성기 회귀 체크: node scripts/check-certified-letter.ts
import {
  draftBody, draftTitle, closing, paragraphsOf, paginate, letterFee, leaseWindow, prescription, estimateLines,
  PURPOSES, FIELDS, ACTIONS, type Letter,
} from '../src/utils/certifiedLetter.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (c: boolean, msg: string) => eq(c, true, msg)

const base: Letter = {
  purpose: 'deposit', termKind: 'renewal', contractDate: '2024-09-24', baseDate: '2026-09-24', amount: 200_000_000,
  property: '서울시 마포구 월드컵로 1', item: '', account: '', hasIou: true, demand: '', deadline: '2026-10-15',
  actions: { leaseReg: true, paymentOrder: true, smallClaims: false, lawsuit: true, provisional: false, laborOffice: true, damages: true, interest: true },
  written: '2026-10-01',
}

// 초안: 만료 후 → 반환 요구, 만료 전 → 갱신 거절 + 반환
eq(draftTitle(base), '임대차보증금 반환 요구의 건', '보증금 만료 후 제목')
const body = draftBody(base)
ok(body.some((p) => p.includes('2026년 9월 24일 기간 만료로 종료되었으나')), '만료 후 문장')
ok(body.some((p) => p.includes('2026년 10월 15일까지') && p.includes('금 이억원정 (₩200,000,000)을')), '기한·금액 문장')
eq(body.at(-1), '만약 위 기한까지 이행하지 않으시면 부득이 임차권등기명령 신청, 지급명령 신청, 민사소송 제기 등 법적 절차를 진행할 수밖에 없으며, 지연손해금과 소송비용 등 일체를 귀하에게 청구할 것임을 알려드립니다.', '조치 문장')
const before = { ...base, written: '2026-06-01' }
eq(draftTitle(before), '임대차계약 갱신 거절 및 보증금 반환 요구의 건', '만료 전 제목')
ok(draftBody(before).some((p) => p.includes('갱신을 거절')), '만료 전 갱신 거절 문장')

// 조치 없음 / 목적에 없는 조치는 무시(대여금엔 임차권등기명령 없음)
const none = { ...base, actions: Object.fromEntries(Object.keys(base.actions).map((k) => [k, false])) as Letter['actions'] }
ok(closing(none).includes('법적 조치를 검토') && closing(none).includes('이로 인한 비용'), '조치 없음')
ok(!closing({ ...base, purpose: 'loan' }).includes('임차권등기명령'), '대여금엔 임차권등기명령 제외')

// 모든 목적: 초안이 빈칸 없이 생성되고 첫 줄 인사·마지막 줄 조치
for (const p of PURPOSES) {
  const v = { ...base, purpose: p }
  const b = draftBody(v)
  ok(b.length >= 3 && b[0] === '귀하의 건승을 기원합니다.' && b.at(-1)!.startsWith('만약 위 기한까지'), `초안 구조 ${p}`)
  ok(!b.some((s) => s.includes('undefined') || s.includes('NaN')), `초안 값 ${p}`)
  ok(ACTIONS[p].length > 0 && Array.isArray(FIELDS[p]), `설정 ${p}`)
}
// 요구 사항은 조치 문장 앞에 항목으로 들어감
const withDemand = draftBody({ ...base, demand: '1. 열쇠를 반환해 주세요.\n\n관리비 정산서도 보내 주세요.' })
eq(withDemand.slice(-3, -1), ['열쇠를 반환해 주세요.', '관리비 정산서도 보내 주세요.'], '요구 사항 항목')
eq(paragraphsOf(' 2) 가\n\n나 \n3.다'), ['가', '나', '다'], '번호 떼기')

// 쪽 나눔: 짧으면 1장, 길면 여러 장 + 모든 항목 포함
eq(paginate(draftBody(base)).length, 1, '기본 초안 1장')
const long = Array.from({ length: 30 }, () => '가'.repeat(120))
const pages = paginate(long)
ok(pages.length >= 3, `긴 본문 여러 장 (${pages.length})`)
eq(pages.flat(), long.map((_, i) => i), '항목 순서·누락 없음')
eq(estimateLines('가'.repeat(42)), 1, '42자 1줄')
eq(estimateLines('가'.repeat(43)), 2, '43자 2줄')
eq(estimateLines(''), 1, '빈 줄 1줄')

// 요금: 1장 500+2,400+1,300 = 4,200원(고시 요금예시와 동일), 장당 650원
eq(letterFee(1), 4_200, '1장 요금')
eq(letterFee(3), 5_500, '3장 요금')
eq(letterFee(5), 520 + 2_400 + 1_300 + 650 * 4, '5장 = 25g 초과 520원')

// 임대차 통지 기간: 만료 2026-12-31 → 6개월 전 06-30, 2개월 전 10-31
eq(leaseWindow('2026-10-01', '2026-12-31'), { status: 'ok', sixBefore: '2026-06-30', twoBefore: '2026-10-31', daysLeft: 91 }, '기간 안')
eq(leaseWindow('2026-11-15', '2026-12-31').status, 'late', '2개월 전 지남')
eq(leaseWindow('2026-05-01', '2026-12-31').status, 'early', '6개월 전보다 이름')
eq(leaseWindow('2027-01-02', '2026-12-31').status, 'expired', '만료 후')
eq(leaseWindow('2026-10-31', '2026-12-31').status, 'ok', '2개월 전 당일은 기간 안')

// 소멸시효
eq(prescription('payment', '2023-10-10', '2026-10-01'), { years: 3, expire: '2026-10-10', status: 'soon' }, '물품대금 3년 임박')
eq(prescription('wage', '2023-09-01', '2026-10-01')?.status, 'past', '임금 3년 지남')
eq(prescription('loan', '2025-01-01', '2026-10-01')?.status, 'ok', '대여금 10년 여유')
eq(prescription('deposit', '2020-01-01', '2026-10-01'), null, '보증금은 검사 안 함')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-certified-letter: all ok')
