import { Metadata } from 'next'
import { Suspense } from 'react'
import FifteenPuzzle from '@/components/FifteenPuzzle'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '15퍼즐 - 슬라이딩 타일 퍼즐 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 15퍼즐 슬라이딩 타일 게임. 3×3(8퍼즐), 4×4(15퍼즐), 5×5(24퍼즐) 보드 지원. 키보드 방향키 조작, 타이머, 최고 기록 저장 기능을 제공합니다.',
  keywords: '15퍼즐, 슬라이딩 퍼즐, 타일 퍼즐, 8퍼즐, 24퍼즐, 숫자 퍼즐, 브레인 게임, 두뇌 게임, 무료 게임',
  openGraph: {
    title: '15퍼즐 - 슬라이딩 타일 퍼즐 게임 | 툴허브',
    description: '숫자 타일을 슬라이드하여 순서대로 정렬하는 클래식 15퍼즐 게임을 무료로 즐기세요!',
    url: 'https://toolhub.ai.kr/15-puzzle',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '15퍼즐 - 슬라이딩 타일 퍼즐 게임',
    description: '숫자 타일을 슬라이드하여 순서대로 정렬하는 클래식 퍼즐 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/15-puzzle',
  },
}

export default function FifteenPuzzlePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '15퍼즐',
    description: '숫자 타일을 슬라이드하여 순서대로 정렬하는 클래식 슬라이딩 퍼즐 게임',
    url: 'https://toolhub.ai.kr/15-puzzle',
    genre: '퍼즐',
    gamePlatform: '웹 브라우저',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3×3 / 4×4 / 5×5 보드 크기', '키보드 방향키 조작', '타이머 및 이동 횟수 기록', '최고 기록 저장', '풀 수 있는 퍼즐 보장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '15퍼즐이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '15퍼즐은 4×4 격자판에 1부터 15까지의 숫자 타일이 놓여 있고 빈 칸 하나가 있는 슬라이딩 퍼즐 게임입니다. 빈 칸에 인접한 타일을 밀어 넣어 1, 2, 3, …, 15 순서로 정렬하는 것이 목표입니다. 8퍼즐(3×3)과 24퍼즐(5×5) 변형도 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '15퍼즐을 빠르게 푸는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 첫 번째 행과 두 번째 행을 순서대로 완성합니다. ② 마지막 두 행은 열 단위로 완성합니다. ③ 빈 칸을 활용해 타일을 원하는 위치로 이동시킵니다. ④ 방향키를 활용하면 마우스보다 더 빠르게 조작할 수 있습니다. ⑤ 이동 횟수를 최소화하려면 목표 위치에서 가장 멀리 있는 타일부터 처리하세요.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <FifteenPuzzle />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
