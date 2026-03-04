import { Metadata } from 'next'
import { Suspense } from 'react'
import Solitaire from '@/components/Solitaire'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '카드 솔리테어 - 클래식 카드 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 클론다이크 솔리테어. 드래그 앤 드롭, 되돌리기, 힌트, 자동완성 기능을 지원합니다. 전 세계에서 가장 많이 플레이되는 1인 카드 게임!',
  keywords: '솔리테어, 카드 게임, 클론다이크, solitaire, 온라인 카드 게임, 무료 게임, 브라우저 게임',
  openGraph: {
    title: '카드 솔리테어 - 클래식 카드 게임 | 툴허브',
    description: '클래식 클론다이크 솔리테어를 브라우저에서 무료로 즐기세요!',
    url: 'https://toolhub.ai.kr/solitaire',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '카드 솔리테어',
    description: '클래식 클론다이크 솔리테어 카드 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/solitaire/',
  },
}

export default function SolitairePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '카드 솔리테어',
    description: '클래식 클론다이크 솔리테어 카드 게임',
    url: 'https://toolhub.ai.kr/solitaire',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['드래그 앤 드롭', '되돌리기', '힌트 시스템', '자동완성', '최고 점수 저장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '솔리테어(클론다이크) 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '클론다이크 솔리테어는 52장의 카드로 플레이하는 1인 카드 게임입니다. 7개의 태블로 열에 카드가 배치되며, 각 열의 맨 위 카드만 앞면입니다. 목표는 4개의 파운데이션에 각 문양별로 A부터 K까지 순서대로 카드를 쌓는 것입니다. 태블로에서는 번갈아가는 색상(빨강-검정)으로 내림차순으로 카드를 쌓을 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '솔리테어 게임에서 승리하는 팁은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 뒤집힌 카드가 많은 열을 먼저 공략 ② A와 2는 즉시 파운데이션으로 이동 ③ K가 나올 때까지 빈 열을 만들지 않기 ④ 스톡 카드를 너무 빨리 소진하지 않기 ⑤ 두 가지 같은 수의 카드 중 더 많은 카드를 풀 수 있는 쪽을 선택. 통계적으로 약 80%의 게임이 이론상 승리 가능합니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <Solitaire />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            카드 솔리테어란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            솔리테어(클론다이크)는 52장의 카드를 이용해 혼자 즐기는 클래식 1인 카드 게임입니다. 드래그 앤 드롭, 되돌리기(Undo), 힌트, 자동완성 기능을 갖춘 브라우저 버전으로, 설치 없이 PC와 모바일 모두에서 무료로 즐길 수 있습니다. 통계적으로 약 80%의 게임이 이론상 승리 가능하여 전략적 사고력을 키우는 데도 좋습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            솔리테어 승리 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>뒤집힌 카드 먼저 공략:</strong> 앞면이 가장 많이 보이지 않는 열을 먼저 공략해 뒤집힌 카드를 빨리 열어야 선택지가 넓어집니다.</li>
            <li><strong>A·2 즉시 파운데이션 이동:</strong> A와 2는 발견 즉시 파운데이션으로 옮겨 공간을 확보하세요.</li>
            <li><strong>빈 열을 K 용도로 보존:</strong> 빈 열이 생기면 가능하면 K가 나올 때까지 비워두면 큰 그룹의 카드를 이동할 수 있습니다.</li>
            <li><strong>스톡 덱 아껴 사용:</strong> 스톡 카드를 너무 빨리 소진하면 선택지가 줄어듭니다. 여러 가지 이동 경우의 수를 먼저 살핀 후 스톡을 뒤집으세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
