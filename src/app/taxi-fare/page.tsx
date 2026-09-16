import { Metadata } from 'next'
import TaxiFare from '@/components/TaxiFare'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '택시비 계산기 - 심야할증·시외할증 자동 계산 | 툴허브',
  description: '택시 시외할증(시계외 20~30%)과 심야할증(20~40%)까지 자동 반영한 예상 택시비. 서울·경기·부산 등 17개 시·도 지역별 기본요금, 일반·모범·대형 비교, 결과 이미지 저장.',
  keywords: '택시 요금 계산기, 택시비 계산기, 택시비 계산, 심야 택시 요금, 택시 심야할증, 시외 택시비, 부산 택시 요금, 대구 택시비, 모범택시 요금, taxi fare calculator',
  openGraph: {
    title: '택시 요금 계산기 - 심야·시외할증 자동 | 툴허브',
    description: '지역·거리·탑승 시각 기반 예상 택시비 계산. 심야할증·시외할증 자동 반영.',
    url: 'https://toolhub.ai.kr/taxi-fare',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '택시 요금 계산기 | 툴허브', description: '지역별 심야·시외할증 자동 반영 예상 택시비 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/taxi-fare/' },
}

export default function TaxiFarePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '택시 요금 계산기',
    description: '전국 17개 시·도 지역별 택시 요금과 심야·시외할증을 반영한 예상 택시비 계산기',
    url: 'https://toolhub.ai.kr/taxi-fare',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['17개 시·도 지역별 요금', '탑승 시각별 심야할증(20~40%)', '시외(시계외) 할증', '일반/모범/대형 비교', '결과 이미지 저장', '링크 공유'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '택시 심야 할증은 몇 시부터 몇 %인가요?', acceptedAnswer: { '@type': 'Answer', text: '지역마다 다릅니다. 서울·인천은 22시부터 새벽 4시까지 심야할증이 적용되며, 23~02시는 40%, 나머지 시간대(22~23시, 02~04시)는 20%입니다. 경기는 23~04시 30%, 부산은 23~04시 20~30%, 대전은 23~04시 20%로 지역별 시간과 요율이 다릅니다.' } },
      { '@type': 'Question', name: '택시 기본요금은 지역마다 다른가요?', acceptedAnswer: { '@type': 'Answer', text: '네. 2026년 9월 기준 서울·경기·인천 일반택시 기본요금은 4,800원(1.6km), 부산 4,800원(2km), 대구·경북 4,500원(1.7km), 대전·광주·울산·전남·제주 4,300원, 그 외 지역은 대체로 4,000원(2.0km) 수준입니다. 전남 22개 시군은 2026년 11~12월 4,800원 인상이 추진 중입니다. 거리요금 단위(예: 서울 131m당 100원)도 지역마다 차이가 있습니다.' } },
      { '@type': 'Question', name: '시외 할증과 심야 할증이 겹치면 어떻게 되나요?', acceptedAnswer: { '@type': 'Answer', text: '택시가 시·군 경계를 벗어나면 시계외 할증 20~30%가 붙고, 이것이 심야 시간대와 겹치면 두 할증이 합산됩니다. 서울 기준 심야 40% + 시외 20%로 최대 60%까지 할증될 수 있습니다.' } },
      { '@type': 'Question', name: '카카오택시와 일반 택시 요금 차이는?', acceptedAnswer: { '@type': 'Answer', text: '카카오T 일반 호출은 추가 요금 없이 미터 요금만 부과됩니다. 다만 카카오T 블루(가맹택시)는 호출료 1,000~2,000원이 추가될 수 있고, 블랙은 별도 요금 체계입니다. 플랫폼에 따라 수요가 몰리는 시간대에 탄력요금이 적용될 수 있습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><TaxiFare />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            택시 요금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            택시 요금 계산기는 지역, 이동 거리와 예상 소요 시간, 탑승 시각을 입력하면 전국 17개 시·도별 요금 체계에 따라 일반·모범·대형 택시의 예상 요금을 계산해 주는 온라인 도구입니다. 지역마다 다른 기본요금과 심야 할증(시간대별 20~40%), 시계외 할증까지 자동으로 반영하여, 택시를 호출하기 전에 요금을 미리 파악하고 교통수단을 합리적으로 선택하는 데 도움을 드립니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            2026년 지역별 택시 요금 요점 (9월 기준)
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-6">
            <li><strong>기본요금:</strong> 서울·경기·인천 4,800원(1.6km), 부산 4,800원(2km), 대구·경북 4,500원(1.7km), 대전·광주·울산·전남·제주 4,300원, 그 외 지역 약 4,000원. <em>전남 22개 시군은 2026년 11~12월 4,800원(1.7km) 인상 추진 중, 대구는 2027년 초 5,200~5,600원 인상안 검토.</em></li>
            <li><strong>심야할증(서울·인천):</strong> 22~04시 적용, 23~02시 40%, 그 외 20%. 경기 30%, 부산 20~30%로 지역별 상이.</li>
            <li><strong>시외(시계외) 할증:</strong> 시·군 경계를 벗어나면 20~30% 가산, 심야와 중복 시 최대 60%.</li>
            <li><strong>모범·대형택시:</strong> 기본 7,000원(3km), 151m당 200원. 모범은 심야할증이 없습니다.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            택시 요금 절약 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>심야 40% 구간 피하기:</strong> 서울·인천은 23시~새벽 2시가 40% 할증 구간입니다. 가능하면 22시 이전 또는 22~23시대에 탑승하면 20%로 낮출 수 있습니다.</li>
            <li><strong>시외 경계 확인:</strong> 시 경계를 넘는 경로는 시외할증이 붙습니다. 경계 안에서 내리거나 지하철·버스와 환승하면 절약됩니다.</li>
            <li><strong>택시 종류 선택:</strong> 근거리는 일반택시, 3~4인 단체는 대형택시가 유리합니다. 모범택시는 심야할증이 없어 심야 장거리에서 오히려 저렴할 수 있습니다.</li>
            <li><strong>앱 호출료 비교:</strong> 카카오T 일반 호출은 미터 요금만 부과되지만 블루·블랙은 호출료가 추가됩니다. 출퇴근 탄력요금도 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
