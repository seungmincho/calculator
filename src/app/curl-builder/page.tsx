import { Metadata } from 'next'
import { Suspense } from 'react'
import CurlBuilder from '@/components/CurlBuilder'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'cURL Command Builder - cURL 명령어 생성 & 코드 변환 | 툴허브',
  description: 'cURL 명령어를 폼에서 쉽게 생성하고, 붙여넣은 cURL을 JavaScript fetch, axios, Python requests, Go net/http, PHP curl 코드로 변환하세요. 헤더, 인증, 바디, 쿼리 파라미터를 GUI로 설정합니다.',
  keywords: 'cURL 빌더, cURL 생성기, cURL to Python, cURL to JavaScript, cURL to fetch, cURL to axios, cURL to Go, cURL to PHP, API 테스트, HTTP 요청, REST API, cURL 변환',
  openGraph: {
    title: 'cURL Command Builder - cURL 명령어 생성 & 코드 변환 | 툴허브',
    description: 'cURL 명령어를 GUI로 생성하고 6가지 프로그래밍 언어 코드로 변환. fetch, axios, Python, Go, PHP 지원.',
    url: 'https://toolhub.ai.kr/curl-builder/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'cURL Command Builder | 툴허브',
    description: 'cURL 명령어 생성 & 6가지 언어 코드 변환',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/curl-builder/',
  },
}

export default function CurlBuilderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'cURL Command Builder',
    description: 'cURL 명령어를 GUI로 생성하고 JavaScript fetch, axios, Python requests, Go net/http, PHP curl 코드로 변환하는 도구',
    url: 'https://toolhub.ai.kr/curl-builder/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'GUI 기반 cURL 명령어 생성',
      'cURL 명령어 파싱 및 폼 자동 채움',
      'JavaScript fetch 코드 변환',
      'JavaScript axios 코드 변환',
      'Python requests 코드 변환',
      'Go net/http 코드 변환',
      'PHP curl 코드 변환',
      '인증 (Bearer, Basic, API Key) 지원',
      'JSON/Form Data/URL-encoded 바디',
      '명령어 히스토리 저장',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'cURL 명령어를 어떻게 다른 언어 코드로 변환하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '파싱 모드에서 cURL 명령어를 붙여넣고 파싱 버튼을 클릭하면, 자동으로 fetch, axios, Python requests, Go net/http, PHP curl 등 6가지 형식으로 변환할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '브라우저에서 cURL 명령어를 어떻게 복사하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chrome DevTools의 Network 탭(F12)을 열고, 원하는 요청을 우클릭한 뒤 Copy > Copy as cURL을 선택하면 cURL 명령어를 복사할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'cURL 빌더에서 어떤 인증 방식을 지원하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bearer Token, Basic Auth (사용자명/비밀번호), API Key 3가지 인증 방식을 지원합니다. 인증 섹션에서 선택하면 자동으로 적절한 헤더가 추가됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <CurlBuilder />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
