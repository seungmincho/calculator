import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CharacterCounter from '@/components/CharacterCounter'

export const metadata: Metadata = {
  title: '글자수 세기 - 글자수, 단어수, 문장수 카운터 | 툴허브',
  description: '텍스트의 글자수, 공백제외, 단어수, 문장수, 단락수를 실시간으로 계산합니다. SNS 글자수 제한 확인에 유용합니다.',
  keywords: '글자수세기, 글자수카운터, 단어수세기, 문자수세기, 텍스트분석, SNS글자수, 트위터글자수',
  openGraph: {
    title: '글자수 세기 - 실시간 텍스트 분석',
    description: '글자수, 단어수, 문장수를 실시간으로 분석하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/character-counter',
  },
}

export default function CharacterCounterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '글자수 세기',
    description: '텍스트의 글자수, 공백제외, 단어수, 문장수, 단락수를 실시간으로 계산합니다. SNS 글자수 제한 확인에 유용합니다.',
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
      </I18nWrapper>
    </>
  )
}
