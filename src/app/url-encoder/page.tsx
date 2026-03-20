import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import UrlEncoder from '@/components/UrlEncoder'

export const metadata: Metadata = {
  title: 'URL 인코더/디코더 - URL 인코딩/디코딩 변환기 | 툴허브',
  description: 'URL 인코딩/디코딩 도구. URL 파라미터를 안전하게 인코딩하거나 인코딩된 URL을 원본으로 디코딩합니다. URL 분석 기능 포함.',
  keywords: 'url인코더, url디코더, url인코딩, url디코딩, 퍼센트인코딩, urlencode, urldecode',
  openGraph: {
    title: 'URL 인코더/디코더 - 온라인 URL 변환 도구',
    description: 'URL을 안전하게 인코딩/디코딩하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/url-encoder',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URL 인코더/디코더 - URL 인코딩/디코딩 변환기',
    description: 'URL 인코딩/디코딩 도구. URL 파라미터를 안전하게 인코딩하거나 인코딩된 URL을 원본으로 디코딩합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/url-encoder/',
  },
}

export default function UrlEncoderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'URL 인코더/디코더',
    description: 'URL 인코딩/디코딩 도구. URL 파라미터를 안전하게 인코딩하거나 인코딩된 URL을 원본으로 디코딩합니다. URL 분석 기능 포함.',
    url: 'https://toolhub.ai.kr/url-encoder',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['URL 인코딩', 'URL 디코딩', 'URI 컴포넌트 변환', '실시간 변환']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'URL 인코딩이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'URL 인코딩(퍼센트 인코딩)은 URL에서 사용할 수 없는 문자를 %XX 형식으로 변환하는 것입니다. 예: 공백은 %20, 한글 \'가\'는 %EA%B0%80으로 인코딩됩니다. URL에는 영문, 숫자, -_.~ 외 특수문자를 직접 사용할 수 없으므로 인코딩이 필요합니다. 브라우저 주소창에서는 자동으로 처리되지만, API 호출이나 프로그래밍에서는 명시적 인코딩이 필요합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'encodeURI와 encodeURIComponent의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'encodeURI(): 전체 URL을 인코딩하되 URL 구조 문자(:, /, ?, #, &, = 등)는 보존합니다. 전체 URL을 인코딩할 때 사용합니다. encodeURIComponent(): URL 구조 문자까지 모두 인코딩합니다. 쿼리 파라미터의 값을 인코딩할 때 사용합니다. 예: URL이 포함된 파라미터는 encodeURIComponent를 써야 &, = 등이 파라미터 구분자로 해석되지 않습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <UrlEncoder />
      </I18nWrapper>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            URL 인코더/디코더란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            URL 인코더/디코더는 URL에서 사용할 수 없는 한글, 특수문자, 공백 등을 퍼센트 인코딩(%XX 형식)으로 변환하거나 인코딩된 URL을 원래 텍스트로 복원하는 개발자 도구입니다. API 파라미터 작성, 쿼리 스트링 디버깅, 웹 스크래핑, URL 생성 자동화 작업 시 필수적으로 활용됩니다. encodeURIComponent 방식과 encodeURI 방식을 모두 지원하며 실시간으로 변환 결과를 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            URL 인코딩 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>한글 URL 처리:</strong> 한글이 포함된 검색어나 파라미터 값은 반드시 URL 인코딩이 필요합니다. 예를 들어 &apos;안녕&apos;은 &apos;%EC%95%88%EB%85%95&apos;으로 인코딩됩니다.</li>
            <li><strong>API 쿼리 파라미터:</strong> &amp;, =, +, 공백 등이 포함된 값을 API 파라미터로 전송할 때 encodeURIComponent로 인코딩해야 의도하지 않은 파싱 오류를 방지할 수 있습니다.</li>
            <li><strong>인코딩된 URL 분석:</strong> 브라우저 주소창이나 로그 파일에서 %로 시작하는 인코딩 문자열을 디코딩하여 원래 쿼리 파라미터나 경로를 확인할 수 있습니다.</li>
            <li><strong>이중 인코딩 주의:</strong> 이미 인코딩된 URL을 다시 인코딩하면 %25XX 형태로 이중 인코딩되어 오류가 발생합니다. 디코딩 후 재인코딩하거나 원본 값을 인코딩하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
