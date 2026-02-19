import { Metadata } from 'next'
import { Suspense } from 'react'
import Sudoku from '@/components/Sudoku'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '스도쿠 - 숫자 퍼즐 게임 | 툴허브',
  description: '스도쿠 퍼즐을 온라인에서 무료로 즐기세요. 쉬움, 보통, 어려움, 전문가 4단계 난이도와 메모, 힌트, 오류 검사 기능을 제공합니다.',
  keywords: '스도쿠, sudoku, 스도쿠 퍼즐, 숫자 퍼즐, 무료 게임, 온라인 게임, 브라우저 게임',
  openGraph: {
    title: '스도쿠 - 숫자 퍼즐 | 툴허브',
    description: '4단계 난이도 스도쿠! 메모, 힌트, 되돌리기 지원.',
    url: 'https://toolhub.ai.kr/sudoku',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '스도쿠 | 툴허브',
    description: '4단계 난이도 스도쿠를 온라인에서 즐기세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/sudoku' },
}

export default function SudokuPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '스도쿠 퍼즐',
    description: '4단계 난이도 스도쿠 퍼즐 게임. 메모, 힌트, 오류 검사 지원.',
    url: 'https://toolhub.ai.kr/sudoku',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4단계 난이도', '메모 모드', '힌트 기능', '오류 검사', '타이머', '되돌리기'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><Sudoku /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
