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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '지뢰찾기 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '지뢰찾기는 격자에서 지뢰가 없는 칸을 모두 열면 승리하는 퍼즐 게임입니다. 숫자가 적힌 칸은 주변 8칸에 있는 지뢰의 개수를 나타냅니다. 왼쪽 클릭으로 칸을 열고, 오른쪽 클릭으로 깃발을 꽂아 지뢰 위치를 표시합니다. 첫 클릭은 항상 안전하며, 0인 칸을 열면 주변의 안전한 칸이 자동으로 열립니다.',
        },
      },
      {
        '@type': 'Question',
        name: '지뢰찾기 풀이 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 1-1 패턴: 나란한 1이 있으면 옆 칸은 안전 ② 1-2 패턴: 2 옆의 아직 안 연 칸이 지뢰 ③ 코너 분석: 모서리나 가장자리는 인접 칸이 적어 추론이 쉬움 ④ 깃발 활용: 확실한 지뢰에 깃발을 꽂으면 주변 숫자 해석이 쉬워짐 ⑤ 남은 지뢰 수 확인: 전체 지뢰 수에서 깃발 수를 빼서 추정. 확률적 추측이 필요한 상황도 있습니다.',
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
            <I18nWrapper><Minesweeper /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
