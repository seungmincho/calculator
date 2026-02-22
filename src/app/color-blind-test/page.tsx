import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorBlindTest from '@/components/ColorBlindTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색약 테스트 - 색각 이상 검사, 이시하라 테스트 | 툴허브',
  description: '색약 테스트 - 이시하라 색각 검사를 통해 색각 이상 여부를 확인합니다. 적녹색약, 청황색약 판별.',
  keywords: '색약 테스트, 색맹 검사, 색각 이상, color blind test, 이시하라 테스트',
  openGraph: { title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-blind-test' },
}

export default function ColorBlindTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색약 테스트', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', applicationCategory: 'GameApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['색약 검사', '이시하라 테스트', '적녹색약', '결과 분석'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색맹과 색약의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색맹(Color Blindness)은 특정 색상을 전혀 구분하지 못하는 상태이고, 색약(Color Weakness)은 구분은 되지만 정상보다 약하게 인식하는 상태입니다. 가장 흔한 유형: 적록 색약(남성 8%, 여성 0.5%) - 빨강과 초록 구분 어려움. 청황 색약 - 파랑과 노랑 구분 어려움. 전색맹 - 모든 색을 회색으로 인식(매우 드묾). X염색체 연관 유전이므로 남성에게 훨씬 많습니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ColorBlindTest /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
