import { Metadata } from 'next'
import { Suspense } from 'react'
import TaxiFare from '@/components/TaxiFare'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '택시 요금 계산기 - 거리별 예상 요금, 심야 할증 | 툴허브',
  description: '택시 요금 계산기 - 이동 거리와 시간을 입력하면 예상 택시 요금을 계산합니다. 일반/모범/대형 택시, 심야 할증 포함.',
  keywords: '택시 요금 계산기, 택시비 계산, 택시 요금, taxi fare calculator, 심야 택시 요금',
  openGraph: { title: '택시 요금 계산기 | 툴허브', description: '예상 택시 요금 계산', url: 'https://toolhub.ai.kr/taxi-fare', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '택시 요금 계산기 | 툴허브', description: '예상 택시 요금 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/taxi-fare/' },
}

export default function TaxiFarePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '택시 요금 계산기', description: '예상 택시 요금 계산', url: 'https://toolhub.ai.kr/taxi-fare', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['택시 요금 계산', '일반/모범 택시', '심야 할증', '지역별 요금'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '택시 심야 할증은 몇 시부터인가요?', acceptedAnswer: { '@type': 'Answer', text: '택시 심야 할증은 밤 10시(22:00)부터 새벽 4시(04:00)까지 적용되며, 일반 요금의 20~40%가 할증됩니다. 서울 기준 일반택시 심야 할증은 20%이며, 기본요금 4,800원이 심야에는 5,760원이 됩니다. 모범택시는 심야 할증이 없는 대신 기본요금이 7,000원으로 높습니다.' } },
      { '@type': 'Question', name: '택시 기본요금은 지역마다 다른가요?', acceptedAnswer: { '@type': 'Answer', text: '네, 택시 기본요금은 지역별로 다릅니다. 2024년 기준 서울 일반택시 기본요금은 4,800원(1.6km), 경기도는 4,800원, 부산 4,800원, 대구 4,500원, 대전 4,500원입니다. 거리 요금도 지역마다 차이가 있으며, 서울은 131m당 100원, 시간 요금은 30초당 100원이 가산됩니다.' } },
      { '@type': 'Question', name: '카카오택시와 일반 택시 요금 차이는?', acceptedAnswer: { '@type': 'Answer', text: '카카오택시 일반 호출은 추가 요금 없이 미터 요금만 부과됩니다. 다만 카카오T 블루(가맹택시)는 호출 수수료 1,000~2,000원이 추가될 수 있고, 카카오T 블랙(모범급)은 별도 요금 체계를 적용합니다. 우버나 타다 등 플랫폼 택시는 수요에 따라 동적 요금제(서지 프라이싱)가 적용될 수 있어 출퇴근 시간에 더 비쌀 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><TaxiFare />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            택시 요금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            택시 요금 계산기는 이동 거리와 예상 소요 시간을 입력하면 일반·모범·대형 택시의 예상 요금을 계산해 주는 온라인 도구입니다. 심야 할증(22:00~04:00), 지역별 기본요금 차이, 거리·시간 요금 가산 방식을 반영하여 호출 전 요금을 미리 파악하고 교통 수단을 합리적으로 선택하는 데 도움을 드립니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            택시 요금 절약 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>심야 할증 시간대 확인:</strong> 밤 10시~새벽 4시에는 일반 요금의 20% 할증이 적용됩니다. 가능하면 10시 이전에 탑승하면 요금을 절약할 수 있습니다.</li>
            <li><strong>택시 종류별 선택:</strong> 일반택시(기본 4,800원)는 근거리, 모범택시(기본 7,000원)는 장거리·고급 서비스, 대형택시는 3~4인 단체 이동 시 유리합니다.</li>
            <li><strong>카카오T 플랫폼 비교:</strong> 카카오T 일반 호출은 미터 요금만 부과되지만, 블루·블랙은 호출 수수료가 추가될 수 있습니다. 출퇴근 시간 서지 요금도 확인하세요.</li>
            <li><strong>지역별 요금 차이:</strong> 서울 기본요금 4,800원, 경기·부산도 비슷하지만 대구·대전은 4,500원입니다. 수도권 경계를 넘으면 할증 요금이 추가될 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
