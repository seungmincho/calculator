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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '스도쿠 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '스도쿠는 9×9 격자에 1-9 숫자를 채우는 퍼즐로, 3가지 규칙을 따릅니다: ① 각 행(가로줄)에 1-9가 한 번씩 ② 각 열(세로줄)에 1-9가 한 번씩 ③ 각 3×3 박스에 1-9가 한 번씩. 정답은 항상 하나뿐이며, 논리적 추론만으로 풀 수 있습니다. 난이도는 주어진 숫자의 개수와 배치에 따라 결정됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '스도쿠 풀이 기본 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 나체 싱글(Naked Single): 한 칸에 들어갈 수 있는 숫자가 하나뿐인 경우 ② 숨은 싱글(Hidden Single): 한 행/열/박스에서 특정 숫자가 한 곳에만 가능한 경우 ③ 후보 제거: 각 빈 칸에 가능한 숫자를 메모하고 하나씩 제거 ④ 나체 쌍/삼중: 두세 칸이 같은 후보만 가지면 다른 칸에서 그 숫자를 제거. 초보자는 나체 싱글과 숨은 싱글만으로도 쉬운 퍼즐을 풀 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><Sudoku /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
