import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TextConverter from '@/components/TextConverter'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '텍스트 변환기 - 대소문자, 케이스 변환 | 툴허브',
  description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case, PascalCase 등 다양한 케이스를 즉시 변환합니다. 개발자 필수 도구.',
  keywords: '텍스트변환, 대소문자변환, camelcase, snakecase, kebabcase, 케이스변환, text converter',
  openGraph: {
    title: '텍스트 변환기 - 케이스 변환 도구',
    description: '다양한 텍스트 케이스를 손쉽게 변환하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/text-converter',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/text-converter.png', width: 1200, height: 630, alt: '텍스트 변환기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '텍스트 변환기 - 대소문자, 케이스 변환',
    description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case, PascalCase 등 다양한 케이스를 즉시 변환합니다. 개발자 필수 도구.',
    images: ['https://toolhub.ai.kr/og/text-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/text-converter/',
  },
}

export default function TextConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '텍스트 변환기',
    description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case, PascalCase 등 다양한 케이스를 즉시 변환합니다. 개발자 필수 도구.',
    url: 'https://toolhub.ai.kr/text-converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['12가지 케이스 한 번에 변환(camelCase·snake_case·kebab-case 등)', '줄 정렬·중복 제거·빈 줄 제거', '찾아 바꾸기(정규식 지원)', '줄마다 앞뒤 문자 추가', 'SQL IN·JS 배열 목록 만들기', '전각↔반각 변환', '변환 단계 이어 붙이기']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'camelCase, snake_case, kebab-case의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'camelCase: 첫 단어 소문자, 이후 단어 첫 글자 대문자 (myVariableName). JavaScript 변수/함수명에 사용. PascalCase: 모든 단어 첫 글자 대문자 (MyClassName). 클래스명에 사용. snake_case: 소문자와 밑줄 (my_variable_name). Python, Ruby, DB 컬럼명에 사용. kebab-case: 소문자와 하이픈 (my-css-class). CSS 클래스, URL 슬러그에 사용. SCREAMING_SNAKE_CASE: 상수 정의에 사용 (MAX_VALUE).',
        },
      },
      {
        '@type': 'Question',
        name: '여러 줄을 SQL IN 목록이나 배열로 바꿀 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네. 한 줄에 하나씩 값을 붙여 넣고 목록 만들기에서 SQL IN, JS 배열, JSON 배열, 쉼표 목록 중 하나를 고르면 따옴표와 쉼표를 자동으로 붙여 줍니다. 모든 값이 숫자면 따옴표 없이, 앞자리 0이 있는 값은 문자열로 처리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '텍스트 인코딩에서 UTF-8과 EUC-KR의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "UTF-8은 유니코드 기반 가변 길이 인코딩(1-4바이트)으로 전 세계 모든 문자를 지원하며, 웹 표준입니다. 한글 1자는 3바이트입니다. EUC-KR은 한국어 전용 2바이트 인코딩으로, KS X 1001 완성형 2,350자만 지원합니다. '뷁', '똠' 같은 글자는 EUC-KR에 없어 깨집니다. 현재는 UTF-8 사용이 압도적이며, 레거시 시스템에서만 EUC-KR을 만납니다.",
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <TextConverter />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            텍스트 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            텍스트 변환기는 대소문자 변환, camelCase·snake_case·kebab-case·PascalCase 등 다양한 텍스트 케이스 변환을 클릭 한 번으로 처리해 주는 개발자·작가용 온라인 도구입니다. 코드 변수명 규칙 변환, URL 슬러그 생성, 데이터베이스 컬럼명 변환 등 개발 작업에서 반복적으로 필요한 텍스트 처리를 빠르게 완료할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            텍스트 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>언어별 케이스 규칙:</strong> JavaScript·TypeScript 변수명은 camelCase, 클래스명은 PascalCase, Python·DB 컬럼은 snake_case, CSS 클래스·URL은 kebab-case를 사용하는 것이 표준입니다.</li>
            <li><strong>URL 슬러그 생성:</strong> 영문 제목을 kebab-case로 바꾸면 SEO 친화적인 URL 슬러그를 만들 수 있습니다. 공백과 특수문자는 하이픈으로 정리됩니다.</li>
            <li><strong>상수명 변환:</strong> SCREAMING_SNAKE_CASE(전체 대문자 + 밑줄)는 프로그램 상수(MAX_VALUE, API_KEY)에 주로 사용되며, 변환 후 바로 코드에 복사할 수 있습니다.</li>
            <li><strong>목록 정리:</strong> 엑셀에서 복사한 값 목록의 중복과 빈 줄을 지우고 가나다순으로 정렬한 뒤 SQL IN 조건이나 배열로 바로 바꿀 수 있습니다. 한글 초성 추출은 한글 자모 분리 도구를 이용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
