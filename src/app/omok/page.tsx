import { Metadata } from 'next'
import BoardGamePage from '@/components/BoardGamePage'
import ToolFaq from '@/components/ToolFaq'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '오목 - AI·온라인 대전 | 툴허브',
  description: '19x19 바둑판에서 5개를 먼저 연결하면 승리! AI와 1인 대전 또는 친구와 실시간 온라인 대전을 즐기세요. 쉬움·보통·어려움 난이도 선택 가능.',
  keywords: [
    '오목',
    '온라인 오목',
    '오목 게임',
    '실시간 대전',
    'P2P 게임',
    '바둑판 오목',
    '2인용 게임',
    '보드게임',
    'gomoku',
    'five in a row'
  ],
  openGraph: {
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!',
    url: 'https://toolhub.ai.kr/omok',
    type: 'website',
    siteName: '툴허브',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/omok.png',
        width: 1200,
        height: 630,
        alt: '온라인 오목 게임'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '온라인 오목 - 실시간 대전 게임 | 툴허브',
    description: '친구와 실시간으로 오목 대전을 즐기세요. 19x19 바둑판에서 온라인 오목 게임!',
    images: ['https://toolhub.ai.kr/og/omok.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/omok/'
  }
}

export default function OmokPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '오목 (Gomoku)',
    description: '오목 - AI 대전 및 온라인 대전을 지원하는 오목 게임',
    url: 'https://toolhub.ai.kr/omok/',
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

  const faq = [
    { q: '오목의 기본 규칙은?', a: '오목은 19×19 바둑판에서 흑돌과 백돌을 번갈아 놓아 가로, 세로, 대각선으로 5개를 먼저 연속으로 놓는 사람이 이기는 게임입니다. 프로 규칙(렌주룰)에서는 흑이 선공 이점이 크므로 흑에게 삼삼(3-3), 사사(4-4), 장목(6목 이상) 금수를 적용합니다. 백에게는 금수가 없습니다. 이 게임도 렌주룰에 따라 흑의 삼삼·사사·장목을 금수로 처리하며, 컴퓨터 대전에서는 플레이어가 항상 흑(선공)을 잡습니다.' },
    { q: '오목 AI는 어떻게 작동하나요?', a: '오목 AI는 미니맥스(Minimax) 알고리즘과 알파-베타 가지치기(Alpha-Beta Pruning)를 사용합니다. 미니맥스는 상대가 최선의 수를 둔다고 가정하고 여러 수 앞을 탐색합니다. 알파-베타 가지치기는 불필요한 탐색을 줄여 효율을 높입니다. 난이도에 따라 탐색 깊이를 조절하며, 패턴 인식으로 위협적인 수(열린 4, 열린 3 등)를 우선 평가합니다.' },
    { q: '오목에서 이기는 전략은?', a: '① 열린 3(양쪽이 막히지 않은 3연속)을 만들어 상대를 방어에 몰아넣기 ② 4와 3을 동시에 만드는 사삼(4-3)으로 두 방향 위협하기(흑은 삼삼이 금수이므로 4-3을 노림) ③ 중앙 근처에서 시작하여 영향력 확보 ④ 상대의 열린 3을 즉시 차단하기 ⑤ L자, T자 형태의 복합 위협 구축. 가장 중요한 것은 공격과 방어의 균형이며, 한 수로 공격과 방어를 동시에 하는 수가 좋은 수입니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8 px-4">
        <BoardGamePage
          gameKey="omok"
          name="오목"
          description="19x19 바둑판에서 5개를 먼저 연결하면 승리"
          rules={[
            '나는 흑(선공), AI는 백. 번갈아 교차점에 돌을 하나씩 놓습니다.',
            '가로·세로·대각선으로 5개를 먼저 이으면 승리합니다.',
            '흑은 삼삼·사사·장목(6목 이상) 자리에 둘 수 없습니다(렌주룰).',
          ]}
        />
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            온라인 오목 게임이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            오목은 19×19 바둑판에서 흑돌과 백돌을 번갈아 놓아 가로·세로·대각선 방향으로 5개를 먼저 연속으로 놓으면 이기는 전통 보드게임입니다. 본 도구에서는 쉬움·보통·어려움 세 가지 난이도의 AI와 1인 대전을 즐기거나, 친구와 실시간 P2P 온라인 대전을 할 수 있습니다. 미니맥스 알고리즘 기반 AI가 강력한 수를 구사하여 실력 향상에도 도움이 됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            오목 두는 법
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-body mb-6">
            <li><strong>컴퓨터 대전:</strong> 난이도(쉬움·보통·어려움)를 고르고 시작합니다. 플레이어는 항상 흑(선공)이며, 인터넷 연결 없이도 둘 수 있습니다.</li>
            <li><strong>온라인 대전:</strong> 닉네임을 넣고 방을 만들면 대기 중인 방 목록에 올라가고, 친구가 그 방에 입장하면 바로 실시간 대국이 시작됩니다.</li>
            <li><strong>돌 놓기:</strong> 원하는 교차점을 누르거나, 키보드 화살표로 옮긴 뒤 Enter를 누릅니다. 가로·세로·대각선으로 5개를 먼저 이으면 이깁니다.</li>
            <li><strong>금수와 무르기:</strong> 흑이 삼삼·사사·장목 자리에 두려 하면 금수 안내가 나옵니다. 쉬움 난이도에서는 한 수 무르기를 쓸 수 있습니다.</li>
          </ol>
          <h3 className="text-lg font-semibold text-fg mb-3">
            오목 게임 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>열린 3 만들기:</strong> 양쪽이 막히지 않은 3연속(열린 3)을 만들면 상대가 한 방향만 막을 수 있어 주도권을 잡을 수 있습니다.</li>
            <li><strong>사삼(4-3) 전략:</strong> 4와 3을 동시에 만들면 상대가 한 곳만 막을 수 있어 승리에 가까워집니다. 흑은 삼삼이 금수이므로 4-3을 노리세요.</li>
            <li><strong>중앙 선점:</strong> 초반에 바둑판 중앙 근처에 돌을 놓아 사방으로 뻗을 수 있는 영향력을 확보하세요.</li>
            <li><strong>공수 균형:</strong> 공격에만 집중하다 상대의 열린 4를 방치하면 역전패하기 쉽습니다. 한 수로 공격과 방어를 동시에 해결하는 수를 찾는 것이 핵심입니다.</li>
            <li><strong>기록 확인:</strong> 컴퓨터 대전 결과는 난이도별 승·패·무 통계와 업적으로 기록되니, 쉬움에서 연승한 뒤 보통·어려움에 도전해 보세요.</li>
          </ul>
          <ToolFaq items={faq} />
        </div>
      </section>
      <RelatedTools />
    </>
  )
}
