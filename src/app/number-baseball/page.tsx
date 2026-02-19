import { Metadata } from 'next'
import { Suspense } from 'react'
import NumberBaseball from '@/components/NumberBaseball'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '숫자야구 게임 - 숫자 맞추기 두뇌 게임 | 툴허브',
  description:
    '숫자야구 게임을 온라인에서 무료로 즐기세요. 스트라이크, 볼, 아웃 판정으로 숨겨진 숫자를 추리하는 두뇌 게임입니다.',
  keywords: '숫자야구, 숫자 맞추기, 두뇌 게임, 추리 게임, 온라인 게임',
  openGraph: {
    title: '숫자야구 게임 | 툴허브',
    description: '스트라이크, 볼, 아웃으로 숨겨진 숫자를 맞추는 두뇌 게임',
    url: 'https://toolhub.ai.kr/number-baseball',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '숫자야구',
    description: '숫자 맞추기 두뇌 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/number-baseball',
  },
}

export default function NumberBaseballPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '숫자야구 게임',
    description: '숫자 맞추기 두뇌 게임',
    url: 'https://toolhub.ai.kr/number-baseball',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3~5자리 난이도', '스트라이크/볼/아웃 판정', '힌트 시스템', '통계 추적'],
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
              <NumberBaseball />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
