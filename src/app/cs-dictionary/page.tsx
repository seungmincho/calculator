import { Metadata } from 'next'
import { Suspense } from 'react'
import CsDictionary from '@/components/CsDictionary'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'CS 용어 사전 - 200+ 컴퓨터 과학 핵심 용어 | 툴허브',
  description: '자료구조, 알고리즘, 네트워크, 운영체제, 데이터베이스, 보안 등 10개 분야 200+ CS 핵심 용어를 한눈에 정리. 검색, 북마크, 학습 진행률 추적까지.',
  keywords: 'CS 용어 사전, 컴퓨터 과학 용어, 자료구조 용어, 알고리즘 용어, 네트워크 용어, OS 용어, 데이터베이스 용어, 소프트웨어 공학, 보안 용어, 개발자 용어집, CS dictionary, computer science terms',
  openGraph: {
    title: 'CS 용어 사전 - 200+ 핵심 용어 | 툴허브',
    description: '10개 분야 200+ 컴퓨터 과학 핵심 용어를 검색하고 학습하세요. 북마크, 진행률 추적, 관련 퀴즈 연동.',
    url: 'https://toolhub.ai.kr/cs-dictionary',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS 용어 사전 - 200+ 핵심 용어',
    description: '10개 분야 200+ 컴퓨터 과학 핵심 용어를 검색하고 학습하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cs-dictionary',
  },
}

export default function CsDictionaryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CS 용어 사전',
    description: '10개 분야 200+ 컴퓨터 과학 핵심 용어를 검색하고 학습할 수 있는 온라인 사전',
    url: 'https://toolhub.ai.kr/cs-dictionary',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '200+ CS 핵심 용어 수록',
      '10개 분야별 카테고리 분류',
      '난이도별 필터링 (초급/중급/고급)',
      '실시간 검색',
      '학습 진행률 추적',
      '북마크 기능',
      '관련 퀴즈 연동'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CS 용어 사전에는 어떤 분야가 포함되어 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '자료구조, 알고리즘, 네트워크, 운영체제, 데이터베이스, 소프트웨어 아키텍처, 소프트웨어 공학, 보안, 리눅스, 웹 개발 총 10개 분야의 200+ 핵심 용어가 수록되어 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'CS 용어를 효과적으로 학습하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '난이도별 필터를 활용해 초급부터 시작하고, 학습 체크 기능으로 진행률을 추적하세요. 관련 용어를 따라가며 연결 학습하고, CS 퀴즈로 이해도를 테스트하면 효과적입니다.'
        }
      },
      {
        '@type': 'Question',
        name: '비전공자도 이해할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 모든 용어에 쉬운 비유와 실생활 예시를 포함하고 있어 비전공자도 쉽게 이해할 수 있습니다. 초급 난이도부터 차근차근 학습하세요.'
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
              <CsDictionary />
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
