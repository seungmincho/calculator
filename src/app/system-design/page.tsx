import { Metadata } from 'next'
import { Suspense } from 'react'
import SystemDesign from '@/components/SystemDesign'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '시스템 디자인 면접 - 10개 설계 문제와 아키텍처 | 툴허브',
  description: 'URL 단축기, 채팅 시스템, 뉴스피드 등 10개 시스템 설계 면접 문제. 요구사항 분석, 아키텍처 다이어그램, 규모 추정, 확장성까지.',
  keywords: '시스템 디자인 면접, system design interview, 시스템 설계, URL 단축기 설계, 채팅 시스템 설계, 뉴스피드 설계, 대규모 시스템, 아키텍처 면접, 기술 면접 시스템 디자인',
  openGraph: {
    title: '시스템 디자인 면접 - 10개 설계 문제 | 툴허브',
    description: '10개 클래식 시스템 설계 문제와 아키텍처 해설로 면접 완벽 대비.',
    url: 'https://toolhub.ai.kr/system-design',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '시스템 디자인 면접 - 10개 설계 문제',
    description: '10개 클래식 시스템 설계 문제와 아키텍처 해설로 면접 완벽 대비.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/system-design',
  },
}

export default function SystemDesignPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '시스템 디자인 면접 준비',
    description: '10개 시스템 설계 면접 문제와 아키텍처 해설을 제공하는 면접 준비 도구',
    url: 'https://toolhub.ai.kr/system-design',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['10개 시스템 설계 문제', '아키텍처 다이어그램', '요구사항 분석', '규모 추정', '확장성 고려사항', '면접 팁', '연습 모드']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '시스템 디자인 면접은 어떤 직무에서 보나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주로 백엔드, 풀스택, 인프라/DevOps 엔지니어 면접에서 출제됩니다. 경력 3년 이상 시니어 포지션에서 필수적이며, 일부 기업은 주니어에게도 기본적인 설계 질문을 합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '시스템 디자인 면접을 효과적으로 준비하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '요구사항 분석 → 규모 추정 → 고수준 설계 → 심화 주제 순서로 연습하세요. 연습 모드를 활용해 단계별로 답변을 구성하는 연습을 하면 실전에서 체계적으로 답할 수 있습니다.'
        }
      }
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
              <SystemDesign />
              <div className="mt-8">
                <GuideSection namespace="systemDesign" />
              </div>
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
