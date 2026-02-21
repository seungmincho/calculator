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
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/text-converter',
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
    </>
  )
}
