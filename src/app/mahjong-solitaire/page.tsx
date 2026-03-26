import { Metadata } from 'next'
import { Suspense } from 'react'
import MahjongSolitaire from '@/components/MahjongSolitaire'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '마작 솔리테어 - 타일 매칭 퍼즐 | 툴허브',
  description: '마작 솔리테어(상하이)를 온라인에서 무료로 즐기세요. 같은 패를 찾아 짝을 맞추는 클래식 타일 매칭 퍼즐 게임. 힌트, 셔플, 되돌리기 기능 지원.',
  keywords: '마작 솔리테어, 상하이, mahjong solitaire, 타일 매칭, 퍼즐 게임, 무료 게임, 온라인 게임, 브라우저 게임',
  openGraph: {
    title: '마작 솔리테어 - 타일 매칭 퍼즐 | 툴허브',
    description: '같은 패를 찾아 짝을 맞추는 클래식 마작 솔리테어! 힌트, 셔플, 되돌리기 지원.',
    url: 'https://toolhub.ai.kr/mahjong-solitaire',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '마작 솔리테어 | 툴허브',
    description: '같은 패를 찾아 짝을 맞추는 타일 매칭 퍼즐 게임!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/mahjong-solitaire/' },
}

const faqData = [
  {
    question: '마작 솔리테어란 무엇인가요?',
    answer: '마작 솔리테어(상하이)는 피라미드 형태로 쌓인 마작 타일에서 같은 패 2개를 찾아 제거하는 1인용 타일 매칭 퍼즐 게임입니다. 일반 마작(4인 대전)과 달리 혼자 즐기는 퍼즐이며, "자유 타일"(다른 타일에 덮이지 않고 좌 또는 우 가장자리가 열린 타일)만 선택할 수 있습니다. 모든 타일을 제거하면 승리합니다.',
  },
  {
    question: '자유 타일(선택 가능 타일)의 조건은?',
    answer: '자유 타일은 ① 위에 다른 타일이 덮고 있지 않고 ② 왼쪽 또는 오른쪽 중 적어도 한쪽이 비어 있는 타일입니다. 양쪽이 모두 막혀 있거나 위에 타일이 올라가 있으면 선택할 수 없습니다. 위쪽 층 타일을 먼저 제거해야 아래쪽이 열립니다.',
  },
  {
    question: '마작 솔리테어 공략 팁은?',
    answer: '① 높은 층의 타일을 우선 제거하세요. 아래층이 빨리 열립니다. ② 같은 패 4장 중 3장이 보이면 신중하게 선택하세요 — 잘못 매칭하면 막힐 수 있습니다. ③ 힌트 기능으로 가능한 매칭을 확인하세요. ④ 막혔을 때는 셔플로 재배치할 수 있습니다. ⑤ 되돌리기로 실수를 교정하세요.',
  },
]

export default function MahjongSolitairePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '마작 솔리테어 (상하이)',
    description: '같은 패를 찾아 짝을 맞추는 클래식 타일 매칭 퍼즐 게임. 힌트, 셔플, 되돌리기 기능 지원.',
    url: 'https://toolhub.ai.kr/mahjong-solitaire',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    genre: 'Puzzle',
    gamePlatform: 'Web Browser',
    numberOfPlayers: '1',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['클래식 거북이 레이아웃', '144 타일', '힌트 기능', '셔플', '되돌리기', '타이머', '터치 지원'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <MahjongSolitaire />
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
            마작 솔리테어(상하이)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            마작 솔리테어(Mahjong Solitaire, 상하이)는 피라미드 형태로 쌓인 144개의 마작 타일에서 같은 무늬의 패 2개씩 짝을 맞춰 모두 제거하는 1인용 퍼즐 게임입니다.
            1981년 Brodie Lockard가 개발한 이래 전 세계적으로 사랑받는 클래식 퍼즐로, 관찰력과 전략적 사고력을 키우는 데 효과적입니다.
            만수(萬), 통수(筒), 삭수(索) 각 1~9, 바람패(東南西北), 삼원패(中發白), 꽃패와 계절패로 구성된 타일을 사용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            마작 솔리테어 공략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>높은 층 우선:</strong> 위쪽 타일을 먼저 제거하면 아래층이 빨리 열려 선택지가 많아집니다.</li>
            <li><strong>좌우 균형:</strong> 한쪽만 집중 제거하면 반대편이 막힐 수 있으니 균형 있게 진행하세요.</li>
            <li><strong>같은 패 4장 관리:</strong> 4장 중 2장이 서로를 막고 있으면 다른 2장을 먼저 매칭해야 합니다.</li>
            <li><strong>힌트 활용:</strong> 막혔을 때 힌트 버튼으로 가능한 매칭을 확인하면 실수를 줄일 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
