import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CharacterCounter from '@/components/CharacterCounter'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '글자수 세기 - 글자수, 단어수, 문장수 카운터 | 툴허브',
  description: '텍스트의 글자수, 공백 제외 글자수, 단어수, 문장수, 단락수를 실시간으로 계산합니다. 트위터·인스타그램 SNS 글자 제한 확인에 유용합니다.',
  keywords: '글자수세기, 글자수카운터, 단어수세기, 문자수세기, 텍스트분석, SNS글자수, 트위터글자수',
  openGraph: {
    title: '글자수 세기 - 실시간 텍스트 분석',
    description: '글자수, 단어수, 문장수를 실시간으로 분석하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/character-counter',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '글자수 세기 - 글자수, 단어수, 문장수 카운터',
    description: '텍스트의 글자수, 공백 제외 글자수, 단어수, 문장수, 단락수를 실시간으로 계산합니다. 트위터·인스타그램 SNS 글자 제한 확인에 유용합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/character-counter/',
  },
}

export default function CharacterCounterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '글자수 세기',
    description: '텍스트의 글자수, 공백 제외 글자수, 단어수, 문장수, 단락수를 실시간으로 계산합니다. 트위터·인스타그램 SNS 글자 제한 확인에 유용합니다.',
    url: 'https://toolhub.ai.kr/character-counter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['글자수 세기', '단어수 세기', '줄수 세기', '공백 포함/제외', '바이트 수 계산']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '글자수 세기에서 공백 포함/제외 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '공백 포함 글자수는 띄어쓰기, 줄바꿈을 모두 포함한 전체 문자 수입니다. 공백 제외 글자수는 순수 텍스트만 셉니다. 트위터/X는 280자(한글 140자), 카카오톡 메시지는 1만 자, 네이버 블로그 제목은 70자, 인스타그램 캡션은 2,200자 제한입니다. 한글은 UTF-8에서 3바이트, EUC-KR에서 2바이트를 차지하므로 바이트 수도 확인이 필요합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <CharacterCounter />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            글자수 세기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            글자수 세기 도구는 <strong>텍스트의 글자수·공백 제외 글자수·단어수·문장수·단락수를 실시간으로 분석</strong>하는 무료 온라인 카운터입니다. SNS 게시글 작성, 대학 리포트, 공모전 응모, 이력서 작성 등 글자수 제한이 있는 모든 상황에서 활용할 수 있습니다. 한글·영문·특수문자가 섞인 텍스트도 정확히 분석하며 바이트 수도 함께 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            글자수 세기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SNS 제한 확인:</strong> 트위터/X는 280자(한글 140자), 인스타그램 캡션은 2,200자 제한입니다.</li>
            <li><strong>공백 제외 활용:</strong> 국내 대부분의 원고지·공모전은 공백 제외 글자수 기준을 적용합니다.</li>
            <li><strong>바이트 수 확인:</strong> 한글은 UTF-8 기준 3바이트이므로 시스템 저장 시 바이트 제한도 체크하세요.</li>
            <li><strong>단어 밀도 분석:</strong> 단어수 대비 문장수로 평균 문장 길이를 파악해 가독성을 높이세요.</li>
            <li><strong>블로그 SEO:</strong> 검색엔진은 최소 600자 이상의 본문을 선호하므로 글자수를 참고해 작성하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
