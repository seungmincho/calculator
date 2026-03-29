import { Metadata } from 'next'
import { Suspense } from 'react'
import CsQuiz from '@/components/CsQuiz'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CS 기초 퀴즈 - 10개 분야 250문제 컴퓨터공학 학습 | 툴허브',
  description: '컴퓨터 과학 10대 핵심 분야를 문제 풀이로 학습하세요. 자료구조, 알고리즘, 네트워크, OS, DB, 컴퓨터구조, SW공학, 보안, 리눅스, 웹 총 250문제, 3단계 난이도, 즉시 해설.',
  keywords: 'CS 퀴즈, 자료구조 퀴즈, 알고리즘 문제, 네트워크 기초, 운영체제 문제, 데이터베이스 퀴즈, 컴퓨터구조, 소프트웨어공학, 보안, 리눅스, 웹개발, 코딩 면접, 기술 면접',
  openGraph: {
    title: 'CS 기초 퀴즈 - 10개 분야 250문제 컴퓨터공학 학습 | 툴허브',
    description: '컴퓨터 과학 10대 핵심 분야를 문제 풀이로 학습하세요. 자료구조, 알고리즘, 네트워크, OS, DB, 컴퓨터구조, SW공학, 보안, 리눅스, 웹 총 250문제.',
    url: 'https://toolhub.ai.kr/cs-quiz',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS 기초 퀴즈 - 자료구조·알고리즘·네트워크·OS·DB 125문제',
    description: '컴퓨터 과학 5대 핵심 분야를 문제 풀이로 학습하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cs-quiz',
  },
}

export default function CsQuizPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CS 기초 퀴즈',
    description: '자료구조, 알고리즘, 네트워크, 운영체제, 데이터베이스 125문제로 컴퓨터 과학 기초를 다지세요.',
    url: 'https://toolhub.ai.kr/cs-quiz',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '자료구조 25문제',
      '알고리즘 25문제',
      '네트워크 25문제',
      '운영체제 25문제',
      '데이터베이스 25문제',
      '3단계 난이도 선택',
      '즉시 해설 제공',
      '오답 노트 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '문제는 랜덤인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 매번 문제를 풀 때마다 5개 카테고리(자료구조, 알고리즘, 네트워크, 운영체제, 데이터베이스)에서 랜덤하게 문제가 출제됩니다. 같은 문제를 반복해서 풀 수도 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '면접 준비에 도움이 될까요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 코딩 면접과 기술 면접에 자주 출제되는 핵심 개념들을 다루고 있습니다. 각 문제마다 상세한 해설이 제공되어 개념 학습에 효과적입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '오답만 다시 풀 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 오답 노트 기능으로 틀린 문제들을 따로 모아볼 수 있습니다. 오답만 선택해서 반복 학습할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <CsQuiz />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
