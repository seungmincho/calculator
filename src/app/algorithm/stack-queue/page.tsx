import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import StackQueueVisualizer from '@/components/algorithm/visualizers/StackQueueVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '스택 & 큐 시각화 - LIFO와 FIFO 자료구조 | 툴허브',
  description:
    '스택(Stack)과 큐(Queue)의 동작 원리를 인터랙티브하게 학습하세요. Push/Pop/Enqueue/Dequeue를 직접 조작하며 LIFO와 FIFO의 차이를 직관적으로 이해합니다.',
  keywords: '스택, 큐, Stack, Queue, LIFO, FIFO, 자료구조, 알고리즘, 시각화, 교육',
  openGraph: {
    title: '스택 & 큐 시각화 | 툴허브',
    description: '스택과 큐를 직접 조작하며 LIFO/FIFO를 시각적으로 학습하세요.',
    url: 'https://toolhub.ai.kr/algorithm/stack-queue',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '스택 & 큐 시각화',
    description: 'LIFO/FIFO 자료구조 인터랙티브 교육 도구',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/stack-queue',
  },
}

export default function StackQueuePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '스택 & 큐 시각화',
    description: '스택(Stack)과 큐(Queue) 자료구조 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/stack-queue',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '스택 Push/Pop 시각화',
      '큐 Enqueue/Dequeue 시각화',
      'LIFO vs FIFO 직관적 비교',
      '자동 데모 & 단계별 재생',
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
            <StackQueueVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
