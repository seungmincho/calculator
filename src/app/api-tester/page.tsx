import { Metadata } from 'next'
import { Suspense } from 'react'
import ApiTester from '@/components/ApiTester'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'API 테스터 - REST API 클라이언트 | 툴허브',
  description: 'API 테스터 - 브라우저에서 바로 REST API를 테스트하세요. GET/POST/PUT/DELETE, 헤더, 인증, 응답 분석, cURL/fetch 코드 생성.',
  keywords: 'API 테스터, REST 클라이언트, API 테스트, HTTP 요청, cURL 생성, fetch 코드, REST API, API tester, 개발 도구',
  openGraph: {
    title: 'API 테스터 - REST API 클라이언트 | 툴허브',
    description: '브라우저에서 바로 REST API를 테스트하세요. 다양한 HTTP 메서드, 인증, 응답 분석, 코드 생성 지원.',
    url: 'https://toolhub.ai.kr/api-tester',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API 테스터 - REST API 클라이언트',
    description: '브라우저에서 REST API를 테스트하고 코드를 생성하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/api-tester',
  },
}

export default function ApiTesterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'API 테스터',
    description: '브라우저에서 REST API를 테스트하는 도구. HTTP 요청 전송, 응답 분석, cURL/fetch/axios 코드 생성.',
    url: 'https://toolhub.ai.kr/api-tester',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'HTTP 메서드 지원 (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)',
      '요청 헤더 및 쿼리 파라미터 편집',
      'JSON 요청 본문 편집 및 검증',
      'Basic Auth, Bearer Token 인증',
      '응답 코드, 시간, 크기 분석',
      'cURL, fetch, axios 코드 생성',
      '환경 변수 ({{varName}}) 치환',
      '요청 히스토리 (최근 20건)',
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ApiTester />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
