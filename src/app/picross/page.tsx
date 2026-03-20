import { Metadata } from 'next'
import { Suspense } from 'react'
import Picross from '@/components/Picross'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '네모로직 - 논리 퍼즐 게임 | 툴허브',
  description: '네모로직(피크로스/노노그램)을 온라인에서 무료로 즐기세요. 5x5, 10x10, 15x15 크기와 매일 새로운 오늘의 퍼즐을 제공합니다.',
  keywords: '네모로직, 피크로스, 노노그램, nonogram, picross, 논리 퍼즐, 무료 게임, 온라인 게임, 퍼즐 게임',
  openGraph: {
    title: '네모로직 - 논리 퍼즐 게임 | 툴허브',
    description: '숫자 힌트로 그림을 완성하는 네모로직! 3단계 난이도와 매일 새 퍼즐.',
    url: 'https://toolhub.ai.kr/picross',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '네모로직 | 툴허브',
    description: '숫자 힌트로 그림을 완성하는 논리 퍼즐 게임!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/picross/' },
}

const faqData = [
  {
    question: '네모로직(노노그램)이란 무엇인가요?',
    answer: '네모로직(노노그램, 피크로스)은 격자의 행과 열에 주어진 숫자 힌트를 이용해 칸을 칠하거나 비워서 그림을 완성하는 논리 퍼즐입니다. 예를 들어 "3 1"이라는 힌트는 해당 행에 연속 3칸을 칠하고, 1칸 이상 비운 뒤 1칸을 칠한다는 뜻입니다. 숫자 힌트만으로 논리적 추론을 통해 풀 수 있습니다.',
  },
  {
    question: '네모로직 풀이 전략은?',
    answer: '① 힌트 합계가 행/열 크기에 가까운 줄부터 시작합니다. 예를 들어 10칸 행에 "8" 힌트가 있으면 가운데 6칸은 반드시 칠해집니다. ② 확실히 비어야 하는 칸은 X 표시를 합니다. ③ 여러 행과 열의 겹침을 이용해 확정 칸을 찾습니다. ④ 큰 숫자 힌트부터 처리하면 효율적입니다.',
  },
  {
    question: '오늘의 퍼즐은 매일 바뀌나요?',
    answer: '네, 오늘의 퍼즐은 날짜를 기반으로 생성되므로 매일 자정에 새로운 퍼즐이 제공됩니다. 같은 날에는 누구나 동일한 퍼즐을 풀 수 있어 친구와 클리어 시간을 비교할 수 있습니다. 별도로 "새 퍼즐" 버튼을 눌러 랜덤 퍼즐도 즐길 수 있습니다.',
  },
]

export default function PicrossPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '네모로직 (피크로스/노노그램)',
    description: '숫자 힌트로 그림을 완성하는 논리 퍼즐 게임. 5x5, 10x10, 15x15 크기와 매일 새 퍼즐 제공.',
    url: 'https://toolhub.ai.kr/picross',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    genre: 'Puzzle',
    gamePlatform: 'Web Browser',
    numberOfPlayers: '1',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3단계 난이도 (5x5, 10x10, 15x15)', '오늘의 퍼즐', '타이머', '통계 기록', '결과 공유'],
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
              <Breadcrumb />
              <Picross />
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
            네모로직(노노그램)이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            네모로직(노노그램, 피크로스, Nonogram, Picross)은 격자의 행과 열에 주어진 숫자 힌트를 이용해 칸을 칠하거나 비워서 숨겨진 그림을 완성하는 논리 퍼즐 게임입니다. 1987년 일본에서 처음 고안되어 전 세계적으로 인기를 얻었으며, 스도쿠와 함께 대표적인 논리 퍼즐로 사랑받고 있습니다. 5x5 초급부터 15x15 고급까지 3단계 난이도를 제공하며, 매일 새로운 오늘의 퍼즐도 즐길 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            네모로직 풀이 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>큰 힌트 우선:</strong> 행이나 열의 크기에 가까운 큰 숫자 힌트부터 처리하면 확정 칸을 쉽게 찾을 수 있습니다.</li>
            <li><strong>겹침 기법:</strong> 힌트 블록을 좌측 끝과 우측 끝에 배치했을 때 겹치는 영역은 반드시 칠해지는 칸입니다.</li>
            <li><strong>X 표시 활용:</strong> 확실히 비어야 하는 칸에 X 표시를 하면 나머지 칸의 추론이 쉬워집니다.</li>
            <li><strong>행과 열 교차 확인:</strong> 한 방향으로 막힐 때 교차하는 방향의 힌트를 참고하면 새로운 확정 칸을 찾을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
