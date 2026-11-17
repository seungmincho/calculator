import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import JsonFormatter from '@/components/JsonFormatter'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = "JSON 포맷터 - 검증·트리 선택·JSONPath | 툴허브"
const DESCRIPTION = "JSON을 검증·정렬·압축하고 트리에서 선택한 전체 값, JSON Pointer와 확인된 JSONPath를 복사하세요. 복사 실패 시 원문 선택·재시도를 제공하며 자주 쓰는 JSONPath 검색식만 이름으로 저장합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'JSON포맷터, JSON검증, JSON예쁘게, JSON압축, JSONPath, JSON5, JSONC, JSON뷰어, JSON트리뷰, JSON통계, 온라인JSON도구, JSON포맷팅, JSON구문강조',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/json-formatter/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/json-formatter.png', width: 1200, height: 630, alt: 'JSON 포맷터 Pro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/json-formatter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/json-formatter/',
  },
}

export default function JsonFormatterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'JSON 포맷터 Pro',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/json-formatter/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON 포맷팅/압축', 'JSONPath 쿼리', 'JSON5/JSONC 지원', '트리뷰 모드', '자동 오류 수정', 'JSONPath 검색식 이름 저장·불러오기', '검색식 이름 변경·삭제', '선택한 전체 값 JSON 복사', 'JSON Pointer와 확인된 JSONPath', '복사 실패 원문 선택·재시도', '특수 데이터 키를 보존하는 정렬·통계']
  }

  const faq = [
    { q: '트리에서 선택한 값과 경로는 어떻게 복사하나요?', a: '노드를 선택한 뒤 전체 값 JSON, JSON Pointer, 확인된 JSONPath 중 필요한 항목을 복사합니다. 트리의 짧은 표시와 복사 원문은 구분하며 null·false·0·빈 문자열·루트도 선택할 수 있습니다. 복사가 실패하면 원문 선택과 재시도를 제공합니다.' },
    { q: '점이나 따옴표가 들어간 키도 같은 경로로 찾을 수 있나요?', a: '객체 키와 배열 인덱스를 구분하며 JSON Pointer는 슬래시와 틸드를 이스케이프합니다. JSONPath는 현재 엔진으로 선택값을 확인하며, 지원하지 못하는 특수 키는 성공한 경로처럼 표시하지 않습니다. 이때 전체 값이나 JSON Pointer를 사용할 수 있습니다.' },
    { q: 'JSON과 JSON5의 차이점은?', a: 'JSON5는 JSON의 확장 형식으로, 주석(//, /* */), 후행 쉼표, 작은따옴표 문자열, 16진수 숫자, Infinity/NaN 등을 허용합니다. 설정 파일(tsconfig.json 등)에서 주로 사용되며, 표준 JSON보다 사람이 읽고 쓰기 편합니다. JSON5 파서가 필요하며 대부분의 API는 표준 JSON만 허용합니다.' },
    { q: 'JSONPath란 무엇인가요?', a: 'JSONPath는 JSON 데이터에서 특정 값을 찾기 위한 쿼리 언어입니다. XPath가 XML에서 사용되는 것처럼 JSON에서 사용됩니다. $.store.book[0].title처럼 경로를 지정하며, 와일드카드($..price), 필터([?(@.price<10)]), 슬라이스([0:5]) 등을 지원합니다. API 응답에서 필요한 데이터만 추출할 때 유용합니다.' },
    { q: 'JSON 포맷팅과 압축(Minify)의 차이는?', a: 'JSON 포맷팅(Pretty Print)은 들여쓰기와 줄바꿈을 추가하여 가독성을 높이는 것으로, 개발 및 디버깅 시 사용합니다. 압축(Minify)은 문자열 값 내부의 공백을 보존하면서 구조를 꾸미는 공백과 줄바꿈을 줄입니다. 크기 차이는 원래 들여쓰기와 데이터 구조에 따라 다릅니다.' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <JsonFormatter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            JSON 포맷터 Pro란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            JSON 포맷터 Pro는 JSON 데이터를 검증·포맷팅·압축하고 JSONPath 쿼리로 원하는 값을 추출할 수 있는 고급 개발자 도구입니다. CodeMirror 6 기반의 구문 강조 에디터, 인터랙티브 트리뷰, JSON5/JSONC 주석 지원, 깨진 JSON 자동 수정 기능을 갖추고 있으며 드래그 앤 드롭과 URL에서 직접 가져오기도 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            JSON 포맷터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>API 응답 가독성 향상:</strong> 압축된 API 응답 JSON을 포맷터에 붙여넣으면 들여쓰기된 구조로 즉시 변환되어 디버깅이 쉬워집니다.</li>
            <li><strong>JSONPath 쿼리 활용:</strong> <code className="bg-soft px-1 rounded">$.data[*].name</code>처럼 JSONPath를 입력하면 대용량 JSON에서 원하는 필드만 빠르게 추출할 수 있습니다.</li>
            <li><strong>JSON5 설정 파일:</strong> tsconfig.json이나 .babelrc처럼 주석이 포함된 JSONC/JSON5 파일도 파싱하고 검증할 수 있습니다.</li>
            <li><strong>자동 오류 수정:</strong> 따옴표 누락, 후행 쉼표 등 흔한 JSON 오류를 자동으로 감지하고 수정하는 jsonrepair 기능을 제공합니다.</li>
            <li><strong>트리뷰 모드:</strong> 복잡한 중첩 JSON 구조를 트리 형태로 펼쳐보며 데이터 구조를 한눈에 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
