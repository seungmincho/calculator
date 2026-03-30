import { Metadata } from 'next'
import { Suspense } from 'react'
import CsInterview from '@/components/CsInterview'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: 'CS 기술 면접 - 10분야 100문제 모범 답안 | 툴허브',
  description: '자료구조, 알고리즘, 네트워크, OS, DB 등 10개 분야 100개 기술 면접 질문과 모범 답안. 연습 모드로 실전 대비, 핵심 포인트와 꼬리 질문까지.',
  keywords: 'CS 기술 면접, 개발자 면접 질문, 자료구조 면접, 알고리즘 면접, 네트워크 면접, OS 면접, 데이터베이스 면접, 기술 면접 준비, 코딩 인터뷰, tech interview questions',
  openGraph: {
    title: 'CS 기술 면접 - 100문제 모범 답안 | 툴허브',
    description: '10개 분야 100개 기술 면접 질문과 모범 답안으로 면접 완벽 대비.',
    url: 'https://toolhub.ai.kr/cs-interview',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS 기술 면접 - 100문제 모범 답안',
    description: '10개 분야 100개 기술 면접 질문과 모범 답안으로 면접 완벽 대비.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cs-interview',
  },
}

export default function CsInterviewPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CS 기술 면접 준비',
    description: '10개 분야 100개 기술 면접 질문과 모범 답안을 제공하는 면접 준비 도구',
    url: 'https://toolhub.ai.kr/cs-interview',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '100개 기술 면접 질문',
      '10개 분야별 카테고리',
      '모범 답안 및 핵심 포인트',
      '꼬리 질문 대비',
      '연습 모드 (자기 평가)',
      '학습 진행률 추적',
      '관련 용어 사전 연동'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '기술 면접에서 어떤 분야가 자주 출제되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '자료구조, 알고리즘, 네트워크, 운영체제, 데이터베이스가 가장 빈출 분야입니다. 신입은 기본기 위주, 경력은 아키텍처와 시스템 설계 질문이 추가됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '기술 면접 답변은 어떻게 하는 것이 좋나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '결론을 먼저 말하고, 이유와 예시를 덧붙이는 구조가 효과적입니다. 핵심 키워드를 포함하되 암기가 아닌 이해를 바탕으로 자신의 언어로 설명하세요.'
        }
      },
      {
        '@type': 'Question',
        name: '이 도구로 효과적으로 면접을 준비하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연습 모드에서 답변을 보기 전에 직접 말해보고, 자기 평가로 약점을 파악하세요. 복습 필요한 질문을 반복 연습하고, 관련 용어 사전으로 부족한 개념을 보충하면 됩니다.'
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
              <CsInterview />
              <div className="mt-8">
                <GuideSection namespace="csInterview" />
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
