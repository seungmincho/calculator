import { Metadata } from 'next'
import MedicalTaxCreditCalculator from '@/components/MedicalTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, couple, netOf, threshold, EXAMPLES } from '@/utils/medicalTaxCredit'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '의료비 세액공제 계산기 2026 - 3% 문턱·맞벌이 비교 | 툴허브',
  description: '연봉과 의료비로 2026년 귀속 의료비 세액공제액과 실제로 줄어드는 세금을 계산합니다. 총급여 3% 문턱, 부양가족 700만원 한도, 실손보험금 차감, 난임 30%·미숙아 20%, 맞벌이 부부 중 누가 공제받으면 유리한지까지.',
  keywords: '의료비 세액공제 계산기, 의료비 세액공제, 의료비 공제, 연말정산 의료비, 의료비 3%, 의료비 공제 한도, 맞벌이 의료비 몰아주기, 실손보험 의료비 공제, 난임시술비 세액공제, 산후조리원 의료비 공제, 안경 의료비 공제',
  openGraph: {
    title: '의료비 세액공제 계산기 2026 - 3% 문턱·맞벌이 비교 | 툴허브',
    description: '연봉·의료비 → 세액공제액과 줄어드는 세금, 3% 문턱, 맞벌이 누가 공제받을지.',
    url: 'https://toolhub.ai.kr/medical-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/medical-tax-credit.png', width: 1200, height: 630, alt: '의료비 세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '의료비 세액공제 계산기 | 툴허브', description: '의료비 세액공제액과 줄어드는 세금, 맞벌이 비교', images: ['https://toolhub.ai.kr/og/medical-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/medical-tax-credit/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-medical-tax-credit.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const man = (n: number) => `${(n / 10_000).toLocaleString('ko-KR')}만원`
const D = analyze(EXAMPLES.d.salary, EXAMPLES.d.e)
const A = analyze(EXAMPLES.a.salary, EXAMPLES.a.e)
const B = analyze(EXAMPLES.b.salary, netOf(EXAMPLES.b.paid, EXAMPLES.b.insured))
const L = analyze(EXAMPLES.low.salary, EXAMPLES.low.e)
const C = couple(EXAMPLES.c.salary, EXAMPLES.c.spouseSalary, EXAMPLES.c.e, EXAMPLES.c.spouseOwn)
const C_FAMILY = C.results.find((x) => x.plan.mine === 'me' && x.plan.spouse === 'spouse' && x.plan.family === 'spouse')!
const C_SPOUSE_TH = threshold(EXAMPLES.c.spouseSalary)
const elderBirth = TAX_YEAR - 65

const faqs = [
  { q: '의료비 세액공제는 어떻게 계산하나요?', a: `한 해 의료비 합계 중 총급여의 3%를 넘는 금액의 15%를 세금에서 뺍니다. 미숙아·선천성이상아 의료비는 20%, 난임시술비는 30%이고, 본인·6세 이하·65세 이상·장애인이 아닌 부양가족 의료비는 연 700만원까지만 공제됩니다. 3% 문턱은 그 밖의 부양가족 → 본인 등 → 미숙아 → 난임시술비 의료비 순서로 뺍니다(소득세법 제59조의4제2항). 예를 들어 총급여 5,000만원이면 문턱은 ${man(D.threshold)}이고, 본인 70만원과 부모님(64세) 180만원을 합쳐 ${man(D.spent)}을 썼다면 넘은 100만원의 15%인 ${won(D.credit)}이 공제되어 지방소득세를 포함해 세금이 ${won(D.saving)} 줄어듭니다.` },
  { q: '한도 없이 공제되는 의료비는 누구 것인가요?', a: `근로자 본인, ${TAX_YEAR}년 1월 1일 현재 만 6세 이하인 가족, ${TAX_YEAR}년 12월 31일 현재 만 65세 이상(${elderBirth}년 이전 출생)인 가족, 장애인, 중증질환·희귀난치성질환·결핵으로 건강보험 산정특례를 받는 사람의 의료비는 한도가 없습니다. 6세 이하는 2024년 지출분부터 한도 없는 대상에 들어갔습니다. 그 밖의 부양가족 의료비는 합쳐서 연 700만원이 한도입니다.` },
  { q: '부모님 소득이 있어도 의료비 공제를 받을 수 있나요?', a: '받을 수 있습니다. 의료비 세액공제는 기본공제대상자의 나이·소득 요건을 따지지 않으므로, 소득이 연 100만원을 넘거나 60세 미만이라 인적공제를 못 받는 부모님이라도 생계를 같이 하고 다른 사람의 기본공제대상자가 아니라면 근로자가 낸 의료비를 공제받을 수 있습니다. 형제자매는 주민등록상 함께 살면서 생계를 같이 해야 합니다(국세청 상담센터).' },
  { q: '맞벌이 부부는 누가 의료비 공제를 받아야 유리한가요?', a: `의료비는 실제로 낸 근로자가 공제받습니다. 배우자 의료비는 배우자 소득과 관계없이 낸 쪽이 공제받을 수 있지만 '본인'이 아니라 700만원 한도 의료비로 들어가고, 자녀·부모 의료비는 그 가족을 기본공제 받는 쪽이 내야 공제됩니다. 연봉 8,000만원(문턱 ${man(threshold(EXAMPLES.c.salary))})인 사람이 본인 50만원과 자녀 300만원을 모두 공제받으면 세금이 ${won(C.current.total)} 줄지만, 연봉 3,500만원(문턱 ${man(C_SPOUSE_TH)})인 배우자가 자녀 기본공제를 받고 둘 다 결제하면 ${won(C.allSpouse.total)} 줄어 ${won(C.gain)} 이득입니다. 다만 낼 세금보다 큰 공제는 사라지므로 두 사람의 세금을 함께 계산해야 합니다.` },
  { q: '실손보험금을 받은 의료비는 어떻게 하나요?', a: '보험회사에서 받은 실손의료보험금은 그 보험금을 받게 된 의료비에서 빼고 공제받습니다(소득세법 시행령 제118조의5제1항). 연말정산 간소화 자료에 사람별 실손보험금 수령액이 나오며, 의료비를 낸 해와 보험금을 받은 해가 다르면 의료비를 낸 해의 공제를 고쳐야 합니다. 건강보험 본인부담상한제로 돌려받은 금액도 공제 대상이 아닙니다.' },
  { q: '안경·콘택트렌즈와 산후조리원 비용도 공제되나요?', a: '시력교정용 안경·콘택트렌즈는 1명당 연 50만원까지, 산후조리원 비용은 출산 1회당 200만원까지 의료비에 들어갑니다. 산후조리원은 2024년 지출분부터 총급여 요건 없이 누구나 공제받습니다. 안경점·보청기 판매처는 간소화 자료 제출 의무가 없어(소득세법 시행령 제216조의3) 간소화에 나오지 않으면 사용자 이름이 적힌 영수증을 회사에 내야 합니다.' },
  { q: '공제되지 않는 의료비는 무엇인가요?', a: '미용·성형 수술비, 건강증진용 의약품과 건강기능식품(소득세법 시행령 제118조의5제2항), 간병인에게 준 간병비, 외국 병원에 낸 의료비, 실손보험금으로 돌려받은 금액은 공제되지 않습니다. 입사 전이나 퇴사 후에 낸 의료비도 빠지고, 휴직 기간에 낸 의료비는 공제됩니다(국세청 상담센터).' },
  { q: '카드로 낸 의료비는 신용카드 소득공제도 받나요?', a: '받습니다. 의료비 세액공제와 신용카드·현금영수증 소득공제는 중복으로 적용됩니다(국세청). 카드 공제는 신용카드 소득공제 계산기에서 따로 확인할 수 있습니다.' },
  { q: '의료비 공제를 받았는데 환급이 생각보다 적은 이유는?', a: `세액공제는 낼 세금(결정세액)까지만 효과가 있고, 남는 의료비 공제는 다음 해로 넘어가지 않습니다. 예를 들어 총급여 2,000만원인 사람이 본인 수술비 300만원을 쓰면 공제액은 ${won(L.credit)}이지만 원래 낼 세금이 지방소득세 포함 ${won(L.tax)}이라 그만큼만 줄어듭니다. 공제가 작을 때는 특별세액공제 대신 표준세액공제 13만원이 적용되어 의료비 공제 효과가 없을 수도 있습니다.` },
  { q: '연말정산 때 의료비를 빠뜨렸다면 어떻게 하나요?', a: '5월 종합소득세 신고 기간에 홈택스 [세금신고] → [종합소득세 신고] → [근로소득 신고] → [정기신고]에서 연말정산 내용을 불러와 추가하면 됩니다. 그 뒤에도 연말정산 세액 납부기한(보통 다음 해 3월 10일)부터 5년 안에 경정청구로 돌려받을 수 있습니다(국세기본법 제45조의2제5항). 세무서는 청구를 받은 날부터 2개월 안에 결과를 알려 줍니다.' },
]

const sources = [
  { label: '소득세법 제59조의4 (특별세액공제 — 의료비 공제율·3% 문턱·700만원 한도)', url: 'https://www.law.go.kr/법령/소득세법/제59조의4' },
  { label: '소득세법 시행령 제118조의5 (공제 대상 의료비·실손보험금 차감·미용성형 제외)', url: 'https://www.law.go.kr/법령/소득세법시행령/제118조의5' },
  { label: '소득세법 시행령 제216조의3 (간소화 자료 제출 대상 — 안경·보청기 제외)', url: 'https://www.law.go.kr/법령/소득세법시행령/제216조의3' },
  { label: '국세기본법 제45조의2 (경정 등의 청구 — 5년, 2개월 내 통지)', url: 'https://www.law.go.kr/법령/국세기본법/제45조의2' },
  { label: '국세청 — 특별세액공제(의료비·보험료) 안내', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6595&cntntsId=7874' },
  { label: '국세상담센터 — 연말정산 의료비 공제 Q&A (맞벌이·부모·해외·간병비·실손)', url: 'https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=1318&ctgId=CTG11909' },
  { label: '국세상담센터 — 근로소득자 신고서 Q&A (공제 누락·경정청구 경로)', url: 'https://call.nts.go.kr/call/qna/selectHomeQnaInfo.do?mi=3555' },
  { label: '국세청 — 의료비와 현금영수증 중복공제', url: 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?nttSn=1462&mi=15559' },
]

export default function MedicalTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '의료비 세액공제 계산기',
    description: '연봉과 의료비로 의료비 세액공제액과 실제로 줄어드는 세금, 총급여 3% 문턱, 맞벌이 부부의 유리한 공제 배분을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/medical-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${TAX_YEAR}년 귀속 의료비 세액공제`, '총급여 3% 문턱 진행률', '본인·6세 이하·65세 이상·장애인 한도 없음, 부양가족 700만원 한도', '미숙아 20%·난임시술비 30%', '실손보험금 차감', '줄어드는 세금(지방소득세·결정세액 한도·표준세액공제 반영)', '맞벌이 부부 8가지 배분 비교', '공제 대상·제외 의료비 표', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지', '12월 31일 마감 캘린더 추가'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <MedicalTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">의료비 세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            의료비 세액공제 계산기는 총급여와 한 해 동안 낸 의료비로 연말정산에서 받을 의료비 세액공제액과 그만큼 실제로 줄어드는 세금을 계산하는 도구입니다. 의료비는 총급여의 3%를 넘게 쓴 금액부터 공제되고, 본인·6세 이하·65세 이상·장애인 의료비는 한도가 없지만 그 밖의 부양가족 의료비는 700만원까지만 공제됩니다. 공제액이 낼 세금보다 크면 남는 공제는 사라지므로, 이 계산기는 결정세액 한도와 표준세액공제(13만원) 선택까지 반영해 &lsquo;진짜로 돌려받는 금액&rsquo;을 보여 주고, 맞벌이 부부라면 누가 결제하고 공제받을 때 두 사람 세금이 가장 많이 줄어드는지 비교합니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">연봉별 예시 ({TAX_YEAR}년 귀속, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>연봉 3,500만원, 본인 치과·약값 130만원 + 안경 50만원:</strong> 문턱 {man(A.threshold)}을 넘은 {man(A.rows[1].eligible)} × 15% = 공제 {won(A.credit)}, 세금 {won(A.saving)} 감소 (지방소득세 포함)
            </li>
            <li>
              <strong>연봉 5,000만원, 70세 아버지 수술비 800만원(실손보험금 500만원 수령) + 초등학생 자녀 진료비 120만원:</strong> 공제 대상 의료비는 300만원 + 120만원 = {man(B.spent)}. 문턱 {man(B.threshold)}은 자녀 의료비 120만원에서 먼저, 남은 30만원은 아버지 의료비에서 빼서 {man(B.rows[1].eligible)} × 15% = 공제 {won(B.credit)}, 세금 {won(B.saving)} 감소
            </li>
            <li>
              <strong>연봉 8,000만원 + 배우자 연봉 3,500만원, 본인 50만원 + 초등학생 자녀 300만원:</strong> 내가 모두 공제받으면 문턱 {man(threshold(EXAMPLES.c.salary))} 때문에 세금이 {won(C.current.total)}만 줄어듭니다. 배우자가 자녀 기본공제를 받고 자녀 의료비를 결제하면 {won(C_FAMILY.total)}, 내 의료비까지 배우자가 결제하면(배우자 쪽에서는 700만원 한도 의료비) {won(C.allSpouse.total)} 줄어 {won(C.gain)}을 더 돌려받습니다.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">12월 31일 전에 할 일</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>올해 의료비가 이미 총급여 3%를 넘었다면, 미뤄 둔 치료·안경 구입을 12월 31일 전에 하면 그 금액의 15%(지방소득세 포함 16.5%)가 올해 세금에서 빠집니다.</li>
            <li>맞벌이라면 남은 기간의 가족 의료비를 누구 카드로 낼지 위 계산기로 정하세요. 자녀·부모 의료비는 그 가족을 기본공제 받는 쪽이 내야 공제됩니다.</li>
            <li>실손보험을 청구할 의료비는 보험금을 뺀 금액으로 계산해 두세요.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 카드로 낸 의료비의 카드 공제는 <a href="/card-deduction/" className="text-primary hover:underline">신용카드 소득공제 계산기</a>, 그 밖의 세액공제는 <a href="/rent-tax-credit/" className="text-primary hover:underline">월세 세액공제</a>·<a href="/pension-tax-credit/" className="text-primary hover:underline">연금저축·IRP 세액공제</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 10월 현재 시행 중인 법령과 국세청 안내 기준입니다. 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
