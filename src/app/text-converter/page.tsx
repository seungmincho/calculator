import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TextConverter from '@/components/TextConverter'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import textConverterMessages from '../../../messages/generated/ko/ns/textConverter.json'

export const metadata: Metadata = {
  title: '텍스트 변환기 - 대소문자, 케이스 변환 | 툴허브',
  description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case, PascalCase 등 다양한 케이스를 즉시 변환합니다. 개발자 필수 도구.',
  keywords: '텍스트변환, 대소문자변환, camelcase, snakecase, kebabcase, 케이스변환, text converter',
  openGraph: {
    title: '텍스트 변환기 - 케이스 변환 도구',
    description: '다양한 텍스트 케이스를 손쉽게 변환하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/text-converter/',
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
    url: 'https://toolhub.ai.kr/text-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['12가지 케이스 한 번에 변환(camelCase·snake_case·kebab-case 등)', '줄 정렬·중복 제거·빈 줄 제거', '찾아 바꾸기(정규식 지원)', '줄마다 앞뒤 문자 추가', 'SQL IN·JS 배열 목록 만들기', '전각↔반각 변환', '변환 단계 이어 붙이기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={textConverterMessages.textConverter.guide.faq.items} />
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
