import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import LinkedListVisualizer from '@/components/algorithm/visualizers/LinkedListVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '연결 리스트 시각화 - Linked List | 툴허브',
  description: '단일·이중 연결 리스트의 삽입·삭제·검색·뒤집기를 인터랙티브 시각화로 배우세요. 포인터 변경 과정을 단계별 애니메이션으로 확인합니다.',
  keywords: '연결 리스트, Linked List, 단일 연결, 이중 연결, Singly, Doubly, 자료구조, 시각화',
  openGraph: {
    title: '연결 리스트 시각화 | 툴허브',
    description: '연결 리스트 삽입·삭제·뒤집기 포인터 변경 시각화.',
    url: 'https://toolhub.ai.kr/algorithm/linked-list',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '연결 리스트 시각화', description: 'Singly/Doubly Linked List 시각화' },
  alternates: { canonical: 'https://toolhub.ai.kr/algorithm/linked-list' },
}

export default function LinkedListPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연결 리스트 시각화', description: '연결 리스트 삽입·삭제·검색·뒤집기 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/linked-list',
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['단일/이중 연결 리스트', '삽입 (Head/Tail/Index)', '삭제 + 포인터 재연결', '값 검색 애니메이션', '리스트 뒤집기 시각화'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <LinkedListVisualizer />
            <div className="mt-8"><RelatedTools /></div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
