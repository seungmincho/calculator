import { Metadata } from 'next'
import { Suspense } from 'react'
import GradeCalculator from '@/components/GradeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '석차/등급 계산기 - 내신 등급·백분위 계산 | 툴허브',
  description: '석차와 응시자 수로 내신 등급(9등급제), 백분위를 자동 계산합니다. 등급컷과 현재 위치를 한눈에 확인하세요.',
  keywords: '석차 등급 계산기, 내신 등급, 9등급제, 백분위 계산, 등급컷, 석차 백분위, 고교 등급',
  openGraph: { title: '석차/등급 계산기 | 툴허브', description: '내신 등급·백분위 자동 계산', url: 'https://toolhub.ai.kr/grade-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '석차/등급 계산기 | 툴허브' },
  alternates: { canonical: 'https://toolhub.ai.kr/grade-calculator/' },
}

export default function GradeCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '석차/등급 계산기', description: '석차·백분위·내신등급 자동 계산.', url: 'https://toolhub.ai.kr/grade-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['9등급제 등급 산출', '백분위 계산', '등급컷 표시', '위치 시각화'] }
  const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: '내신 9등급제란?', acceptedAnswer: { '@type': 'Answer', text: '한국 고등학교 내신 등급은 9등급제로, 1등급은 상위 4%, 2등급은 상위 11%, 3등급은 상위 23%까지입니다. 석차 백분율에 따라 등급이 결정됩니다.' } },
  ]}

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper><GradeCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
