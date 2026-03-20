import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'

export const metadata: Metadata = {
  title: '배틀십(해전) | AI 대전 · 온라인 대전 | 툴허브',
  description: '10x10 그리드에 함선을 배치하고 상대 함선을 먼저 침몰시키면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '배틀십',
    'Battleship',
    '해전 게임',
    '온라인 게임',
    '실시간 대전',
    'P2P 게임',
    '2인용 게임',
    '보드게임',
    '전략 게임'
  ],
  openGraph: {
    title: '온라인 배틀십 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 배틀십 대전! 상대 함선을 침몰시키세요!',
    url: 'https://toolhub.ai.kr/battleship',
    type: 'website',
    siteName: '툴허브',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/battleship/'
  }
}

export default function BattleshipPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '배틀쉽 (Battleship)',
    description: '배틀쉽 - AI 대전을 지원하는 해전 전략 게임',
    url: 'https://toolhub.ai.kr/battleship',
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
        name: '배틀쉽 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '배틀쉽은 10×10 격자에 함선을 배치하고 상대 함선 위치를 추측하여 격침시키는 전략 게임입니다. 함선은 5칸(항공모함), 4칸(전함), 3칸(순양함), 3칸(잠수함), 2칸(구축함) 총 5척입니다. 번갈아 한 칸씩 공격하여 명중(Hit) 또는 빗나감(Miss)을 확인하고, 한 함선의 모든 칸을 명중하면 격침(Sunk)됩니다. 상대 함선을 모두 격침하면 승리합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '배틀쉽에서 효과적인 공격 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 체스판 패턴: 격자를 체스판처럼 한 칸 건너 공격하면 2칸 이상 함선을 빠짐없이 발견 ② 명중 후 십자 탐색: Hit 주변 상하좌우를 순서대로 공격하여 함선 방향 파악 ③ 확률 밀도 계산: 남은 함선 크기를 고려하여 가장 가능성 높은 칸 공격 ④ 가장자리보다 중앙 우선: 중앙에 배치 확률이 더 높음 ⑤ 격침된 함선 크기를 기록하여 남은 함선 추정.'
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
          gameKey="battleship"
          icon="🚢"
          name="배틀십 (해전)"
          description="함선을 배치하고 상대 함선을 먼저 모두 침몰시키면 승리"
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            배틀십(해전) 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            배틀십(Battleship)은 10×10 격자에 함선을 배치하고 상대방의 함선 위치를 추측하여 모두 격침시키면 승리하는 클래식 2인 전략 보드게임입니다. AI와 1인 플레이 또는 친구와 실시간 온라인 P2P 대전을 즐길 수 있으며, 쉬움·보통·어려움 세 가지 난이도를 제공합니다. 논리적 추론, 확률적 사고, 상대 심리 파악이 승리의 열쇠인 두뇌 전략 게임입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            배틀십 필승 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>체스판 패턴 공격:</strong> 한 칸씩 건너 공격하면 2칸 이상 함선을 빠짐없이 탐색할 수 있어 효율적으로 위치를 파악할 수 있습니다.</li>
            <li><strong>명중 후 십자 탐색:</strong> Hit(명중) 이후에는 상하좌우 4방향을 순서대로 공격하여 함선 방향을 빠르게 파악하세요.</li>
            <li><strong>함선 배치 전략:</strong> 가장자리와 코너에 함선을 배치하면 상대가 발견하기 어렵고, 불규칙하게 배치할수록 예측이 힘들어집니다.</li>
            <li><strong>남은 함선 추적:</strong> 격침된 함선 크기를 기록해두면 아직 찾아야 할 함선의 크기와 수를 추정하는 데 유리합니다.</li>
            <li><strong>확률 기반 공격:</strong> 남은 함선 크기를 고려하여 가능성이 높은 위치(중앙, 확률 밀도가 높은 칸)를 우선 공격하면 탐색 횟수를 줄일 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
