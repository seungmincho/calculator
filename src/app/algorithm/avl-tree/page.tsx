import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import AVLTreeVisualizer from '@/components/algorithm/visualizers/AVLTreeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'AVL 트리 시각화 - 자가 균형 이진탐색트리 | 툴허브',
  description: 'AVL 트리의 삽입·삭제·회전(LL/RR/LR/RL)을 인터랙티브 시각화로 배우세요. 균형 인수와 높이 변화를 단계별 애니메이션으로 직관적으로 이해할 수 있습니다.',
  keywords: 'AVL 트리, AVL Tree, 자가 균형 BST, 회전, LL, RR, LR, RL, 알고리즘 시각화',
  openGraph: {
    title: 'AVL 트리 시각화 | 툴허브',
    description: 'AVL 트리 삽입·삭제·회전을 단계별 애니메이션으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/avl-tree',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'AVL 트리 시각화', description: 'AVL 트리 회전 LL/RR/LR/RL 단계별 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/avl-tree' },
}

export default function AVLTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: 'AVL 트리 시각화', description: 'AVL 트리 삽입·삭제·회전 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/avl-tree',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['AVL 삽입 + 자동 회전 시각화', 'LL/RR/LR/RL 회전 타입 표시', '균형 인수(BF) 실시간 계산', '높이 변화 추적', 'TypeScript 코드 보기'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <AVLTreeVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
