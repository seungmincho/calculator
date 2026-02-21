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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '테트리스 기본 조작법과 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '테트리스는 위에서 떨어지는 7종류의 블록(테트로미노: I, O, T, S, Z, J, L)을 회전·이동시켜 가로줄을 완성하면 줄이 사라지는 퍼즐 게임입니다. 방향키로 좌우 이동, 위 방향키로 회전, 아래로 빠른 낙하합니다. 동시에 여러 줄을 완성하면 더 높은 점수를 얻으며, 4줄 동시 클리어를 \'테트리스\'라고 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '테트리스에서 높은 점수를 내는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① T-스핀: T 블록을 회전시켜 빈 공간에 끼워 넣는 고급 기술로 보너스 점수를 얻습니다 ② 4줄 동시 클리어(테트리스): I 블록용 공간을 한쪽에 비워두고 4줄을 한 번에 제거 ③ 콤보: 연속으로 줄을 제거하면 콤보 보너스 ④ 평평하게 쌓기: 표면을 고르게 유지하여 다양한 블록을 배치할 수 있게 함 ⑤ 다음 블록 미리보기 활용.',
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <Tetris />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
