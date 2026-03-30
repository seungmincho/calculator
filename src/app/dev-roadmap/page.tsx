import { Metadata } from 'next'
import { Suspense } from 'react'
import DevRoadmap from '@/components/DevRoadmap'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '개발자 로드맵 - 프론트엔드·백엔드·풀스택·DevOps | 툴허브',
  description: '프론트엔드, 백엔드, 풀스택, DevOps 4가지 개발자 학습 경로. 120+ 기술 스택, 단계별 로드맵, 진행률 추적.',
  keywords: '개발자 로드맵, 프론트엔드 로드맵, 백엔드 로드맵, 풀스택 로드맵, DevOps 로드맵, 개발자 학습 경로, developer roadmap, frontend roadmap, backend roadmap',
  openGraph: {
    title: '개발자 로드맵 - 4가지 학습 경로 | 툴허브',
    description: '프론트엔드, 백엔드, 풀스택, DevOps 개발자 학습 경로를 단계별로 안내합니다.',
    url: 'https://toolhub.ai.kr/dev-roadmap',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '개발자 로드맵 - 4가지 학습 경로',
    description: '프론트엔드, 백엔드, 풀스택, DevOps 개발자 학습 경로를 단계별로 안내합니다.',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/dev-roadmap' },
}

export default function DevRoadmapPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '개발자 로드맵',
    description: '프론트엔드, 백엔드, 풀스택, DevOps 4가지 개발자 학습 경로 가이드',
    url: 'https://toolhub.ai.kr/dev-roadmap',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4가지 개발 트랙', '120+ 기술 스택', '단계별 학습 경로', '진행률 추적', '필수/선택 기술 구분']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '어떤 트랙을 선택해야 하나요?', acceptedAnswer: { '@type': 'Answer', text: 'UI/UX에 관심이 있다면 프론트엔드, 서버/데이터에 관심이 있다면 백엔드, 둘 다 하고 싶다면 풀스택, 인프라/자동화에 관심이 있다면 DevOps를 선택하세요.' } },
      { '@type': 'Question', name: '모든 기술을 다 배워야 하나요?', acceptedAnswer: { '@type': 'Answer', text: '아닙니다. ★ 필수 기술을 먼저 익히고, 나머지는 필요에 따라 선택적으로 학습하세요. 필수 기술만으로도 충분히 취업할 수 있습니다.' } }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <DevRoadmap />
              <div className="mt-8"><GuideSection namespace="devRoadmap" /></div>
              <div className="mt-8"><RelatedTools /></div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
