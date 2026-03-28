import { Metadata } from 'next'
import { Suspense } from 'react'
import NeuralNetworkVisualizer from '@/components/NeuralNetworkVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '신경망 시각화 - 순전파·역전파 인터랙티브 학습 | 툴허브',
  description: '인공 신경망의 순전파·역전파 과정을 뉴런 단위로 시각화합니다. 활성화 함수(Sigmoid, ReLU, Tanh), 가중치 업데이트, 경사하강법을 인터랙티브하게 학습하세요.',
  keywords: '신경망 시각화, 순전파, 역전파, 딥러닝, 뉴런, 활성화 함수, 가중치, 인공신경망, neural network',
  openGraph: {
    title: '신경망 시각화 - 순전파·역전파 인터랙티브 학습 | 툴허브',
    description: '인공 신경망의 순전파·역전파 과정을 뉴런 단위로 시각화하며 딥러닝 원리를 이해하세요.',
    url: 'https://toolhub.ai.kr/neural-network',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '신경망 시각화 | 툴허브',
    description: '순전파·역전파를 뉴런 단위로 시각화하는 인터랙티브 학습 도구',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/neural-network/',
  },
}

export default function NeuralNetworkPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '신경망 시각화',
    description: '인공 신경망의 순전파·역전파 과정을 뉴런 단위로 시각화하는 인터랙티브 학습 도구',
    url: 'https://toolhub.ai.kr/neural-network',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '신경망 구조 시각적 구성',
      '순전파 애니메이션',
      '역전파 경사 계산 시각화',
      'Sigmoid / ReLU / Tanh 활성화 함수',
      'XOR / AND / 분류 프리셋',
      'MSE 손실 차트',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '신경망이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인공 신경망(Artificial Neural Network)은 인간 뇌의 뉴런 구조를 모방한 머신러닝 모델입니다. 입력층, 은닉층, 출력층으로 구성되며, 각 뉴런은 가중치와 편향을 가지고 활성화 함수를 통해 신호를 전달합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '순전파와 역전파의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '순전파(Forward Propagation)는 입력 데이터를 네트워크에 통과시켜 출력을 계산하는 과정이고, 역전파(Backpropagation)는 출력의 오차를 이용해 각 가중치의 기울기를 계산하고 업데이트하는 학습 과정입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '활성화 함수는 왜 필요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '활성화 함수는 신경망에 비선형성을 부여합니다. 활성화 함수 없이는 아무리 많은 층을 쌓아도 단순 선형 변환에 불과하여 XOR 같은 비선형 문제를 풀 수 없습니다. Sigmoid, ReLU, Tanh 등이 대표적입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <NeuralNetworkVisualizer />
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
