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
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/url-encoder',
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
    </>
  )
}
