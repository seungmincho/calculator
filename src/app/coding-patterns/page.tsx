import { Metadata } from 'next'
import { Suspense } from 'react'
import CodingPatterns from '@/components/CodingPatterns'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '코딩 테스트 패턴 - 15개 핵심 알고리즘 패턴 | 툴허브',
  description: '투포인터, 슬라이딩 윈도우, BFS/DFS, DP 등 15개 코딩 테스트 핵심 패턴. 접근법, 시간복잡도, 의사코드, 대표 문제까지.',
  keywords: '코딩 테스트 패턴, 알고리즘 패턴, 투포인터, 슬라이딩 윈도우, BFS DFS, 동적 프로그래밍, 이진 탐색, 코딩 인터뷰, 알고리즘 문제 풀이, coding patterns',
  openGraph: {
    title: '코딩 테스트 패턴 - 15개 핵심 패턴 | 툴허브',
    description: '15개 코딩 테스트 핵심 패턴으로 알고리즘 문제 풀이 실력을 높이세요.',
    url: 'https://toolhub.ai.kr/coding-patterns',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '코딩 테스트 패턴 - 15개 핵심 패턴',
    description: '15개 코딩 테스트 핵심 패턴으로 알고리즘 문제 풀이 실력을 높이세요.',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/coding-patterns' },
}

export default function CodingPatternsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '코딩 테스트 패턴',
    description: '15개 코딩 테스트 핵심 알고리즘 패턴 학습 도구',
    url: 'https://toolhub.ai.kr/coding-patterns',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['15개 핵심 패턴', '접근법 단계별 설명', '시간/공간 복잡도', '의사코드', '대표 문제', '학습 진행률 추적']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '코딩 테스트에서 가장 자주 나오는 패턴은?', acceptedAnswer: { '@type': 'Answer', text: '투포인터, 슬라이딩 윈도우, BFS/DFS, 이진 탐색, 동적 프로그래밍이 가장 빈출 패턴입니다. 이 5개를 먼저 익히면 대부분의 문제에 접근할 수 있습니다.' } },
      { '@type': 'Question', name: '패턴을 어떤 순서로 공부해야 하나요?', acceptedAnswer: { '@type': 'Answer', text: '쉬운 패턴(투포인터, 해시맵)부터 시작해 중급(BFS/DFS, 이진 탐색, 슬라이딩 윈도우)을 거쳐 고급(DP, 위상 정렬)으로 진행하세요.' } }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <CodingPatterns />
              <div className="mt-8"><GuideSection namespace="codingPatterns" /></div>
              <div className="mt-8"><RelatedTools /></div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
