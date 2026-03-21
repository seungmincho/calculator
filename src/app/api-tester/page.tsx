import { Metadata } from 'next'
import { Suspense } from 'react'
import ApiTester from '@/components/ApiTester'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/api-tester/',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'API 테스터란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'API 테스터는 REST API 엔드포인트에 HTTP 요청(GET, POST, PUT, DELETE 등)을 보내고 응답을 확인하는 도구입니다. Postman, Insomnia 같은 데스크톱 앱의 웹 버전으로, 별도 설치 없이 브라우저에서 바로 사용할 수 있습니다. 헤더 설정, 요청 본문(JSON, Form Data), 인증(Bearer Token, Basic Auth) 등을 지원합니다. 개발 중 API 동작 확인, 디버깅, 문서화에 필수적인 도구입니다.'
        }
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <ApiTester />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            API 테스터란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            API 테스터는 Postman, Insomnia 같은 별도 설치 없이 브라우저에서 바로 REST API를 테스트할 수 있는 무료 온라인 개발 도구입니다. GET, POST, PUT, DELETE 등 모든 HTTP 메서드를 지원하며, 요청 헤더 편집, JSON 본문 작성, Bearer Token 및 Basic Auth 인증까지 설정할 수 있습니다. 응답 시간, 상태 코드, 응답 본문 분석은 물론 cURL, fetch, axios 코드를 자동 생성하여 개발 워크플로를 가속화합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            API 테스터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>환경 변수 활용:</strong> {`{{baseUrl}}`}, {`{{token}}`} 같은 변수를 설정하면 공통 URL이나 인증 토큰을 한 번만 입력하고 재사용할 수 있습니다.</li>
            <li><strong>코드 자동 생성:</strong> 요청을 구성한 뒤 cURL 또는 fetch 코드 생성 버튼을 누르면 바로 코드에 붙여넣을 수 있는 스니펫이 만들어집니다.</li>
            <li><strong>히스토리 활용:</strong> 최근 20건의 요청이 자동 저장되므로 반복 테스트 시 이전 요청을 불러와 수정하면 시간을 절약할 수 있습니다.</li>
            <li><strong>CORS 우회:</strong> 브라우저 보안 정책으로 일부 API는 직접 호출이 막힐 수 있습니다. 이 경우 서버 사이드 프록시를 이용하세요.</li>
            <li><strong>응답 시간 분석:</strong> 응답 시간이 500ms를 넘으면 API 최적화를 검토하고, 상태 코드 4xx/5xx 오류는 요청 파라미터와 서버 로그를 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
