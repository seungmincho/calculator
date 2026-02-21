import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import LoremIpsumGenerator from '@/components/LoremIpsumGenerator'

export const metadata: Metadata = {
  title: 'Lorem Ipsum 생성기 - 더미 텍스트 생성 | 툴허브',
  description: '웹 디자인과 개발에 사용할 Lorem Ipsum 더미 텍스트를 생성합니다. 한글 Lorem Ipsum도 지원합니다.',
  keywords: 'lorem ipsum, 더미텍스트, 채움글, 한글lorem, 테스트텍스트, placeholder text',
  openGraph: {
    title: 'Lorem Ipsum 생성기 - 더미 텍스트',
    description: '디자인용 더미 텍스트를 생성하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lorem-ipsum',
  },
}

export default function LoremIpsumPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lorem Ipsum 생성기',
    description: '웹 디자인과 개발에 사용할 Lorem Ipsum 더미 텍스트를 생성합니다. 한글 Lorem Ipsum도 지원합니다.',
    url: 'https://toolhub.ai.kr/lorem-ipsum',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['문단 생성', '문장 생성', '단어 생성', '커스텀 길이']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Lorem Ipsum이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lorem Ipsum은 출판 및 디자인 업계에서 사용하는 더미 텍스트(placeholder text)입니다. 원문은 기원전 45년 키케로의 \'De Finibus Bonorum et Malorum\' 일부를 변형한 것으로, 1500년대 인쇄업자가 처음 사용했습니다. 의미 없는 라틴어이므로 독자가 내용에 집중하지 않고 디자인 레이아웃을 평가할 수 있게 합니다. 웹 디자인, 인쇄물, 앱 모킹에 사용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Lorem Ipsum 대신 사용할 수 있는 대안은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국어 더미 텍스트: \'동해물과 백두산이...\' 같은 애국가나 한글 Lorem Ipsum 생성기 사용. 실제 콘텐츠 사용: 가능하면 실제 원고를 사용하는 것이 최선. Hipster Ipsum, Bacon Ipsum 등 재미있는 대안도 있습니다. 다만 Lorem Ipsum은 문자 분포가 영어와 비슷하여 실제 텍스트처럼 보이는 장점이 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <LoremIpsumGenerator />
      </I18nWrapper>
    </>
  )
}
