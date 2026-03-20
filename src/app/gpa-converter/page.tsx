import { Metadata } from 'next'
import { Suspense } from 'react'
import GpaConverter from '@/components/GpaConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '학점 변환기 - 4.3/4.5 만점 학점 변환, 백분위 | 툴허브',
  description: '4.3 만점과 4.5 만점 학점을 상호 변환하고, 백분위로 환산합니다. 취업·대학원 지원 시 학점 변환이 필요할 때 사용하세요.',
  keywords: '학점 변환기, 4.3 4.5 변환, 학점 백분위, GPA 변환, 학점 계산기, 대학 학점',
  openGraph: {
    title: '학점 변환기 | 툴허브',
    description: '4.3↔4.5 학점 변환 + 백분위',
    url: 'https://toolhub.ai.kr/gpa-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '학점 변환기 | 툴허브',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gpa-converter/',
  },
}

export default function GpaConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '학점 변환기',
    description: '4.3↔4.5 학점 변환, 백분위 환산.',
    url: 'https://toolhub.ai.kr/gpa-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4.5→4.3 변환', '4.3→4.5 변환', '백분위 환산', '등급 참고표'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '4.5 만점 학점을 4.3으로 어떻게 변환하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '가장 일반적인 방법은 4.5만점 학점에 4.3/4.5를 곱하는 것입니다. 예를 들어 4.0/4.5는 4.0×(4.3/4.5)≈3.82/4.3이 됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <GpaConverter />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
