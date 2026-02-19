import { Metadata } from 'next'
import { Suspense } from 'react'
import ContrastChecker from '@/components/ContrastChecker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색상 대비 체커 - WCAG 접근성 검사 | 툴허브',
  description:
    '텍스트와 배경 색상의 WCAG 대비율을 검사하세요. AA/AAA 등급 확인, 접근성 준수 색상 추천, 실시간 미리보기를 제공합니다.',
  keywords: '색상 대비, WCAG, 접근성, 컬러 대비, 대비율 검사, 웹 접근성',
  openGraph: {
    title: '색상 대비 체커 - WCAG 접근성 검사 | 툴허브',
    description: 'WCAG 색상 대비율 검사 및 접근성 준수 확인',
    url: 'https://toolhub.ai.kr/contrast-checker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '색상 대비 체커',
    description: 'WCAG 접근성 색상 대비 검사',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/contrast-checker',
  },
}

export default function ContrastCheckerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '색상 대비 체커',
    description: 'WCAG 접근성 색상 대비율 검사',
    url: 'https://toolhub.ai.kr/contrast-checker',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'WCAG 2.1 대비율 계산',
      'AA/AAA 등급 검사',
      '텍스트 미리보기',
      '접근성 색상 추천',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ContrastChecker />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
