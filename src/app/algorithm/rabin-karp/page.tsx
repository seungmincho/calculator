import { Metadata } from 'next'
import { Suspense } from 'react'
import AlgorithmLayout from '@/components/algorithm/AlgorithmLayout'
import RabinKarpVisualizer from '@/components/algorithm/visualizers/RabinKarpVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '라빈-카프 패턴 매칭 시각화 - 롤링 해시 문자열 검색 | 툴허브',
  description: '라빈-카프(Rabin-Karp) 알고리즘의 롤링 해시 기반 문자열 패턴 매칭을 시각화합니다. 해시 충돌, 거짓 양성, 다중 패턴 검색 원리를 단계별로 학습하세요.',
  keywords: 'Rabin-Karp, 라빈카프, 롤링 해시, 패턴 매칭, 문자열 검색, 해시 충돌, 알고리즘 시각화',
  openGraph: {
    title: '라빈-카프 패턴 매칭 시각화 | 툴허브',
    description: '롤링 해시 기반 문자열 패턴 매칭을 단계별로 배우세요.',
    url: 'https://toolhub.ai.kr/algorithm/rabin-karp',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '라빈-카프 패턴 매칭 시각화',
    description: '롤링 해시 + 문자열 검색 단계별 시각화',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/algorithm/rabin-karp',
  },
}

export default function RabinKarpPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '라빈-카프 패턴 매칭 시각화',
    description: '롤링 해시를 활용한 문자열 패턴 매칭 인터랙티브 교육 도구',
    url: 'https://toolhub.ai.kr/algorithm/rabin-karp',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '롤링 해시(rolling hash) 계산 시각화',
      '슬라이딩 윈도우 해시 비교 애니메이션',
      '해시 충돌(거짓 양성) 감지 표시',
      '해시 베이스/모듈러 파라미터 조정',
      '4가지 프리셋 텍스트-패턴 쌍',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <I18nWrapper>
          <AlgorithmLayout>
            <Breadcrumb />
            <RabinKarpVisualizer />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </AlgorithmLayout>
        </I18nWrapper>
      </Suspense>
    </>
  )
}
