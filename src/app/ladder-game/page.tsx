import { Metadata } from 'next'
import LadderGame from '@/components/LadderGame'

export const metadata: Metadata = {
  title: '사다리 타기 - 순서·결정 게임 | 툴허브',
  description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기 등 다양한 상황에서 공정하게 결정하세요.',
  keywords: [
    '사다리 타기',
    '사다리 게임',
    '온라인 사다리',
    '순서 정하기',
    '벌칙 정하기',
    '팀 나누기',
    '랜덤 선택',
    '공정한 선택',
    '사다리타기 온라인',
    '사다리게임 만들기',
    '결정 도구',
    '선택 게임',
    '그룹 게임',
    '파티 게임',
    '모임 게임'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '사다리 타기 게임 | 온라인 사다리 게임, 순서 정하기',
    description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기 등 다양한 상황에서 공정하게 결정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/ladder-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '사다리 타기 게임 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사다리 타기 게임 | 온라인 사다리 게임, 순서 정하기',
    description: '친구들과 함께 즐기는 온라인 사다리 타기 게임! 순서 정하기, 벌칙 정하기, 팀 나누기.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ladder-game/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LadderGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '사다리타기',
    description: '사다리타기 - 온라인 사다리 게임으로 결정을 내려보세요',
    url: 'https://toolhub.ai.kr/ladder-game',
    genre: 'Party Game',
    gamePlatform: 'Web Browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 10 },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사다리타기의 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사다리타기는 수직선과 수평 가로선으로 구성됩니다. 위에서 출발하여 아래로 내려가다가 가로선을 만나면 반드시 옆으로 이동해야 합니다. 수학적으로 사다리타기는 순열(permutation)을 표현하며, 가로선의 배치에 따라 1:1 대응이 보장됩니다. 즉, 각 출발점은 반드시 하나의 도착점에 연결됩니다. 한국에서는 술래 정하기, 팀 배정, 벌칙 정하기 등에 널리 사용됩니다.'
        }
      }
    ]
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <LadderGame />
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              온라인 사다리 타기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              사다리 타기는 수직선과 가로선으로 구성된 공정한 선택 도구로, 참가자 수만큼 세로선을 만들고 무작위 가로선으로 결과를 결정합니다. 순서 정하기, 벌칙 정하기, 팀 나누기, 업무 분배 등 다양한 상황에서 편리하게 활용할 수 있습니다. 툴허브 사다리 타기는 참가자 이름과 결과를 자유롭게 입력할 수 있어 모임, 회식, 학교 등 어디서든 바로 사용 가능합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              사다리 타기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>순서 정하기:</strong> 발표 순서, 청소 당번, 주문 순서 등 공정한 배정이 필요할 때 사용하세요.</li>
              <li><strong>벌칙 정하기:</strong> 게임 패자 벌칙, 회식 계산 담당 등을 투명하게 결정할 수 있습니다.</li>
              <li><strong>팀 나누기:</strong> 스포츠 팀, 모둠 구성 등 균형 잡힌 팀 배정에 활용합니다.</li>
              <li><strong>공정성 보장:</strong> 수학적으로 모든 참가자에게 동일한 확률이 보장되어 투명한 결정이 가능합니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}