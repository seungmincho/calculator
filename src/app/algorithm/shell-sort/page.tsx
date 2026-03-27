import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import ShellSortVisualizer from '@/components/algorithm/visualizers/ShellSortVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '셸정렬 시각화 - Gap Sequence 정렬 | 툴허브',
  description:
    '셸정렬(Shell Sort)을 막대 차트와 갭 아크로 시각화합니다. Shell/Knuth/Hibbard 갭 수열을 비교하며 삽입정렬 개선 원리를 학습합니다.',
  keywords: '셸정렬, Shell Sort, 갭 수열, 정렬 알고리즘, Knuth, 시각화',
  openGraph: {
    title: '셸정렬 시각화 | 툴허브',
    description: '셸정렬을 갭 수열별로 시각적으로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/shell-sort',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '셸정렬 시각화',
    description: '정렬 알고리즘 단계별 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/shell-sort',
  },
}

export default function ShellSortPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '셸정렬 시각화',
    description: '셸정렬 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/shell-sort',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '막대 차트 정렬 애니메이션',
      '갭 아크 시각화',
      'Shell/Knuth/Hibbard 갭 수열 선택',
      '단계별 코드 하이라이팅',
      '비교·스왑 통계',
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
            <ShellSortVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
