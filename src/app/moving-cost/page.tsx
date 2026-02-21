import { Metadata } from 'next'
import { Suspense } from 'react'
import MovingCost from '@/components/MovingCost'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이사 비용 계산기 - 포장이사/일반이사 견적 | 툴허브',
  description: '이사 비용 계산기 - 평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
  keywords: '이사 비용 계산기, 포장이사 비용, 일반이사 비용, 반포장이사, 이사 견적, 사다리차 비용, 이사비 계산',
  openGraph: {
    title: '이사 비용 계산기 | 툴허브',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용을 계산하세요. 포장이사, 일반이사, 반포장이사 견적 비교.',
    url: 'https://toolhub.ai.kr/moving-cost',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이사 비용 계산기 | 툴허브',
    description: '포장이사, 일반이사, 반포장이사 견적 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/moving-cost',
  },
}

export default function MovingCostPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이사 비용 계산기',
    description: '평수, 이사 유형, 거리, 층수별 이사 비용 견적 계산',
    url: 'https://toolhub.ai.kr/moving-cost',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '포장이사/일반이사/반포장이사 비용 비교',
      '평수별 기본 이사비 계산',
      '거리별 추가비용',
      '층수/엘리베이터 추가비용',
      '에어컨, 피아노 등 추가 서비스',
      '성수기/주말 할증 계산',
      '이사 준비 체크리스트',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '포장이사와 반포장이사의 차이는 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '포장이사는 이사 업체가 짐 포장부터 운반, 정리까지 전 과정을 대행합니다. 반포장이사는 큰 가전/가구는 업체가 맡고, 소형 짐은 본인이 포장합니다. 일반이사(용달)는 운반만 해줍니다. 비용은 포장이사 > 반포장이사 > 일반이사 순이며, 20평 기준 포장이사 약 150~250만 원, 반포장이사 약 80~150만 원, 일반이사 약 40~80만 원 수준입니다.' } },
      { '@type': 'Question', name: '이사 성수기는 언제인가요?', acceptedAnswer: { '@type': 'Answer', text: '이사 성수기는 3~4월(봄 입학/취업), 8~9월(가을 학기), 11~12월(연말 계약 만료)입니다. 성수기에는 이사비가 20~50% 할증됩니다. 주말과 월말도 수요가 많아 비쌉니다. 비용 절약을 위해 비수기(1~2월, 5~7월) 평일 이사를 추천합니다. 손 없는 날(이사 길일)도 수요가 몰려 비용이 올라갑니다.' } },
      { '@type': 'Question', name: '사다리차 비용은 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '사다리차 비용은 층수에 따라 다릅니다. 일반적으로 2~5층은 10~15만 원, 6~10층은 15~25만 원, 11층 이상은 25~40만 원 수준입니다. 엘리베이터가 있으면 사다리차 없이 가능하지만, 대형 가구(침대, 소파)가 엘리베이터에 안 들어가면 사다리차가 필요합니다. 사다리차 진입이 어려운 골목 지형은 추가 비용이 발생할 수 있습니다.' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <MovingCost />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
