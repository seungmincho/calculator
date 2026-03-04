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
    canonical: 'https://toolhub.ai.kr/flexbox-grid/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            CSS Flexbox & Grid 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            CSS Flexbox & Grid 생성기는 복잡한 CSS 레이아웃 속성을 GUI로 조작하면서 실시간으로 결과를 미리보고 완성된 CSS 코드를 복사할 수 있는 무료 온라인 개발 도구입니다. Flexbox의 justify-content·align-items·flex-wrap과 CSS Grid의 grid-template-columns·gap 등을 시각적으로 설정하면 반응형 웹 레이아웃 코드를 빠르게 완성할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            CSS Flexbox & Grid 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>프리셋 활용:</strong> 카드 그리드, 2단 레이아웃, 네비게이션 바 등 자주 쓰는 프리셋으로 빠르게 시작하세요.</li>
            <li><strong>Flexbox vs Grid 선택:</strong> 네비게이션·버튼 그룹 같은 1차원 정렬은 Flexbox, 전체 페이지 구조·갤러리는 Grid가 적합합니다.</li>
            <li><strong>반응형 테스트:</strong> 생성기에서 컨테이너 너비를 조절하며 모바일/태블릿/데스크톱 레이아웃을 함께 검증하세요.</li>
            <li><strong>코드 바로 사용:</strong> 복사한 CSS 코드를 Tailwind CSS 클래스나 인라인 스타일로 변환해 프로젝트에 적용할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
