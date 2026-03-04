import { Metadata } from 'next'
import { Suspense } from 'react'
import Minesweeper from '@/components/Minesweeper'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '지뢰찾기 - 마인스위퍼 게임 | 툴허브',
  description: '클래식 지뢰찾기(마인스위퍼)를 온라인에서 무료로 즐기세요. 초급, 중급, 고급 3단계 난이도를 지원합니다.',
  keywords: '지뢰찾기, 마인스위퍼, minesweeper, 무료 게임, 온라인 게임, 퍼즐 게임, 브라우저 게임',
  openGraph: {
    title: '지뢰찾기 - 마인스위퍼 | 툴허브',
    description: '클래식 지뢰찾기를 온라인에서 무료로! 3단계 난이도.',
    url: 'https://toolhub.ai.kr/minesweeper',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '지뢰찾기 | 툴허브',
    description: '클래식 마인스위퍼를 온라인에서 즐기세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/minesweeper/' },
}

export default function MinesweeperPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '지뢰찾기 (마인스위퍼)',
    description: '클래식 지뢰찾기 게임. 초급/중급/고급 난이도 지원.',
    url: 'https://toolhub.ai.kr/minesweeper',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3단계 난이도', '첫 클릭 안전', '타이머', '깃발 표시', '터치 지원'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '지뢰찾기 기본 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '지뢰찾기는 격자에서 지뢰가 없는 칸을 모두 열면 승리하는 퍼즐 게임입니다. 숫자가 적힌 칸은 주변 8칸에 있는 지뢰의 개수를 나타냅니다. 왼쪽 클릭으로 칸을 열고, 오른쪽 클릭으로 깃발을 꽂아 지뢰 위치를 표시합니다. 첫 클릭은 항상 안전하며, 0인 칸을 열면 주변의 안전한 칸이 자동으로 열립니다.',
        },
      },
      {
        '@type': 'Question',
        name: '지뢰찾기 풀이 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 1-1 패턴: 나란한 1이 있으면 옆 칸은 안전 ② 1-2 패턴: 2 옆의 아직 안 연 칸이 지뢰 ③ 코너 분석: 모서리나 가장자리는 인접 칸이 적어 추론이 쉬움 ④ 깃발 활용: 확실한 지뢰에 깃발을 꽂으면 주변 숫자 해석이 쉬워짐 ⑤ 남은 지뢰 수 확인: 전체 지뢰 수에서 깃발 수를 빼서 추정. 확률적 추측이 필요한 상황도 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><Minesweeper /></I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              지뢰찾기(마인스위퍼)란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              지뢰찾기(마인스위퍼, Minesweeper)는 격자 위의 숫자 힌트를 이용해 지뢰 위치를 추론하고 지뢰가 없는 칸을 모두 열면 승리하는 클래식 퍼즐 게임입니다. 1990년대 윈도우 기본 게임으로 큰 인기를 끌었으며, 논리적 추론 능력과 집중력을 키우는 데 효과적입니다. 초급(9x9, 지뢰 10개)부터 고급(16x30, 지뢰 99개)까지 3단계 난이도를 제공합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              지뢰찾기 공략 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>숫자 해석:</strong> 숫자는 인접한 8칸 중 지뢰 개수를 의미합니다. '1'이 적힌 칸 주변에 아직 안 열린 칸이 하나뿐이라면 그곳이 지뢰입니다.</li>
              <li><strong>깃발 활용:</strong> 확실한 지뢰 위치에 오른쪽 클릭으로 깃발을 꽂으면 주변 숫자를 해석하기 쉬워집니다.</li>
              <li><strong>코너부터 시작:</strong> 첫 클릭은 코너나 가장자리부터 시작하면 안전한 칸이 한 번에 많이 열릴 가능성이 높습니다.</li>
              <li><strong>1-2 패턴:</strong> 가장자리에서 1-2가 나란히 놓인 경우 2 옆의 미개방 칸이 지뢰인 패턴을 익혀두면 빠른 진행이 가능합니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
