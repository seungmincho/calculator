import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import JsonFormatter from '@/components/JsonFormatter'

export const metadata: Metadata = {
  title: 'JSON 포맷터 Pro - JSON 검증, 포맷팅, 압축, JSONPath 쿼리, JSON5 지원',
  description: 'JSON 데이터를 검증하고 포맷팅하세요. 구문 강조 에디터, 인터랙티브 트리뷰, JSONPath 쿼리, JSON5/JSONC 지원, 통계 분석, 드래그앤드롭, 키보드 단축키를 제공합니다.',
  keywords: 'JSON포맷터, JSON검증, JSON예쁘게, JSON압축, JSONPath, JSON5, JSONC, JSON뷰어, JSON트리뷰, JSON통계, 온라인JSON도구, JSON포맷팅, JSON구문강조',
  openGraph: {
    title: 'JSON 포맷터 Pro - 개발자를 위한 최고의 JSON 도구',
    description: '구문 강조, JSONPath 쿼리, JSON5 지원, 트리뷰, 통계 분석까지 - 프로급 JSON 포맷터',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/json-formatter',
  },
}

export default function JsonFormatterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'JSON 포맷터 Pro',
    description: 'JSON 데이터를 검증하고 포맷팅하세요. 구문 강조 에디터, 인터랙티브 트리뷰, JSONPath 쿼리, JSON5/JSONC 지원, 통계 분석을 제공합니다.',
    url: 'https://toolhub.ai.kr/json-formatter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON 포맷팅/압축', 'JSONPath 쿼리', 'JSON5/JSONC 지원', '트리뷰 모드', '자동 오류 수정']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'JSON과 JSON5의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JSON5는 JSON의 확장 형식으로, 주석(//, /* */), 후행 쉼표, 작은따옴표 문자열, 16진수 숫자, Infinity/NaN 등을 허용합니다. 설정 파일(tsconfig.json 등)에서 주로 사용되며, 표준 JSON보다 사람이 읽고 쓰기 편합니다. JSON5 파서가 필요하며 대부분의 API는 표준 JSON만 허용합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'JSONPath란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JSONPath는 JSON 데이터에서 특정 값을 찾기 위한 쿼리 언어입니다. XPath가 XML에서 사용되는 것처럼 JSON에서 사용됩니다. $.store.book[0].title처럼 경로를 지정하며, 와일드카드($..price), 필터([?(@.price<10)]), 슬라이스([0:5]) 등을 지원합니다. API 응답에서 필요한 데이터만 추출할 때 유용합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'JSON 포맷팅과 압축(Minify)의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JSON 포맷팅(Pretty Print)은 들여쓰기와 줄바꿈을 추가하여 가독성을 높이는 것으로, 개발 및 디버깅 시 사용합니다. 압축(Minify)은 모든 공백과 줄바꿈을 제거하여 파일 크기를 최소화하는 것으로, API 전송이나 저장 시 사용합니다. 보통 포맷팅된 JSON은 압축 대비 30-50% 크기가 증가합니다.'
        }
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <JsonFormatter />
      </I18nWrapper>
    </>
  )
}