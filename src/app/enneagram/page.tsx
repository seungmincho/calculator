import { Metadata } from 'next'
import { Suspense } from 'react'
import Enneagram from '@/components/Enneagram'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '에니어그램 테스트 - 9가지 성격 유형 분석 | 툴허브',
  description: '36문항으로 에니어그램 9가지 성격 유형을 분석합니다. 레이더 차트로 유형 분포를 확인하고, MBTI와 연계된 성격 분석을 받아보세요. 결과 카드 공유 가능.',
  keywords: '에니어그램 테스트, 에니어그램 검사, 에니어그램 유형, 성격유형 테스트, 에니어그램 무료, 9가지 성격',
  openGraph: {
    title: '에니어그램 테스트 | 툴허브',
    description: '36문항 에니어그램 성격유형 테스트 - 9각형 레이더 차트',
    url: 'https://toolhub.ai.kr/enneagram/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '에니어그램 테스트 | 툴허브',
    description: '나의 에니어그램 유형을 알아보세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/enneagram/',
  },
}

export default function EnneagramPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '에니어그램 테스트는 몇 문항인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '총 36문항(유형별 4문항)으로 구성되며, 5점 척도로 답변합니다. 검사 시간은 약 5~10분입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '에니어그램과 MBTI는 어떤 관계인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '에니어그램은 핵심 동기와 두려움을 기반으로 9가지 유형을 분석하고, MBTI는 인지 기능을 기반으로 16가지 유형을 분석합니다. 서로 보완적인 성격 분석 도구입니다.',
        },
      },
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '에니어그램 테스트',
    description: '36문항 에니어그램 성격유형 분석 - 9가지 유형, 레이더 차트, MBTI 연계',
    url: 'https://toolhub.ai.kr/enneagram',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '36문항 에니어그램 테스트',
      '9가지 성격 유형 분석',
      '9각형 레이더 차트',
      'MBTI 연계 분석',
      '결과 카드 이미지 저장',
      'URL 결과 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <Enneagram />
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
