import { Metadata } from 'next'
import { Suspense } from 'react'
import CsatGrade from '@/components/CsatGrade'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '수능 등급컷 계산기 - 과목별 등급 판정 | 툴허브',
  description: '2026학년도 수능 과목별 원점수를 입력하면 등급을 즉시 확인합니다. 국어, 수학, 영어, 한국사, 탐구 과목별 등급컷 표와 등급 산출 방식을 안내합니다.',
  keywords: '수능 등급컷, 수능 등급 계산기, 수능 등급컷 계산, 2026 수능, 수능 과목별 등급, 영어 등급컷, 수학 등급컷',
  openGraph: {
    title: '수능 등급컷 계산기 | 툴허브',
    description: '2026 수능 과목별 원점수→등급 즉시 확인',
    url: 'https://toolhub.ai.kr/csat-grade/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '수능 등급컷 계산기 | 툴허브',
    description: '수능 과목별 등급 판정 및 등급컷 확인',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/csat-grade/',
  },
}

export default function CsatGradePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수능 등급컷 계산기',
    description: '2026학년도 수능 과목별 등급 판정 계산기',
    url: 'https://toolhub.ai.kr/csat-grade',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '과목별 원점수→등급 변환',
      '영어·한국사 절대평가 등급',
      '등급컷 비교표',
      'URL 공유 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '수능 영어 등급컷은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '수능 영어는 절대평가로 1등급 90점 이상, 2등급 80점 이상, 3등급 70점 이상, 4등급 60점 이상입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '수능 등급은 어떻게 산출되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '상대평가 과목(국어, 수학, 탐구)은 표준점수 기준 상위 누적 비율로 등급을 산출합니다. 1등급 상위 4%, 2등급 상위 11%, 3등급 상위 23% 등입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <CsatGrade />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
