import { Metadata } from 'next'
import RentTaxCreditCalculator from '@/components/RentTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '월세 세액공제 계산기 2026 - 환급액·경정청구 | 툴허브',
  description: '총급여와 월세만 넣으면 2026년 귀속 월세 세액공제(17%·15%, 연 1,000만 원 한도)로 실제로 줄어드는 세금을 계산합니다. 무주택·전입신고 자격 체크, 지난 5년 놓친 월세 경정청구 기한과 연도별 환급액까지.',
  keywords: '월세 세액공제 계산기, 월세 세액공제, 월세 연말정산, 월세 환급, 월세 경정청구, 월세 세액공제 조건, 월세 세액공제 한도, 월세 공제율 17%, 월세 현금영수증, 세대원 월세 공제, 2026 월세 세액공제',
  openGraph: {
    title: '월세 세액공제 계산기 2026 - 환급액·경정청구 | 툴허브',
    description: '총급여·월세 → 실제로 줄어드는 세금, 자격 체크, 지난 5년 경정청구 기한과 환급액.',
    url: 'https://toolhub.ai.kr/rent-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/rent-tax-credit.png', width: 1200, height: 630, alt: '월세 세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '월세 세액공제 계산기 | 툴허브', description: '월세로 돌려받는 돈과 지난 5년 경정청구까지', images: ['https://toolhub.ai.kr/og/rent-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/rent-tax-credit/' },
}

// 숫자는 전부 scripts/check-rent-tax-credit.ts로 검증 (본인 1명·다른 공제 없음 가정, 2026년 귀속 세법)
const faqs = [
  { q: '월세 세액공제는 누가 받을 수 있나요?', a: '12월 31일 현재 세대원 모두 집이 없는 세대의 세대주(세대주가 월세·주택청약·주택임차차입금·장기주택저당차입금 공제를 받지 않으면 세대원도 가능)로, 총급여 8천만 원 이하(종합소득금액 7천만 원 이하)인 근로자가 대상입니다. 집은 전용 85㎡ 이하 국민주택규모이거나 기준시가 4억 원 이하여야 하고 주거용 오피스텔·고시원도 포함됩니다. 임대차계약서 주소로 전입신고가 되어 있어야 하며, 계약자는 본인 또는 기본공제 대상 가족이어야 합니다(조세특례제한법 제95조의2, 같은 법 시행령 제95조).' },
  { q: '월세 세액공제로 얼마를 돌려받나요?', a: '한 해 낸 월세(연 1,000만 원 한도)에 총급여 5,500만 원 이하는 17%, 5,500만 원 초과 8,000만 원 이하는 15%를 곱한 금액만큼 소득세가 줄고, 지방소득세 10%도 함께 줄어듭니다. 총급여 5,000만 원에 월세 60만 원을 12개월 냈다면 720만 원 × 17% = 122만 4천 원, 지방소득세까지 134만 6,400원입니다. 월세가 90만 원이면 연 1,080만 원 중 1,000만 원만 인정돼 187만 원입니다.' },
  { q: '계산기 금액이 공제율로 계산한 것보다 적게 나와요.', a: '세액공제는 원래 낼 세금(결정세액)까지만 줄여 주고 넘는 부분은 돌려주지 않습니다. 총급여 3,500만 원인 1인 가구가 월세 60만 원을 12개월 내면 계산상 134만 6,400원이지만, 월세 공제 전 세금이 지방소득세 포함 105만 1,420원이라 실제로 줄어드는 세금도 105만 1,420원입니다. 또 월세 공제를 신청하면 표준세액공제 13만 원을 받을 수 없어(소득세법 제59조의4 제9항) 그 차이도 반영됩니다.' },
  { q: '확정일자나 집주인 동의가 필요한가요?', a: '필요 없습니다. 국세청은 2014년 귀속부터 확정일자 없이도 공제된다고 안내하고, 법령 요건에 집주인 동의는 없습니다. 회사에는 주민등록표등본, 임대차계약서 사본, 계좌이체 영수증·무통장입금증 등 월세를 낸 증빙을 냅니다. 연말정산 간소화 서비스에는 공공임대주택과 일부 카드사(현대·신한·삼성·국민) 결제분만 조회되므로 대부분은 서류를 직접 준비해야 합니다.' },
  { q: '세대원이나 배우자 명의 계약도 공제되나요?', a: '세대원은 세대주가 월세, 주택청약종합저축, 주택임차차입금 원리금, 장기주택저당차입금 이자 공제를 받지 않으면 받을 수 있습니다. 계약은 본인 명의 외에 기본공제 대상자(연 소득금액 100만 원 이하 배우자 등) 명의도 인정됩니다. 총급여 8천만 원 기준은 부부 합산이 아니라 공제받는 사람 본인 기준입니다. 2026년 지급분부터는 세대주와 주소지 시·군·구가 다른 배우자도 요건을 갖추면 추가로 공제받을 수 있고, 부부 월세를 합쳐 1,000만 원이 한도입니다.' },
  { q: '연말정산 때 월세를 빠뜨렸으면 언제까지 돌려받을 수 있나요?', a: '그해 5월 종합소득세 신고로 추가하거나, 이후 홈택스 [세금신고] → [종합소득세 신고] → [근로소득 신고] → [경정청구]로 청구합니다. 연말정산만 한 근로자의 경정청구 기한은 연말정산 세액 납부기한(다음 해 3월 10일)이 지난 뒤 5년입니다(국세기본법 제45조의2 제5항). 2026년 10월 기준으로 2021~2025년 귀속을 청구할 수 있고, 2021년 귀속은 2027년 3월 10일이 마지막 날입니다.' },
  { q: '지난 해에도 같은 공제율이 적용되나요?', a: '해마다 다릅니다. 2021년 귀속은 12%/10%에 한도 750만 원·총급여 7천만 원, 2022~2023년 귀속은 17%/15%에 한도 750만 원·총급여 7천만 원, 2024년 귀속부터는 17%/15%에 한도 1,000만 원·총급여 8천만 원입니다. 총급여 5,000만 원에 월세 60만 원을 2021~2025년 내내 냈는데 공제를 한 번도 안 받았다면 최대 633만 6천 원(지방소득세 포함)을 청구할 수 있습니다. 총급여 7,500만 원이었다면 2023년 귀속까지는 소득 기준을 넘어 2024·2025년 귀속만 해당합니다.' },
  { q: '월세 현금영수증 소득공제와 세액공제 중 무엇이 유리한가요?', a: '같은 월세로 둘 다 받을 수는 없습니다. 현금영수증은 신용카드 등 소득공제(30%)로 들어가 카드 사용액이 총급여 25%를 넘은 부분만 공제됩니다. 총급여 5,000만 원·월세 60만 원이면 세액공제는 134만 6,400원, 현금영수증은 카드가 이미 문턱을 넘었어도 최대 35만 6,400원이라 요건을 갖췄다면 세액공제가 유리합니다. 총급여 9,000만 원처럼 세액공제 대상이 아니면 현금영수증으로 최대 57만 240원을 줄일 수 있고, 홈택스 주택임차료(월세) 신고는 월세를 낸 날부터 5년 안에 할 수 있습니다.' },
  { q: '청년월세 지원을 받아도 월세 세액공제를 받을 수 있나요?', a: '정부24의 청년월세 지원 안내에서 함께 받을 수 없는 사업은 지자체 자체 월세 지원이고 월세 세액공제는 제외 대상에 없으며, 조세특례제한법에도 지원금 수령자를 빼는 규정은 없습니다. 다만 지원받은 금액을 공제 대상 월세에서 빼야 하는지는 법령에 명시돼 있지 않으므로, 금액이 크다면 국세상담센터(126)에 먼저 확인하는 것이 안전합니다.' },
  { q: '2026년에 달라진 점이 있나요?', a: '공제율(17%/15%)과 한도(1,000만 원), 소득 기준(8천만 원)은 2025년 귀속과 같습니다. 2026년 지급분부터 주소지 시·군·구가 다른 배우자의 추가 공제가 생겼고(조세특례제한법 제95조의2 제2항), 기본공제 자녀·손자녀가 3명 이상이면 전용 100㎡ 이하 주택까지 대상이 됐습니다(시행령 제95조 제2항). 2026년 8월 정부 세제개편안의 한도 1,200만 원·청년 17% 안은 국회 심의 중이라 계산에 넣지 않았습니다.' },
]

const sources = [
  { label: '조세특례제한법 제95조의2 (월세액에 대한 세액공제)', url: 'https://www.law.go.kr/법령/조세특례제한법/제95조의2' },
  { label: '조세특례제한법 시행령 제95조 (월세 세액공제 대상 세대·주택)', url: 'https://www.law.go.kr/법령/조세특례제한법시행령/제95조' },
  { label: '국세기본법 제45조의2 (경정 등의 청구)', url: 'https://www.law.go.kr/법령/국세기본법/제45조의2' },
  { label: '주택법 제2조 (국민주택규모)', url: 'https://www.law.go.kr/법령/주택법/제2조' },
  { label: '국세청 월세액 세액공제 안내', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=40613&cntntsId=239025' },
  { label: '국세상담센터 월세세액공제 자주 묻는 질문', url: 'https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=1318&ctgId=CTG11906' },
  { label: '국세상담센터 간소화 자료 조회(월세액)', url: 'https://call.nts.go.kr/call/qna/selectHomeQnaInfo.do?mi=12984&ctgId=CTG11611' },
  { label: '국세상담센터 근로소득자 경정청구', url: 'https://call.nts.go.kr/call/qna/selectHomeQnaInfo.do?mi=3555' },
  { label: '국세청 현금거래확인신청 및 주택임차료 신고', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2473&cntntsId=7798' },
  { label: '정부24 청년월세 지원', url: 'https://www.gov.kr/portal/rcvfvrSvc/dtlEx/161300000099' },
  { label: '정책브리핑 2026년 세제개편안 (월세 세액공제 확대안)', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148969870' },
]

export default function RentTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '월세 세액공제 계산기',
    description: '총급여와 월세로 2026년 귀속 월세 세액공제액과 실제로 줄어드는 세금, 공제 자격, 지난 5년 경정청구 가능 연도와 환급 상한을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/rent-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026년 귀속 월세 세액공제(17%·15%, 연 1,000만 원 한도)', '무주택·세대주·주택 규모·전입신고·계약자 자격 체크', '결정세액 한도와 표준세액공제를 반영한 실제 절세액', '월세 현금영수증 소득공제와 비교', '지난 5년 경정청구 가능 연도와 기한', '귀속연도별 공제율·한도 규칙', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <RentTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">월세 세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-4">
            월세 세액공제는 집 없는 직장인이 낸 월세의 15~17%를 소득세에서 직접 빼 주는 제도입니다. 소득공제가 아니라 세액공제라 효과가 크지만, 연말정산 간소화 서비스에 월세가 거의 나오지 않아 직접 서류를 내야 하고, 그래서 놓치는 사람이 많습니다. 이 계산기는 공제 요건을 하나씩 확인한 뒤 총급여와 월세로 올해 실제로 줄어드는 세금을 계산하고, 지난 5년 동안 놓친 월세를 경정청구로 얼마까지 돌려받을 수 있는지 연도별 규칙대로 보여 줍니다.
          </p>
          <p className="text-body leading-relaxed mb-6">
            &lsquo;실제로 줄어드는 세금&rsquo;은 공제율을 곱한 금액과 다를 수 있습니다. 세액공제는 원래 낼 세금(결정세액)을 넘어서 돌려주지 않고, 월세 공제를 받으면 표준세액공제 13만 원을 포기해야 하기 때문입니다. 계산기는 연말정산 계산기와 같은 세법 계산(근로소득공제, 기본세율, 근로소득세액공제, 4대보험 공제)으로 두 효과를 모두 반영합니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">사례: 월세 60만 원을 12개월 낸 1인 가구 (연 720만 원)</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li><strong>총급여 3,500만 원:</strong> 공제율 17%로 계산상 122만 4천 원(지방소득세 포함 134만 6,400원). 하지만 월세 공제 전 세금이 105만 1,420원이라 실제로 줄어드는 세금은 105만 1,420원, 즉 낼 세금이 0원이 됩니다.</li>
            <li><strong>총급여 5,000만 원:</strong> 720만 원 × 17% = 122만 4천 원 + 지방소득세 12만 2,400원 = <strong>134만 6,400원</strong>을 전부 돌려받습니다.</li>
            <li><strong>총급여 8,000만 원:</strong> 공제율 15%로 108만 원 + 지방소득세 10만 8천 원 = <strong>118만 8,000원</strong>. 총급여가 8,000만 원을 1원이라도 넘으면 0원이고, 이때는 월세 현금영수증 소득공제가 대안입니다.</li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">지난 5년 경정청구, 연도별로 다른 규칙</h3>
          <p className="text-body leading-relaxed mb-6">
            2022년 귀속은 2022년 12월 법 개정으로 오른 공제율(17%/15%)이 소급 적용됐고, 2024년 귀속부터 한도가 750만 원에서 1,000만 원으로, 소득 기준이 7천만 원에서 8천만 원으로 올랐습니다. 그래서 총급여 5,000만 원·월세 60만 원이면 2021년 귀속은 95만 400원, 2022~2025년 귀속은 해마다 134만 6,400원으로 합계 최대 633만 6천 원입니다. 이 금액은 그해 결정세액을 넘지 못하는 상한이므로, 홈택스에서 그해 원천징수영수증의 결정세액을 함께 확인하세요.
          </p>

          <p className="text-sm text-muted">
            카드·의료비·연금저축까지 합친 전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 카드 공제는 <a href="/card-deduction/" className="text-primary hover:underline">신용카드 소득공제 계산기</a>, 청년월세 지원 자격은 <a href="/youth-rent-subsidy/" className="text-primary hover:underline">청년월세지원 자격 계산기</a>, 월세와 전세 비교는 <a href="/rent-converter/" className="text-primary hover:underline">전월세 전환 계산기</a>에서 확인할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mt-8 mb-3">근거 법령·자료 (2026년 10월 4일 확인)</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
