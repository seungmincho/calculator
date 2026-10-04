import { Metadata } from 'next'
import RentalYieldCalculator from '@/components/RentalYieldCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '임대수익률 계산기 - 오피스텔·상가 월세 수익률 | 툴허브',
  description: '오피스텔·상가·주택 월세 수익률을 표면·순·실투자 수익률로 나눠 계산하세요. 취득세 4.6%·중개보수·공실률·대출이자를 반영한 월 현금흐름, 손익분기 월세, 목표 수익률 역산, 금리·공실 민감도까지.',
  keywords: '임대수익률 계산기, 오피스텔 수익률, 월세 수익률 계산, 상가 수익률, 수익형 부동산 수익률, 실투자 수익률, 오피스텔 취득세, 임대 수익률 계산법, 레버리지 수익률',
  openGraph: {
    title: '임대수익률 계산기 - 오피스텔·상가 월세 수익률 | 툴허브',
    description: '표면·순·실투자 수익률과 월 현금흐름, 손익분기 월세, 목표 수익률 역산을 한 번에.',
    url: 'https://toolhub.ai.kr/rental-yield/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/rental-yield.png', width: 1200, height: 630, alt: '임대수익률 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '임대수익률 계산기 | 툴허브', description: '오피스텔·상가·주택 월세 수익률과 월 현금흐름 계산', images: ['https://toolhub.ai.kr/og/rental-yield.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/rental-yield/' },
}

// 화면에 보이는 FAQ (ToolFaq가 FAQPage JSON-LD도 함께 출력). 예시 숫자는 계산기 기본값과 같음 — scripts/check-rental-yield.ts 케이스 A
const faq = [
  { q: '임대수익률은 어떻게 계산하나요?', a: '표면 수익률은 연 월세 ÷ (매매가 − 보증금), 순수익률은 공실·관리비·수선비·보유세를 뺀 연 순임대수익 ÷ (매매가 + 취득비용 − 보증금), 실투자 수익률은 순임대수익에서 대출이자를 뺀 금액 ÷ 실제로 들어간 내 돈입니다. 매매가 2억원 오피스텔을 보증금 1천만원·월세 80만원에 놓으면 표면 5.05%, 공실 5%·수선비 연 50만원을 넣은 순수익률 4.29%, 대출 1억원(연 4.5%, 이자만)을 낀 실투자 수익률 4.08%입니다.' },
  { q: '표면 수익률과 순수익률은 왜 차이가 나나요?', a: '표면 수익률은 취득세·중개보수 같은 취득비용과 공실, 관리비, 수선비, 보유세를 빼지 않은 숫자라서 실제보다 높게 나옵니다. 위 예시에서도 취득비용 약 1,109만원과 공실 손실·수선비를 반영하면 5.05%가 4.29%로 0.76%p 내려갑니다. 매물끼리 비교할 때는 순수익률을 보세요.' },
  { q: '오피스텔·상가 취득세는 얼마인가요?', a: '오피스텔과 상가는 주택이 아닌 부동산의 유상취득이라 취득세 4%(지방세법 제11조①7호나목)에 농어촌특별세 0.2%, 지방교육세 0.4%를 더해 매매가의 4.6%입니다. 2억원 오피스텔이면 920만원입니다. 주택은 1~3%이고, 다주택·조정대상지역이면 8~12%로 중과됩니다.' },
  { q: '대출을 받으면 수익률이 올라가나요?', a: '대출금리가 순수익률보다 낮을 때만 올라갑니다. 순수익률이 4.29%인데 4.5%로 빌리면 오히려 실투자 수익률이 4.08%로 떨어지고, 금리가 7%면 1.6%까지 내려갑니다. 이것을 역레버리지라고 하며, 계산기의 금리·공실 민감도 표로 금리 ±1%p 변화를 바로 확인할 수 있습니다.' },
  { q: '공실률은 몇 %로 넣어야 하나요?', a: '1년 중 비어 있을 것으로 예상되는 기간의 비율을 넣으면 됩니다. 한 달이면 약 8.3%, 두 달이면 16.7%입니다. 임차인이 바뀔 때마다 생기는 공백, 주변 신축 공급, 실제 매물의 과거 공실 기간을 함께 확인해 보수적으로 잡는 것이 좋습니다.' },
  { q: '월세 수입에도 세금이 붙나요?', a: '참고로, 주택 1채만 가진 사람의 월세는 비과세입니다(기준시가 12억원 초과·국외 주택 제외, 소득세법 제12조). 주택 임대 총수입이 연 2천만원 이하면 14% 분리과세를 고를 수 있고(제64조의2), 상가 월세는 부가세 10%와 종합소득세 대상입니다. 이 계산기는 세금을 빼지 않은 세전 수익률을 보여 주므로 정확한 세액은 국세청이나 세무 전문가에게 확인하세요.' },
  { q: '목표 수익률에 맞는 매수가는 어떻게 구하나요?', a: '계산기의 목표 수익률 역산에서 원하는 순수익률을 고르면 지금 조건에서 받아야 할 월세와 살 수 있는 최대 매수가를 함께 보여 줍니다. 매수가를 바꾸면 취득세·중개보수도 달라지므로 그것까지 다시 계산합니다. 위 예시에서 순수익률 5%를 맞추려면 월세 925,821원 또는 매수가 1억 7,276만원 이하가 필요합니다.' },
]

export default function RentalYieldPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '임대수익률 계산기',
    description: '오피스텔·상가·주택의 표면·순·실투자 임대수익률과 월 현금흐름, 손익분기 월세, 목표 수익률 역산을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/rental-yield/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['표면·순·실투자 수익률', '취득세·중개보수 자동 반영', '공실률·관리비·수선비·보유세 반영', '대출 이자만·원리금균등 상환', '월 현금흐름', '손익분기 월세', '목표 수익률 월세·매수가 역산', '금리·공실 민감도 표', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <RentalYieldCalculator />
            <ToolFaq items={faq} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">임대수익률 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            임대수익률 계산기는 오피스텔·상가·주택을 사서 월세를 받을 때 1년에 투자금 대비 얼마가 남는지 계산하는 도구입니다. 광고에 흔히 나오는 표면 수익률뿐 아니라 취득세(오피스텔·상가 4.6%)와 중개보수, 등기 부대비용, 공실률, 관리비, 수선비, 보유세를 반영한 순수익률, 대출을 낀 실투자 수익률을 나눠 보여 줍니다. 월 현금흐름과 손익분기 월세, 목표 수익률을 맞추는 월세·매수가, 금리와 공실이 바뀔 때의 민감도까지 한 화면에서 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">오피스텔 2억원 계산 예시</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>조건:</strong> 매매가 2억원, 보증금 1천만원, 월세 80만원, 공실률 5%, 수선비 연 50만원, 대출 1억원(연 4.5%, 이자만)</li>
            <li><strong>취득비용:</strong> 취득세 등 920만원 + 중개보수 110만원 + 등기 부대비용 약 79만원 = 1,108만 7천원</li>
            <li><strong>수익률:</strong> 표면 5.05% · 순수익률 4.29% · 실투자 수익률 4.08% (실투자금 1억 108만 7천원)</li>
            <li><strong>현금흐름:</strong> 월 +343,333원, 손익분기 월세 438,597원 — 금리가 5.5%로 오르면 월 +260,000원</li>
          </ul>
        </div>
      </section>
    </>
  )
}
