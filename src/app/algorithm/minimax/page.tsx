import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import MinimaxVisualizer from '@/components/algorithm/visualizers/MinimaxVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'Minimax 시각화 - 게임 AI 알고리즘 | 툴허브',
  description:
    'Minimax 알고리즘과 알파-베타 가지치기를 틱택토 게임 트리로 학습하세요. 최대화·최소화 전략, 가지치기 효과를 단계별로 시각화합니다.',
  keywords: 'Minimax, 미니맥스, 게임 AI, 알파베타, 가지치기, 틱택토, 게임 트리',
  openGraph: {
    title: 'Minimax 시각화 | 툴허브',
    description: 'Minimax 알고리즘으로 게임 AI 전략을 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/minimax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Minimax 시각화',
    description: '게임 AI 알고리즘 알파-베타 가지치기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/minimax',
  },
}

export default function MinimaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Minimax 게임 AI 시각화',
    description: 'Minimax와 알파-베타 가지치기 게임 트리 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/minimax',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '게임 트리 시각화',
      '알파-베타 가지치기',
      '틱택토 인터랙티브 보드',
      '최대화·최소화 전략',
      '단계별 점수 전파',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <MinimaxVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
