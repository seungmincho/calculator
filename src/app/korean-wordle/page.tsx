import { Metadata } from 'next'
import { Suspense } from 'react'
import KoreanWordle from '@/components/KoreanWordle'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '한글 워들 - 매일 새로운 한국어 단어 맞추기 게임 | 툴허브',
  description: '한글 워들 - 매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요! 자모 분석 힌트, 통계 추적, 결과 공유 기능을 제공합니다.',
  keywords: '한글 워들, 워들 한국어, Korean Wordle, 단어 맞추기 게임, 한글 게임, 워드 게임',
  openGraph: {
    title: '한글 워들 - 매일 새로운 단어 맞추기 | 툴허브',
    description: '매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요!',
    url: 'https://toolhub.ai.kr/korean-wordle',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '한글 워들 | 툴허브',
    description: '매일 새로운 한국어 단어 맞추기 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/korean-wordle',
  },
}

export default function KoreanWordlePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '한글 워들',
    description: '매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요',
    url: 'https://toolhub.ai.kr/korean-wordle',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['매일 새로운 단어', '자모 힌트', '통계 추적', '결과 공유'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <KoreanWordle />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
