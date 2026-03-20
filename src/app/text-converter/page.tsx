import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TextConverter from '@/components/TextConverter'

export const metadata: Metadata = {
  title: '텍스트 변환기 - 대소문자, 케이스 변환 | 툴허브',
  description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case 등 다양한 케이스 변환을 지원합니다.',
  keywords: '텍스트변환, 대소문자변환, camelcase, snakecase, kebabcase, 케이스변환, text converter',
  openGraph: {
    title: '텍스트 변환기 - 케이스 변환 도구',
    description: '다양한 텍스트 케이스를 손쉽게 변환하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/text-converter',
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
    description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case 등 다양한 케이스 변환을 지원합니다.',
    url: 'https://toolhub.ai.kr/text-converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['대소문자 변환', 'camelCase 변환', 'snake_case 변환', 'kebab-case 변환', 'URI 인코딩']
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
        name: '한글 초성 추출은 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "한글 유니코드는 0xAC00부터 시작하며, 각 글자는 초성(19개) × 중성(21개) × 종성(28개) = 11,172개로 구성됩니다. 초성 인덱스 = (글자코드 - 0xAC00) ÷ 588. 예: '한'(0xD55C)의 초성은 ㅎ(인덱스 18). 초성 목록: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ. 검색 자동완성, 주소록 필터링 등에 활용됩니다.",
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
      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            텍스트 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            텍스트 변환기는 대소문자 변환, camelCase·snake_case·kebab-case·PascalCase 등 다양한 텍스트 케이스 변환을 클릭 한 번으로 처리해 주는 개발자·작가용 온라인 도구입니다. 코드 변수명 규칙 변환, URL 슬러그 생성, 데이터베이스 컬럼명 변환 등 개발 작업에서 반복적으로 필요한 텍스트 처리를 빠르게 완료할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            텍스트 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>언어별 케이스 규칙:</strong> JavaScript·TypeScript 변수명은 camelCase, 클래스명은 PascalCase, Python·DB 컬럼은 snake_case, CSS 클래스·URL은 kebab-case를 사용하는 것이 표준입니다.</li>
            <li><strong>URL 슬러그 생성:</strong> 한글 제목을 영문 kebab-case로 변환하면 SEO 친화적인 URL 슬러그를 만들 수 있습니다. 공백은 하이픈으로 자동 변환됩니다.</li>
            <li><strong>상수명 변환:</strong> SCREAMING_SNAKE_CASE(전체 대문자 + 밑줄)는 프로그램 상수(MAX_VALUE, API_KEY)에 주로 사용되며, 변환 후 바로 코드에 복사할 수 있습니다.</li>
            <li><strong>한글 초성 추출:</strong> 한글 텍스트에서 초성만 추출하는 기능은 주소록 정렬, 검색 자동완성 구현, 단어 퀴즈 제작 등에 활용할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
