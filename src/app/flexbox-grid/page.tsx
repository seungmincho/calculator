import { Metadata } from 'next'
import { Suspense } from 'react'
import FlexboxGrid from '@/components/FlexboxGrid'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS Flexbox & Grid 생성기 - 레이아웃 코드 생성 | 툴허브',
  description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요. 실시간 미리보기, 프리셋, 반응형 테스트 지원.',
  keywords: 'CSS Flexbox, CSS Grid, 레이아웃 생성기, flexbox generator, grid generator, CSS 코드 생성, 반응형 레이아웃',
  openGraph: {
    title: 'CSS Flexbox & Grid 생성기 | 툴허브',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요.',
    url: 'https://toolhub.ai.kr/flexbox-grid',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSS Flexbox & Grid 생성기 | 툴허브',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/flexbox-grid',
  },
}

export default function FlexboxGridPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CSS Flexbox & Grid 생성기',
    description: 'CSS Flexbox와 Grid 레이아웃을 시각적으로 만들고 CSS 코드를 복사하세요. 실시간 미리보기, 프리셋, 반응형 테스트 지원.',
    url: 'https://toolhub.ai.kr/flexbox-grid',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Flexbox 레이아웃', 'CSS Grid 레이아웃', '실시간 미리보기', '프리셋 레이아웃', '반응형 테스트', 'CSS 코드 복사'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Flexbox와 CSS Grid의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Flexbox는 1차원 레이아웃(행 또는 열 중 하나)에 적합합니다. 네비게이션 바, 카드 목록, 정렬 등에 사용합니다. CSS Grid는 2차원 레이아웃(행과 열 동시)에 적합합니다. 전체 페이지 레이아웃, 대시보드, 갤러리 등에 사용합니다. 실무에서는 둘을 함께 사용합니다: Grid로 전체 구조를 잡고, Flex로 내부 요소를 배치합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Flexbox에서 자주 사용하는 속성은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '컨테이너: display: flex, flex-direction(row/column), justify-content(main 축 정렬: center, space-between), align-items(cross 축 정렬: center, stretch), flex-wrap(줄바꿈), gap(간격). 아이템: flex-grow(남은 공간 비율), flex-shrink(축소 비율), flex-basis(기본 크기), order(순서 변경). 가장 자주 쓰는 패턴: display:flex + justify-content:center + align-items:center로 완벽한 중앙 정렬.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <FlexboxGrid />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
