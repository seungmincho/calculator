import { Metadata } from 'next'
import { Suspense } from 'react'
import Tetris from '@/components/Tetris'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '테트리스 - 클래식 블록 퍼즐 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 테트리스 게임. 홀드, 넥스트 미리보기, 고스트 피스, 레벨 시스템까지 클래식 테트리스의 모든 기능을 제공합니다.',
  keywords: '테트리스, 블록 게임, 퍼즐 게임, 온라인 테트리스, 무료 게임',
  openGraph: {
    title: '테트리스 - 클래식 블록 퍼즐 게임 | 툴허브',
    description: '브라우저에서 즐기는 무료 클래식 테트리스',
    url: 'https://toolhub.ai.kr/tetris',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '테트리스',
    description: '클래식 블록 퍼즐 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tetris',
  },
}

export default function TetrisPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '테트리스',
    description: '클래식 블록 퍼즐 게임',
    url: 'https://toolhub.ai.kr/tetris',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['7-bag 랜덤', '홀드', '넥스트 미리보기', '고스트 피스', '레벨 시스템'],
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
              <Tetris />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
