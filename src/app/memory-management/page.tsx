import type { Metadata } from 'next'
import { Suspense } from 'react'
import MemoryManagementVisualizer from '@/components/MemoryManagementVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '메모리 관리 시각화 - 페이지 교체 알고리즘 FIFO, LRU, LFU 비교 | 툴허브',
  description: '페이지 교체 알고리즘(FIFO, LRU, LFU, Optimal)을 프레임 테이블로 시각화하고 비교합니다. 단계별 애니메이션, 히트/폴트 통계, Belady의 모순까지 직접 체험하세요.',
  keywords: '페이지 교체 알고리즘, FIFO, LRU, LFU, Optimal, 메모리 관리, 운영체제, 페이지 폴트, 가상 메모리, Belady anomaly, page replacement',
  openGraph: {
    title: '메모리 관리 시각화 - 페이지 교체 알고리즘 비교 | 툴허브',
    description: 'FIFO, LRU, LFU, Optimal 페이지 교체 알고리즘을 프레임 테이블로 시각화하고 비교',
    url: 'https://toolhub.ai.kr/memory-management',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '메모리 관리 시각화 - FIFO, LRU, LFU, Optimal 비교',
    description: '페이지 교체 알고리즘을 프레임 테이블로 시각화하고 비트/폴트 통계를 비교하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/memory-management/',
  },
}

export default function MemoryManagementPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '메모리 관리 시각화',
    description: '페이지 교체 알고리즘(FIFO, LRU, LFU, Optimal)을 프레임 테이블로 시각화하고 비교하는 교육 도구',
    url: 'https://toolhub.ai.kr/memory-management',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'FIFO 페이지 교체 시각화',
      'LRU 페이지 교체 시각화',
      'LFU 페이지 교체 시각화',
      'Optimal (Belady) 페이지 교체 시각화',
      '4개 알고리즘 동시 비교',
      '단계별 애니메이션',
      '히트/폴트 통계',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '페이지 교체 알고리즘이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '페이지 교체 알고리즘은 물리 메모리(프레임)가 가득 찼을 때 새 페이지를 적재하기 위해 어떤 페이지를 내보낼지 결정하는 운영체제의 핵심 알고리즘입니다. FIFO(선입선출), LRU(최근 최소 사용), LFU(최소 빈도 사용), Optimal(미래 참조 기반) 등이 대표적입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Belady의 모순(Belady\'s Anomaly)이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Belady의 모순은 FIFO 알고리즘에서 프레임 수를 늘렸는데 오히려 페이지 폴트가 증가하는 반직관적 현상입니다. 예를 들어 참조열 1,2,3,4,1,2,5,1,2,3,4,5에서 3프레임일 때 9회 폴트, 4프레임일 때 10회 폴트가 발생합니다. LRU와 Optimal은 스택 알고리즘이므로 이 모순이 발생하지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'LRU와 LFU의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LRU(Least Recently Used)는 가장 오래 전에 사용된 페이지를 교체하고, LFU(Least Frequently Used)는 사용 빈도가 가장 낮은 페이지를 교체합니다. LRU는 시간 지역성에 강하고, LFU는 빈도 지역성에 강합니다. 실무에서는 LRU가 구현이 간단하고 성능이 좋아 더 널리 사용됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-sky-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <MemoryManagementVisualizer />
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
