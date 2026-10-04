import { Metadata } from 'next'
import ShippingCalc from '@/components/ShippingCalc'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '택배비 계산기 2026 - 우체국·CJ·편의점 요금 비교 | 툴허브',
  description: '2026년 요금 기준, 무게·크기만 입력하면 우체국택배·CJ대한통운·한진·롯데·로젠과 CU·GS25·세븐일레븐 편의점택배 요금을 한 번에 비교. 제주·도서산간 요금 포함.',
  keywords: '배송비 계산기, 택배 요금 계산, 택배비 비교, shipping calculator, 배송료 계산',
  openGraph: { title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/shipping-calculator.png', width: 1200, height: 630, alt: '배송비 계산기' }] },
  twitter: { card: 'summary_large_image', title: '배송비 계산기 | 툴허브', description: '택배사별 배송 요금 비교 계산', images: ['https://toolhub.ai.kr/og/shipping-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/shipping-calculator/' },
}

export default function ShippingCalcPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '배송비 계산기', description: '택배사별 배송 요금 비교 계산', url: 'https://toolhub.ai.kr/shipping-calculator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['택배사별 요금', '무게별 계산', '크기별 계산', '요금 비교'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '택배 요금은 어떻게 결정되나요?', acceptedAnswer: { '@type': 'Answer', text: '국내 택배·소포 요금은 무게 단계와 크기(가로+세로+높이) 단계 중 높은 단계로 정해집니다(우정사업본부 소포요금표·CJ대한통운 기준). 예를 들어 우체국 등기소포는 2kg이라도 세 변 합이 110cm면 6,000원입니다. 2026년 개인 방문접수(타권역) 기준 5kg 이하 약 5,000~7,000원, 10kg 이하 약 7,000~8,000원, 20kg 이하 약 8,000~10,000원 수준이며, 우체국 창구 등기소포는 3kg·80cm 이하 4,000원부터입니다.' } },
      { '@type': 'Question', name: '택배사별 요금 차이가 있나요?', acceptedAnswer: { '@type': 'Answer', text: 'CJ대한통운, 한진, 롯데택배, 로젠 등 주요 택배사의 개인 발송 요금은 비슷한 수준이지만, 편의점 택배가 일반적으로 저렴합니다. 편의점끼리 주고받는 반값택배는 GS25·CU(롯데글로벌로지스 배송) 5kg 이하 1,800~2,700원, 세븐일레븐 착한택배는 전국 1,980원 균일가입니다. 집으로 배달되는 GS25 일반택배는 1kg 이하 5,000원(타권) 수준입니다. 대량 발송 시 택배사와 월 계약을 하면 40~60% 할인받을 수 있습니다.' } },
      { '@type': 'Question', name: '해외 배송비는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '해외 배송비는 목적지, 무게, 배송 방법에 따라 크게 다릅니다. EMS 기준 일본/중국 0.5kg 약 15,000원, 미국 약 22,000원입니다. K-Packet(소형포장물)은 2kg 이하 약 8,000~15,000원으로 저렴합니다. 해외직구로 국내에 들여올 때는 물품가격 $150(미국발 목록통관 물품은 $200) 이하가 면세이며, 역직구는 받는 나라의 면세 기준을 따릅니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ShippingCalc />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            배송비 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            배송비 계산기는 CJ대한통운, 한진, 로젠 등 주요 택배사의 배송 요금을 무게와 크기에 따라 빠르게 비교할 수 있는 온라인 도구입니다. 쇼핑몰 운영자, 개인 판매자, 직구·역직구 이용자 모두 활용할 수 있으며, 무게·크기(세 변 합) 단계까지 반영해 실제 청구 요금에 가깝게 예측할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            배송비 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>크기 단계 확인:</strong> 국내 택배는 무게 단계와 세 변 합 단계 중 높은 쪽 요금이 적용되므로, 가벼워도 상자가 크면 요금이 올라갑니다.</li>
            <li><strong>편의점 택배 활용:</strong> GS25, CU 편의점 택배는 5kg 이하 소형 물품을 일반 택배보다 저렴하게 발송할 수 있어 개인 발송에 유리합니다.</li>
            <li><strong>택배사별 특화 서비스 비교:</strong> 냉장·냉동 식품은 한진 또는 CJ의 신선 배송 서비스를, 대형 가구·가전은 특수 배송 서비스를 별도로 문의하세요.</li>
            <li><strong>해외 배송 시 관세 고려:</strong> 미국 $200, 한국 $150 이하는 면세지만, 초과분에는 관세와 부가세가 부과되므로 EMS·K-Packet 요금과 함께 고려하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
