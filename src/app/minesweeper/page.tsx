import { Metadata } from 'next'
import { Suspense } from 'react'
import Minesweeper from '@/components/Minesweeper'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '지뢰찾기 - 마인스위퍼 게임 | 툴허브',
  description: '클래식 지뢰찾기(마인스위퍼)를 온라인에서 무료로 즐기세요. 초급, 중급, 고급 3단계 난이도를 지원합니다.',
  keywords: '지뢰찾기, 마인스위퍼, minesweeper, 무료 게임, 온라인 게임, 퍼즐 게임, 브라우저 게임',
  openGraph: {
    title: '지뢰찾기 - 마인스위퍼 | 툴허브',
    description: '클래식 지뢰찾기를 온라인에서 무료로! 3단계 난이도.',
    url: 'https://toolhub.ai.kr/minesweeper',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '지뢰찾기 | 툴허브',
    description: '클래식 마인스위퍼를 온라인에서 즐기세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/minesweeper' },
}

export default function MinesweeperPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '지뢰찾기 (마인스위퍼)',
    description: '클래식 지뢰찾기 게임. 초급/중급/고급 난이도 지원.',
    url: 'https://toolhub.ai.kr/minesweeper',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3단계 난이도', '첫 클릭 안전', '타이머', '깃발 표시', '터치 지원'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><Minesweeper /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
