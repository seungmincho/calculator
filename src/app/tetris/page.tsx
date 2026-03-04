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
    canonical: 'https://toolhub.ai.kr/tetris/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            테트리스란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            테트리스는 위에서 떨어지는 7가지 블록(테트로미노)을 회전·이동시켜 가로줄을 완성하면 줄이 사라지는 클래식 블록 퍼즐 게임입니다. 1984년 알렉세이 파지트노프가 개발한 이래 전 세계에서 가장 많이 플레이된 게임 중 하나로, 홀드, 넥스트 미리보기, 고스트 피스, 레벨 시스템을 갖춘 완성도 높은 브라우저 버전을 무료로 즐길 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            테트리스 고득점 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>4줄 동시 클리어(테트리스):</strong> I 블록을 위해 오른쪽이나 왼쪽에 세로 빈 공간을 남겨두고 4줄을 쌓은 뒤 한 번에 클리어하면 최고 점수를 얻을 수 있습니다.</li>
            <li><strong>홀드 기능 전략적 활용:</strong> I 블록이나 S/Z 블록처럼 상황에 따라 필요한 블록을 홀드에 보관해 두면 위기 상황을 타개하거나 고점 기회를 만들 수 있습니다.</li>
            <li><strong>평평하게 쌓기:</strong> 표면을 최대한 고르게 유지해야 다음 블록을 배치하기 쉽습니다. 산 모양으로 쌓이면 빈 공간이 생겨 줄을 완성하기 어려워집니다.</li>
            <li><strong>T-스핀 기술:</strong> T 블록을 틈새에 회전 삽입하면 좁은 공간에서 줄을 완성하는 고급 기술로 보너스 점수가 부여됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
