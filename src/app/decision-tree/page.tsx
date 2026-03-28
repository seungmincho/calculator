import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import DecisionTreeVisualizer from '@/components/DecisionTreeVisualizer'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '의사결정 트리 시각화 - 분류 알고리즘 인터랙티브 학습 | 툴허브',
  description: '의사결정 트리(Decision Tree) 분류 알고리즘을 인터랙티브하게 시각화합니다. 엔트로피, 정보 이득, 지니 계수를 단계별로 확인하고, 데이터를 직접 편집하며 트리 구축 과정을 학습하세요.',
  keywords: '의사결정 트리, decision tree, 분류, 정보 이득, 엔트로피, 지니 계수, 머신러닝, 시각화, 알고리즘',
  openGraph: {
    title: '의사결정 트리 시각화 | 툴허브',
    description: '의사결정 트리 분류 알고리즘을 인터랙티브하게 학습하세요.',
    url: 'https://toolhub.ai.kr/decision-tree',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '의사결정 트리 시각화',
    description: '엔트로피·정보이득·지니계수로 분류 트리 구축 과정 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/decision-tree/',
  },
}

export default function DecisionTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '의사결정 트리 시각화',
    description: '의사결정 트리(Decision Tree) 분류 알고리즘을 인터랙티브하게 시각화합니다. 엔트로피, 정보 이득, 지니 계수를 단계별로 확인하세요.',
    url: 'https://toolhub.ai.kr/decision-tree',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '의사결정 트리 단계별 구축 시각화',
      '엔트로피 / 지니 계수 분할 기준 선택',
      '데이터 테이블 직접 편집',
      '3가지 프리셋 데이터 (날씨/타이타닉/과일)',
      '트리 노드 하이라이트 애니메이션',
      '정확도·깊이·노드수 통계',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '의사결정 트리란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '의사결정 트리(Decision Tree)는 데이터를 특성(feature)에 따라 분할하여 분류하는 지도학습 알고리즘입니다. 나무 구조로 표현되며, 각 내부 노드는 특성에 대한 질문, 각 잎 노드는 분류 결과를 나타냅니다. 직관적이고 해석이 쉬운 것이 장점입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '엔트로피와 지니 계수의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '엔트로피(Entropy)는 정보 이론 기반으로 -Σ p·log₂(p)로 계산하며, 지니 계수(Gini Index)는 1-Σp²로 계산합니다. 엔트로피는 로그 연산으로 순수 노드에 더 민감하고, 지니 계수는 계산이 빠릅니다. 실무에서는 결과 차이가 크지 않아 보통 지니 계수(scikit-learn 기본값)를 사용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '과적합(overfitting)을 방지하려면?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '과적합 방지 방법: (1) 최대 깊이(max_depth) 제한, (2) 최소 샘플 수 설정, (3) 가지치기(pruning), (4) 앙상블 방법(Random Forest, Gradient Boosting) 사용. 이 도구에서는 최대 깊이 슬라이더로 과적합 효과를 직접 확인할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-lime-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <DecisionTreeVisualizer />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
