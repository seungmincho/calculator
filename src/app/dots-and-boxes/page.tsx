import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '도트앤박스(점과 상자) | AI 대전 · 온라인 대전 | 툴허브',
  description: '점을 연결해 상자를 완성하면 점수 획득! 더 많은 상자를 차지하면 승리. AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '도트앤박스',
    'Dots and Boxes',
    '점과 상자',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    '전략 게임'
  ],
  openGraph: {
    title: '온라인 도트앤박스 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 도트앤박스 대전! 더 많은 상자를 차지하세요!',
    url: 'https://toolhub.ai.kr/dots-and-boxes',
    type: 'website'
    siteName: '툴허브',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dots-and-boxes/'
  }
}

export default function DotsAndBoxesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '점과선 (Dots and Boxes)',
    description: '점과선 - AI 대전을 지원하는 점잇기 전략 게임',
    url: 'https://toolhub.ai.kr/dots-and-boxes',
    genre: 'Strategy Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any',
    applicationCategory: 'GameApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 2
    }
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '점과선 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '점과선(Dots and Boxes)은 격자의 점 사이에 선을 그어 사각형을 완성하는 전략 게임입니다. 두 명이 번갈아 한 변씩 그리며, 사각형을 완성하면 자기 것이 되고 한 번 더 플레이합니다. 게임이 끝나면 더 많은 사각형을 차지한 사람이 승리합니다. 핵심 전략: 긴 체인(연속된 사각형)을 상대에게 양보하지 않고, 이중 거래(double-dealing)로 체인의 마지막 2개를 양보하여 다음 체인의 주도권을 가져오는 것입니다.'
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <BoardGamePage
          gameKey="dotsandboxes"
          icon="📦"
          name="도트앤박스 (점과 상자)"
          description="점을 연결해 더 많은 상자를 완성하면 승리"
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            도트앤박스(점과 상자)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            도트앤박스(Dots and Boxes, 점과 상자)는 격자 점 사이에 선을 그어 사각형을 완성하는 전략 보드게임입니다. 두 플레이어가 번갈아 한 변씩 그리며, 사각형 네 변을 모두 채운 플레이어가 점수를 얻고 한 번 더 플레이합니다. AI 대전(쉬움·보통·어려움)과 온라인 실시간 대전을 모두 지원하며, 단순해 보이지만 깊은 전략이 숨어있는 고전 게임입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            도트앤박스 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>체인 전략:</strong> 연속된 사각형이 이어진 긴 체인은 마지막 두 개를 제외하고 상대에게 양보하여(이중 거래) 다음 체인의 첫 타자를 차지하는 것이 고수 전략입니다.</li>
            <li><strong>세 변 완성 피하기:</strong> 상대방에게 네 번째 변만 그으면 점수를 줄 수 있는 세 변짜리 사각형을 만들지 마세요. 최대한 늦게 만드는 것이 유리합니다.</li>
            <li><strong>초반 중앙 차단:</strong> 게임 초반에는 서로 안전한 변을 선택하는 단계입니다. 중앙 쪽보다 모서리에서 선을 그어 주도권을 확보하세요.</li>
            <li><strong>그리드 크기 선택:</strong> 초보자는 3×3(9개 상자), 고수는 5×5(25개 상자)로 즐겨보세요. 크기가 클수록 체인 전략이 더 중요해집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
