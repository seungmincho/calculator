import { Metadata } from 'next'
import { Suspense } from 'react'
import TetrisPageClient from '@/components/TetrisPageClient'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '테트리스 - 클래식 블록 퍼즐 & 2인 대전 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 테트리스 게임. 홀드, 넥스트 미리보기, 고스트 피스, 레벨 시스템은 물론 2인 실시간 대전 모드까지! 공격 라인을 보내 상대를 무너뜨리세요.',
  keywords: '테트리스, 블록 게임, 퍼즐 게임, 온라인 테트리스, 무료 게임, 멀티플레이, 대전',
  openGraph: {
    title: '테트리스 - 클래식 블록 퍼즐 & 2인 대전 | 툴허브',
    description: '브라우저에서 즐기는 무료 클래식 테트리스 & 2인 실시간 대전',
    url: 'https://toolhub.ai.kr/tetris',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '테트리스 - 솔로 & 2인 대전',
    description: '클래식 블록 퍼즐 게임 + 실시간 멀티플레이',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tetris/',
  },
}

export default function TetrisPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '테트리스',
    description: '클래식 블록 퍼즐 게임 & 2인 실시간 대전',
    url: 'https://toolhub.ai.kr/tetris',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
    playMode: ['SinglePlayer', 'MultiPlayer'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['7-bag 랜덤', '홀드', '넥스트 미리보기', '고스트 피스', '레벨 시스템', '2인 실시간 대전', '공격 라인 시스템', '콤보'],
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
        name: '테트리스 2인 대전 모드는 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '멀티플레이 탭을 선택한 후 방을 만들거나 다른 플레이어의 방에 입장하면 실시간 1:1 대전이 시작됩니다. 줄을 클리어하면 상대에게 공격 라인(쓰레기 줄)을 보내며, 4줄 동시 클리어(테트리스)는 4줄을 보냅니다. 연속 콤보로 추가 보너스를 받을 수 있습니다.',
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
        <Breadcrumb />
              <TetrisPageClient />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            테트리스란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            테트리스는 위에서 떨어지는 7가지 블록(테트로미노)을 회전·이동시켜 가로줄을 완성하면 줄이 사라지는 클래식 블록 퍼즐 게임입니다. 1984년 알렉세이 파지트노프가 개발한 이래 전 세계에서 가장 많이 플레이된 게임 중 하나로, 홀드, 넥스트 미리보기, 고스트 피스, 레벨 시스템을 갖춘 완성도 높은 브라우저 버전을 무료로 즐길 수 있습니다. 2인 실시간 대전 모드에서는 줄 클리어로 상대에게 공격 라인을 보내 먼저 게임오버 시키는 쪽이 승리합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            테트리스 고득점 & 대전 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>4줄 동시 클리어(테트리스):</strong> I 블록을 위해 세로 빈 공간을 남겨두고 4줄을 쌓은 뒤 한 번에 클리어하면 최고 점수와 함께 상대에게 4줄 공격을 보냅니다.</li>
            <li><strong>콤보 연쇄:</strong> 연속으로 줄을 클리어하면 콤보 보너스로 추가 공격 라인이 생깁니다. 1줄씩이라도 계속 클리어하는 것이 효과적입니다.</li>
            <li><strong>홀드 기능 전략적 활용:</strong> I 블록이나 필요한 블록을 홀드에 보관해 두면 위기 상황을 타개하거나 테트리스 기회를 만들 수 있습니다.</li>
            <li><strong>평평하게 쌓기:</strong> 표면을 최대한 고르게 유지해야 다음 블록을 배치하기 쉽고, 쓰레기 줄이 들어왔을 때도 대응하기 수월합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
