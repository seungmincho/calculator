import { Metadata } from 'next'
import { Suspense } from 'react'
import AverageCalculator from '@/components/AverageCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '평균 계산기 - 산술·가중·기하·조화 평균 | 툴허브',
  description: '산술평균, 가중평균, 기하평균, 조화평균을 한번에 계산합니다. 분산, 표준편차, 중앙값 등 기초 통계도 함께 확인하세요.',
  keywords: '평균 계산기, 산술평균, 가중평균, 기하평균, 조화평균, 표준편차, 분산, 중앙값',
  openGraph: { title: '평균 계산기 | 툴허브', description: '4종 평균 + 기초 통계', url: 'https://toolhub.ai.kr/average-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '평균 계산기 | 툴허브' },
  alternates: { canonical: 'https://toolhub.ai.kr/average-calculator/' },
}

export default function AverageCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '평균 계산기', description: '산술·가중·기하·조화 4종 평균 + 기초 통계.', url: 'https://toolhub.ai.kr/average-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['산술평균', '가중평균', '기하평균', '조화평균', '분산·표준편차', '중앙값'] }
  const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: '산술평균과 가중평균의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '산술평균은 모든 값을 동일하게 더해 개수로 나눕니다. 가중평균은 각 값에 가중치를 곱한 합을 가중치 합으로 나눠, 중요도가 다른 데이터에 적합합니다.' } },
    { '@type': 'Question', name: '기하평균은 언제 사용하나요?', acceptedAnswer: { '@type': 'Answer', text: '기하평균은 성장률, 수익률 등 비율 데이터의 평균을 구할 때 사용합니다. 예를 들어 3년간 수익률이 10%, 20%, -5%일 때 기하평균으로 연평균 수익률을 구합니다.' } },
  ]}

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper><AverageCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
