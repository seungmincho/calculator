import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '체커(서양 장기) | AI 대전 · 온라인 대전 | 툴허브',
  description: '8x8 보드에서 상대 말을 모두 잡거나 움직이지 못하게 하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '체커',
    'Checkers',
    '서양 장기',
    'Draughts',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임'
  ],
  openGraph: {
    title: '온라인 체커 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 체커 대전! 상대 말을 모두 잡으세요!',
    url: 'https://toolhub.ai.kr/checkers',
    type: 'website'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/checkers/'
  }
}

export default function CheckersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '체커 (Checkers)',
    description: '체커 - AI 대전을 지원하는 클래식 체커 보드게임',
    url: 'https://toolhub.ai.kr/checkers',
    genre: 'Board Game',
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
        name: '체커 게임의 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '체커는 8×8 보드에서 12개씩의 말로 플레이합니다. 말은 대각선으로 한 칸씩 전진하며, 상대 말을 뛰어넘어 잡을 수 있습니다. 연속 점프가 가능하면 반드시 해야 합니다. 상대편 맨 끝 줄에 도달하면 킹이 되어 전후 모두 이동 가능합니다. 상대 말을 모두 잡거나 움직일 수 없게 만들면 승리합니다. 국제 체커는 10×10 보드에 20개 말을 사용합니다.'
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
          gameKey="checkers"
          icon="🏁"
          name="체커 (서양 장기)"
          description="8x8 보드에서 상대 말을 모두 잡거나 움직이지 못하게 하면 승리"
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            체커(서양 장기)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            체커(Checkers, Draughts)는 <strong>8×8 체스판에서 두 사람이 각 12개의 말을 대각선으로 이동하며 상대 말을 모두 잡는</strong> 클래식 전략 보드게임입니다. 간단한 규칙이지만 깊은 전략이 필요하며, 수천 년의 역사를 가진 전 세계적으로 사랑받는 게임입니다. 툴허브의 체커는 AI와 1:1 대전 및 친구와의 온라인 실시간 대전을 모두 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            체커 게임 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>킹 만들기:</strong> 말을 상대편 맨 끝 줄까지 보내 킹을 만들면 전후 이동이 가능해 유리합니다.</li>
            <li><strong>연속 점프:</strong> 여러 말을 연속으로 뛰어넘을 수 있으면 반드시 실행해야 하는 규칙을 활용하세요.</li>
            <li><strong>양쪽 측면 장악:</strong> 보드 가장자리를 먼저 차지하면 상대의 공격 각도를 제한할 수 있습니다.</li>
            <li><strong>교환 전략:</strong> 말 수가 같을 때 유리한 위치를 얻기 위한 교환을 계산하여 전략적으로 활용하세요.</li>
            <li><strong>난이도 선택:</strong> 처음에는 쉬움 난이도로 기본 전략을 익힌 후 어려움에 도전하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
