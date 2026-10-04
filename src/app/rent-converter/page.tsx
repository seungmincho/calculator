import { Metadata } from 'next'
import RentConverter from '@/components/RentConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '전세 월세 전환 계산기 - 전월세 전환율 계산 | 툴허브',
  description: '전세 월세 전환 계산기 - 전세 보증금을 월세로, 월세를 전세금으로 변환합니다. 전월세 전환율 기준 계산, 연간 비용 비교.',
  keywords: '전세 월세 전환, 전월세 전환율, 전세 월세 계산기, 전세금 월세 변환, rent converter, 전환율 계산',
  openGraph: { title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/rent-converter.png', width: 1200, height: 630, alt: '전세 월세 전환 계산기' }] },
  twitter: { card: 'summary_large_image', title: '전세 월세 전환 계산기 | 툴허브', description: '전세↔월세 전환 계산', images: ['https://toolhub.ai.kr/og/rent-converter.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/rent-converter/' },
}

export default function RentConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '전세 월세 전환 계산기', description: '전세↔월세 전환율 기준 변환', url: 'https://toolhub.ai.kr/rent-converter', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['전세→월세 변환', '월세→전세 변환', '법정 전환율 상한 계산', '보증금 조정', '전세·반전세·월세 총비용 비교', '갱신 5% 상한 계산'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '전월세 전환율이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '전월세 전환율은 전세 보증금을 월세로, 또는 월세를 전세금으로 환산할 때 적용하는 비율입니다. 법정 상한은 연 10%와 \"한국은행 기준금리 + 2%p\" 중 낮은 비율입니다(주택임대차보호법 시행령 제9조). 2026년 8월 27일 기준금리 3.00% 기준 상한은 5.0%이며, 전세 1억 원을 월세로 바꾸면 월 약 41.7만 원(1억 × 5% ÷ 12)입니다.' } },
      { '@type': 'Question', name: '전세와 월세 중 어떤 것이 유리한가요?', acceptedAnswer: { '@type': 'Answer', text: '전세는 보증금 전액을 맡기므로 월 주거비가 없고 퇴거 시 돌려받지만, 전세 사기 위험과 기회비용이 있습니다. 월세는 매월 고정 비용이 발생하지만 목돈 부담이 적습니다. 보증금으로 묶일 돈의 운용 수익률(또는 전세대출 금리)이 전환율보다 높으면 월세가, 낮으면 전세가 유리할 수 있습니다. 총급여 8,000만 원 이하 무주택 세대주는 월세의 15~17%(연 1,000만 원 한도)를 세액공제 받을 수 있어, 전세대출 금리가 높을수록 월세가 유리해집니다.' } },
      { '@type': 'Question', name: '적정 전월세 전환율은 어떻게 확인하나요?', acceptedAnswer: { '@type': 'Answer', text: '지역·주택 유형별 시장 전환율은 한국부동산원 부동산통계정보시스템(R-ONE)에서 매월 공개합니다. 법정 상한(연 10%와 기준금리 + 2%p 중 낮은 비율)을 넘는 전환은 계약 기간 중·갱신 시 허용되지 않으며, 초과 지급한 월세는 반환을 청구할 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><RentConverter />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            전세 월세 전환 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            전세 월세 전환 계산기는 전세 보증금과 월세 간의 적정 전환 금액을 법정 전월세 전환율 기준으로 계산해 주는 임대차 계산 도구입니다. 집주인이 전세를 월세로 전환하거나, 세입자가 보증금 일부를 올리는 대신 월세를 낮추고 싶을 때 협상의 기준이 되는 금액을 빠르게 산출하고 연간 주거비용을 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            전세 월세 전환 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>법정 상한 전환율 확인:</strong> 전월세 전환율 법정 상한은 연 10%와 &quot;기준금리 + 2%p&quot; 중 낮은 비율입니다. 계약 기간 중이나 갱신 때 집주인이 이를 초과하는 전환을 요구하면 임차인이 초과분 반환을 요청할 수 있습니다(새로 맺는 계약에는 적용되지 않음).</li>
            <li><strong>연간 비용 비교:</strong> 전세 보증금 운용 기회비용(이자 수익)과 월세 연간 납부액을 비교하면 어느 방식이 실제로 유리한지 판단할 수 있습니다.</li>
            <li><strong>월세 세액공제 고려:</strong> 총급여 8,000만 원 이하 무주택 세대주 근로자는 월세의 15~17%를 세액공제 받을 수 있습니다. 이를 반영하면 월세의 실질 부담이 줄어들어 전세보다 유리해지는 경우도 있습니다.</li>
            <li><strong>보증금 조정 협상:</strong> 갱신 계약 시 전환율을 적용해 보증금 증액분에 대응하는 월세 감액분을 계산하면 협상 근거를 명확히 제시할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
