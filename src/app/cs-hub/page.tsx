import { Metadata } from 'next'
import { Suspense } from 'react'
import CsHub from '@/components/CsHub'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: 'CS 학습 허브 - 퀴즈·용어·면접·알고리즘 통합 | 툴허브',
  description: 'CS 퀴즈 251문제, 용어 사전 211개, 면접 100문제, 알고리즘 55개, 시각화 10개 — 컴퓨터 과학 학습을 위한 올인원 대시보드.',
  keywords: 'CS 학습, 컴퓨터 과학 학습, CS 공부, 개발자 학습, 알고리즘 학습, CS 면접 준비, 자료구조 공부, 코딩 공부, CS fundamentals, computer science learning',
  openGraph: {
    title: 'CS 학습 허브 - 올인원 CS 학습 플랫폼 | 툴허브',
    description: '퀴즈·용어사전·면접·알고리즘·시각화 통합 CS 학습 대시보드',
    url: 'https://toolhub.ai.kr/cs-hub',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS 학습 허브 - 올인원 CS 학습 플랫폼',
    description: '퀴즈·용어사전·면접·알고리즘·시각화 통합 CS 학습 대시보드',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cs-hub',
  },
}

export default function CsHubPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CS 학습 허브',
    description: 'CS 퀴즈, 용어 사전, 면접 준비, 알고리즘 시각화를 통합한 올인원 CS 학습 플랫폼',
    url: 'https://toolhub.ai.kr/cs-hub',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CS 퀴즈 251문제',
      'CS 용어 사전 211개',
      'CS 면접 100문제',
      '알고리즘 시각화 55개',
      'CS 개념 시각화 10개',
      '학습 진행률 대시보드',
      '학습 로드맵'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CS 학습 허브에서 무엇을 할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CS 퀴즈(251문제), 용어 사전(211개), 기술 면접(100문제), 알고리즘 시각화(55개), CS 개념 시각화(10개) 총 5가지 학습 도구를 한 곳에서 이용할 수 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '어떤 순서로 학습하는 게 좋나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '용어 사전으로 기본 개념을 익히고, CS 시각화로 핵심 원리를 체험한 뒤, 알고리즘 시각화로 심화 학습하세요. 이후 퀴즈로 실력을 검증하고, 면접 준비로 마무리하면 됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '학습 진행률은 어떻게 추적하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '각 도구에서 학습 완료, 북마크, 자기 평가한 내용이 브라우저에 자동 저장됩니다. CS 학습 허브 대시보드에서 전체 진행률을 한눈에 확인할 수 있습니다.'
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
              <CsHub />
              <div className="mt-8">
                <GuideSection namespace="csHub" />
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
