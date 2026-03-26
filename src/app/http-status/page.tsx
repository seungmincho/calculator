import { Metadata } from 'next'
import { Suspense } from 'react'
import HttpStatus from '@/components/HttpStatus'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'HTTP 상태코드 레퍼런스 | 툴허브',
  description: 'HTTP 상태코드 전체 레퍼런스. 200, 301, 404, 500 등 60개 이상 코드의 의미, 원인, 해결 방법을 한국어로 확인하세요. 번호 또는 설명으로 검색 가능.',
  keywords: [
    'HTTP 상태코드',
    'HTTP status code',
    '404 에러',
    '500 에러',
    '403 Forbidden',
    '301 리다이렉트',
    '200 OK',
    'HTTP 오류 코드',
    '웹 개발 레퍼런스',
    'REST API 상태코드',
    '서버 에러 코드',
    '클라이언트 에러 코드',
    'HTTP 응답 코드',
    '상태코드 의미'
  ],
  openGraph: {
    title: 'HTTP 상태코드 레퍼런스 | 툴허브',
    description: '60개 이상 HTTP 상태코드의 의미, 원인, 해결 방법을 한국어로 검색하세요.',
    url: 'https://toolhub.ai.kr/http-status',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HTTP 상태코드 레퍼런스 | 툴허브',
    description: '60개 이상 HTTP 상태코드의 의미, 원인, 해결 방법을 한국어로 검색하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/http-status/',
  },
}

const faqData = [
  {
    question: 'HTTP 404와 410의 차이점은 무엇인가요?',
    answer: '404 Not Found는 현재 리소스를 찾을 수 없지만 나중에 다시 있을 수도 있다는 의미입니다. 410 Gone은 리소스가 영구적으로 삭제되었고 다시는 제공되지 않는다는 의미입니다. SEO 관점에서 영구 삭제된 페이지에는 410을 사용하면 검색 엔진이 더 빠르게 해당 URL을 색인에서 제거합니다.',
  },
  {
    question: '401과 403의 차이는 무엇인가요?',
    answer: '401 Unauthorized는 인증이 필요하다는 의미입니다. 로그인하지 않은 사용자가 보호된 리소스에 접근할 때 발생합니다. 403 Forbidden은 인증 여부와 관계없이 접근 권한이 없다는 의미입니다. 로그인했더라도 해당 리소스에 대한 권한이 없을 때 발생합니다.',
  },
  {
    question: '301과 302 리다이렉트의 차이는 무엇인가요?',
    answer: '301 Moved Permanently는 URL이 영구적으로 이동했다는 의미로, 검색 엔진은 링크 권한(Link Equity)을 새 URL로 이전합니다. 302 Found는 일시적 이동으로, 검색 엔진은 원래 URL을 유지합니다. HTTPS 전환, 도메인 이전 등 영구 변경에는 301을, A/B 테스트나 임시 점검 페이지에는 302를 사용하세요.',
  },
]

export default function HttpStatusPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'HTTP 상태코드 레퍼런스',
    description: 'HTTP 상태코드 전체 레퍼런스. 200, 301, 404, 500 등 60개 이상 코드의 의미, 원인, 해결 방법을 한국어로 확인하세요.',
    url: 'https://toolhub.ai.kr/http-status',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '60개 이상 HTTP 상태코드',
      '번호/설명 검색',
      '카테고리별 필터 (1xx~5xx)',
      '원인 및 해결 방법 상세 안내',
      '클립보드 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <HttpStatus />
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
            HTTP 상태코드란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            HTTP 상태코드(HTTP Status Code)는 웹 서버가 클라이언트(브라우저, 앱 등)의 요청에 응답할 때 반환하는 3자리 숫자 코드입니다. 첫 번째 자리가 응답의 종류를 나타냅니다: 1xx(정보), 2xx(성공), 3xx(리다이렉트), 4xx(클라이언트 오류), 5xx(서버 오류). 웹 개발, REST API 설계, SEO 최적화, 서버 운영 모두에서 필수적인 개념입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            HTTP 상태코드 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>REST API 설계:</strong> 성공 응답은 200(GET), 201(POST 생성 성공), 204(DELETE 성공)로 구분하고, 클라이언트 오류는 400(잘못된 요청), 401(인증 필요), 403(권한 없음), 404(없음)를 정확히 구분하세요.</li>
            <li><strong>SEO 최적화:</strong> 이동한 페이지는 301을 사용해 검색 엔진에 영구 이동을 알리세요. 302는 일시적 이동으로 Link Equity가 전달되지 않습니다.</li>
            <li><strong>오류 모니터링:</strong> 5xx 에러는 서버 장애를 의미하므로 Sentry, Datadog 등으로 실시간 알림을 설정하고 즉시 대응하세요.</li>
            <li><strong>캐싱 활용:</strong> 304 Not Modified를 활용하면 변경되지 않은 리소스를 재전송하지 않아 대역폭을 절약하고 응답 속도를 높일 수 있습니다.</li>
            <li><strong>Rate Limiting:</strong> API에서 요청 한도를 초과하면 429 Too Many Requests를 반환하고 Retry-After 헤더로 재시도 시간을 안내하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
