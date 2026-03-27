import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import RedBlackTreeVisualizer from '@/components/algorithm/visualizers/RedBlackTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '레드-블랙 트리 시각화 - 색상 규칙과 회전으로 균형 유지 | 툴허브',
  description: '레드-블랙 트리의 삽입·삭제·회전·리컬러링을 인터랙티브 시각화로 배우세요. Java TreeMap, C++ std::map의 내부 구조를 단계별 애니메이션으로 이해할 수 있습니다.',
  keywords: '레드-블랙 트리, Red-Black Tree, 자가균형 BST, 회전, 리컬러링, 알고리즘 시각화',
  openGraph: {
    title: '레드-블랙 트리 시각화 | 툴허브',
    description: '레드-블랙 트리 삽입·삭제·회전을 단계별 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/red-black-tree',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '레드-블랙 트리 시각화', description: '레드-블랙 트리 색상 규칙과 회전 단계별 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/red-black-tree' },
}

export default function RedBlackTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '레드-블랙 트리 시각화', description: '레드-블랙 트리 삽입·삭제·회전·리컬러링 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/red-black-tree',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['삽입 + 자동 리컬러링/회전 시각화', '빨강/검정 색상 규칙 표시', '블랙 높이 실시간 계산', '삭제 + Double Black 처리', 'TypeScript 코드 보기'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <RedBlackTreeVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
