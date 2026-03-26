import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import SATVisualizer from '@/components/algorithm/visualizers/SATVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: 'SAT 충돌감지 시각화 - 분리축 정리 | 툴허브',
  description: 'SAT(Separating Axis Theorem) 충돌감지 알고리즘을 인터랙티브 시각화로 배우세요. 두 볼록 다각형을 드래그하며 분리축, 투영, 겹침을 단계별로 이해할 수 있습니다.',
  keywords: 'SAT, Separating Axis Theorem, 분리축 정리, 충돌감지, 물리엔진, 게임 개발, 알고리즘',
  openGraph: {
    title: 'SAT 충돌감지 시각화 | 툴허브',
    description: 'SAT 분리축 정리를 인터랙티브하게 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/sat',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SAT 충돌감지 시각화',
    description: '분리축 정리로 두 다각형 충돌 판정',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/sat',
  },
}

export default function SATPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SAT 충돌감지 시각화',
    description: 'SAT(Separating Axis Theorem) 충돌감지 알고리즘 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/sat',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '두 볼록 다각형 드래그 인터랙션',
      '분리축 단계별 시각화',
      '1D 투영 바 표시',
      '충돌/분리 판정 glow 효과',
      'TypeScript 코드 보기',
      '2D/3D 전환',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <SATVisualizer />
            <div className="mt-8">
              <GuideSection namespace="satVisualizer" />
            </div>
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
