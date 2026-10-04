import { Metadata } from 'next'
import PyeongCalculator from '@/components/PyeongCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import pyeongCalculatorMessages from '../../../messages/generated/ko/ns/pyeongCalculator.json'

export const metadata: Metadata = {
  title: '평수 계산기 - 평↔제곱미터 면적 변환, 아파트 평수 | 툴허브',
  description: '평수 계산기 - 평(坪)과 제곱미터(m²) 간 면적 변환. 전용·공급·계약면적과 평당가↔㎡당가, 아파트 평형(59㎡·84㎡)을 한 번에 확인하세요. 평방피트(ft²) 변환도 지원.',
  keywords: '평수 계산기, 평 제곱미터 변환, 평수 계산, 아파트 평수, 면적 환산, pyeong calculator',
  openGraph: { title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환, 아파트 평수 계산', url: 'https://toolhub.ai.kr/pyeong-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/pyeong-calculator.png', width: 1200, height: 630, alt: '평수 계산기' }] },
  twitter: { card: 'summary_large_image', title: '평수 계산기 | 툴허브', description: '평↔m² 면적 변환', images: ['https://toolhub.ai.kr/og/pyeong-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/pyeong-calculator/' },
}

export default function PyeongCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '평수 계산기', description: '평(坪)↔제곱미터(m²) 면적 변환', url: 'https://toolhub.ai.kr/pyeong-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['평↔m² 실시간 변환', 'ft² 변환', '가로×세로 면적 계산', '전용률로 전용↔공급면적 환산', '인기 아파트 면적표(59㎡·84㎡ 등)', '계약면적·서비스(발코니)면적 계산', '평당가↔㎡당가 변환', '방 크기 가로×세로 환산', '결과 이미지 공유'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={pyeongCalculatorMessages.pyeongCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><PyeongCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            평수 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            평수 계산기는 한국 부동산에서 자주 사용하는 평(坪) 단위와 국제 표준 제곱미터(m²) 간의 면적을 즉시 변환해 주는 도구입니다. 아파트 평수 계산, 토지 면적 환산, 상가 임대 면적 비교 등 부동산 거래 시 필수적으로 필요하며, 평방피트(ft²) 변환도 지원하여 해외 부동산 정보와도 손쉽게 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            평수 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>아파트 평수 확인:</strong> 등기부등본이나 분양 공고의 m² 단위 전용면적을 평으로 변환하면 실제 생활 공간 크기를 직관적으로 파악할 수 있습니다.</li>
            <li><strong>공급면적과 전용면적 구분:</strong> 아파트 분양 시 공급면적·계약면적과 전용면적이 다르므로 각각을 평으로 변환해 실제 사용 공간을 확인하세요.</li>
            <li><strong>임대료 비교:</strong> 상가나 사무실 임대 시 평당 임대료를 구하면 서로 다른 면적의 물건을 객관적으로 비교할 수 있습니다.</li>
            <li><strong>인테리어 견적:</strong> 도배, 장판, 에어컨 등 면적 기준 시공 견적을 받을 때 평수를 정확히 알면 과도한 견적을 방지할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
