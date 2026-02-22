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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한국어 워들 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국어 워들은 숨겨진 한글 단어를 6번의 시도 안에 맞추는 워드 퍼즐입니다. 각 시도 후 색상 힌트를 받습니다: 초록색은 해당 자리에 정확한 글자, 노란색은 단어에 포함되지만 위치가 다른 글자, 회색은 단어에 없는 글자입니다. 한글의 특성상 자음과 모음을 분리하여 힌트를 제공하므로 영어 워들보다 복잡하고 전략적입니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <KoreanWordle />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
