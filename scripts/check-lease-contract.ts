// 임대차계약서 작성기 회귀 체크: node scripts/check-lease-contract.ts
import {
  SPECIALS, SPECIAL_KEYS, DEFAULT_SPECIALS, specialLines, hasSpecial, toggleSpecial, twoYearEnd, isShortTerm, payGap,
  overRenewCap, reportRegion, reportByAmount, mgmtSum, laterClauses, standardSpecials, textPx, paginate, BODY_PX, LINE,
} from '../src/utils/leaseContract.ts'
import { krDate } from '../src/utils/document.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (c: boolean, msg: string) => eq(c, true, msg)

// 특약 체크리스트: 추가·삭제·사용자 수정 보존
const base = DEFAULT_SPECIALS.map((k) => SPECIALS[k]).join('\n')
ok(DEFAULT_SPECIALS.every((k) => hasSpecial(base, k)), '기본 특약 체크됨')
ok(!hasSpecial(base, 'pet'), '반려동물 기본 해제')
const withPet = toggleSpecial(base, 'pet', true)
eq(specialLines(withPet).at(-1), SPECIALS.pet, '체크 → 맨 끝 추가')
eq(toggleSpecial(withPet, 'pet', true), withPet, '중복 추가 안 함')
eq(toggleSpecial(withPet, 'pet', false), base, '해제 → 그 줄만 삭제')
const edited = '도배는 임대인이 새로 한다.\n' + SPECIALS.tax
eq(toggleSpecial(edited, 'tax', false), '도배는 임대인이 새로 한다.', '사용자 줄 유지')
eq(specialLines('1. 가\n\n 2) 나 \n'), ['가', '나'], '번호·빈 줄 제거')
eq(SPECIAL_KEYS.length, new Set(SPECIAL_KEYS.map((k) => SPECIALS[k])).size, '특약 문구 중복 없음')
ok(SPECIAL_KEYS.every((k) => !SPECIALS[k].includes('\n')), '특약 문구 한 줄')

// 기간: 인도일 + 2년 − 1일, 2년 미만 판정
eq(twoYearEnd('2026-11-01'), '2028-10-31', '2년 만료일')
eq(twoYearEnd('2028-02-29'), '2030-02-28', '윤일 시작 → 말일')
eq(twoYearEnd('2026-03-01'), '2028-02-29', '3/1 시작 → 윤년 2/29')
ok(!isShortTerm('2026-11-01', '2028-10-31'), '정확히 2년은 정상')
ok(isShortTerm('2026-11-01', '2027-10-31'), '1년 계약은 단기')
ok(!isShortTerm('', '2027-10-31'), '빈 날짜')

// 금액 합계
eq(payGap(200_000_000, 20_000_000, 0, 180_000_000), 0, '합계 일치')
eq(payGap(200_000_000, 20_000_000, 50_000_000, 180_000_000), 50_000_000, '합계 초과')
eq(payGap(200_000_000, 20_000_000, 0, 170_000_000), -10_000_000, '합계 부족')

// 갱신 5% 상한
const c = overRenewCap(200_000_000, 210_000_000, 500_000, 530_000)
eq([c.deposit, c.rent, c.maxDeposit, c.maxRent], [false, true, 210_000_000, 525_000], '5% 경계')
eq(overRenewCap(0, 100, 0, 100).deposit, false, '종전 값 없음')

// 전월세 신고: 6천만원 초과 또는 30만원 초과
ok(reportByAmount(60_000_001, 0, 'new', 0, 0), '보증금 초과')
ok(!reportByAmount(60_000_000, 300_000, 'new', 0, 0), '경계값은 제외')
ok(reportByAmount(10_000_000, 300_001, 'new', 0, 0), '월세 초과')
ok(!reportByAmount(200_000_000, 0, 'renew', 200_000_000, 0), '금액 변동 없는 갱신은 제외')
ok(reportByAmount(200_000_000, 0, 'renew', 190_000_000, 0), '증액 갱신은 대상')
eq(reportRegion('서울특별시 마포구 월드컵로 1'), true, '서울')
eq(reportRegion('경기도 가평군 가평읍'), true, '경기 군 포함')
eq(reportRegion('부산광역시 기장군'), true, '광역시 군 포함')
eq(reportRegion('충청남도 천안시 동남구'), true, '도의 시')
eq(reportRegion('경상북도 울릉군 울릉읍'), false, '도의 군 제외')
eq(reportRegion('강원특별자치도 양양군'), null, '강원 군은 불명확')
eq(reportRegion('제주특별자치도 서귀포시'), true, '제주')
eq(reportRegion(''), null, '주소 없음')

eq(mgmtSum({ general: 50_000, water: 20_000 }), 70_000, '관리비 합계')

// 조항: 직거래 7개(제4~10조), 중개 9개(제11·12조)
eq(laterClauses(false).length, 7, '직거래 조항 수')
eq(laterClauses(true).length, 9, '중개 조항 수')
const std = standardSpecials({ moveInBy: '2026-11-01', mediation: true, demolish: true, demolishNote: '2030년 재건축', addressConsent: false }, krDate)
ok(std[0].includes('2026년 11월 1일까지 주민등록'), '전입·확정일자 약정일')
ok(std[2].includes('■ 동의 □ 미동의'), '분쟁조정 동의')
ok(std[3].endsWith('■ 있음: 2030년 재건축)'), '재축 계획')
ok(std[4].includes('□ 동의 ■ 미동의'), '상세주소 미동의')

// 쪽 나눔: 짧으면 한 장에 서명까지, 길면 여러 장 + 순서 보존, 서명 꼬리 보장
eq(textPx('가'.repeat(50)), LINE, '50자 한 줄')
eq(textPx('가'.repeat(51)), 2 * LINE, '51자 두 줄')
eq(textPx('가\n나'), 2 * LINE, '줄바꿈')
eq(paginate([100, 100], 300), [[0, 1]], '한 장')
const many = Array.from({ length: 40 }, () => 60)
const pages = paginate(many, 400)
ok(pages.length >= 3, `여러 장 (${pages.length})`)
eq(pages.flat(), many.map((_, i) => i), '순서·누락 없음')
eq(paginate([BODY_PX - 10], 300).length, 2, '서명란만 다음 장')
eq(paginate([500, 100], 0, BODY_PX, BODY_PX - 300), [[], [0, 1]], '1쪽 머리가 크면 첫 블록부터 다음 장')
eq(paginate([200, 101], 0, BODY_PX, BODY_PX - 300), [[0], [1]], '1쪽 머리 + 블록')
// 기본 양식(제4~10조 + 특약 5+5줄)은 2쪽 이내
const clausesPx = laterClauses(false).map((x) => LINE + textPx(x.body) + 8)
const specialPx = [...std, ...specialLines(base)].map((s) => textPx(s, 48) + 4)
const defaultPages = paginate([...clausesPx, 44, ...specialPx], 120 + 3 * 110)
ok(defaultPages.length <= 2, `기본 양식 본문 ${defaultPages.length}장`)

if (fail) {
  console.log(`${fail} failed`)
  process.exit(1)
}
console.log('check-lease-contract: all passed')
