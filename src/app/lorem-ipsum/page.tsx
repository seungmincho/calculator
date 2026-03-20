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
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/lorem-ipsum',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lorem-ipsum/',
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
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Lorem Ipsum 생성기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              Lorem Ipsum 생성기는 웹 디자인, 앱 개발, 인쇄물 제작 시 레이아웃 확인용 더미 텍스트(placeholder text)를 즉시 생성해주는 도구입니다. 문단, 문장, 단어 단위로 원하는 분량을 만들 수 있으며, 한글 Lorem Ipsum도 지원해 한국어 UI 목업에 바로 활용할 수 있습니다. 디자이너와 개발자라면 매일 쓰는 필수 유틸리티입니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Lorem Ipsum 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>UI 목업:</strong> 실제 콘텐츠 없이도 텍스트 영역의 레이아웃, 여백, 폰트 가독성을 검토할 수 있습니다.</li>
              <li><strong>한글 Lorem:</strong> 한국어 프로젝트에는 한글 더미 텍스트를 사용해 실제 한글 폰트 렌더링과 줄 바꿈을 확인하세요.</li>
              <li><strong>분량 조절:</strong> 문단 수, 문장 수, 단어 수를 자유롭게 설정해 카드, 본문, 툴팁 등 다양한 컴포넌트에 맞게 생성합니다.</li>
              <li><strong>복사 후 붙여넣기:</strong> 생성된 텍스트를 클릭 한 번으로 복사해 Figma, Sketch, VS Code 등에 바로 붙여넣기하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
