import { Metadata } from 'next'
import { Suspense } from 'react'
import MbtiCompatibility from '@/components/MbtiCompatibility'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'MBTI 궁합 분석 - 16×16 궁합표 남녀 상세 분석 | 툴허브',
  description: 'MBTI 유형별 연애 궁합을 상세히 분석합니다. 16×16 궁합 매트릭스, 남녀 관점별 첫인상, 연애 장점, 갈등 포인트, 극복 방법까지.',
  keywords: 'MBTI 궁합, MBTI 연애궁합, MBTI 궁합표, MBTI 호환성, MBTI 커플, MBTI 궁합 분석',
  openGraph: {
    title: 'MBTI 궁합 분석 16×16 | 툴허브',
    description: 'MBTI 유형별 연애 궁합 분석. 남녀 관점별 첫인상, 연애 장점, 갈등 포인트, 극복 방법까지 상세 분석',
    url: 'https://toolhub.ai.kr/mbti-compatibility',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MBTI 궁합 분석 | 툴허브',
    description: 'MBTI 유형별 연애 궁합을 상세히 분석합니다',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/mbti-compatibility',
  },
}

export default function MbtiCompatibilityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MBTI 궁합 분석',
    description: 'MBTI 유형별 연애 궁합 분석 - 16×16 궁합 매트릭스, 남녀 관점별 첫인상, 연애 장점, 갈등 포인트, 극복 방법',
    url: 'https://toolhub.ai.kr/mbti-compatibility',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '16×16 MBTI 궁합 매트릭스',
      '남녀 관점별 상세 분석',
      '첫인상 / 만남 초기 분석',
      '연애 중 장점 분석',
      '갈등 포인트 분석',
      '극복 방법 및 조언',
      '유형 프로필 상세 보기',
      'URL 공유 기능',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <MbtiCompatibility />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
