import { Metadata } from 'next'
import { Suspense } from 'react'
import BoxShadow from '@/components/BoxShadow'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS 박스 그림자 생성기 - Box Shadow 코드 생성 | 툴허브',
  description: 'CSS box-shadow 생성기 - 다중 레이어 그림자, Material Design, Neumorphism 프리셋, 실시간 미리보기로 완벽한 CSS 그림자 코드를 생성하세요.',
  keywords: 'CSS box-shadow, 박스 그림자, box shadow generator, CSS 그림자 생성기, Material Design shadow, neumorphism',
  openGraph: {
    title: 'CSS 박스 그림자 생성기 | 툴허브',
    description: 'CSS box-shadow 코드를 시각적으로 생성하세요',
    url: 'https://toolhub.ai.kr/box-shadow',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSS 박스 그림자 생성기 | 툴허브',
    description: 'CSS box-shadow 코드를 시각적으로 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/box-shadow',
  },
}

export default function BoxShadowPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CSS 박스 그림자 생성기',
    description: 'CSS box-shadow 코드를 시각적으로 생성',
    url: 'https://toolhub.ai.kr/box-shadow',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['다중 레이어 그림자', 'Material Design 프리셋', 'Neumorphism', '실시간 미리보기', 'CSS 코드 복사', 'PNG 내보내기'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CSS box-shadow 속성의 구성 요소는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'box-shadow는 5가지 값으로 구성됩니다: offset-x(가로 위치), offset-y(세로 위치), blur-radius(흐림 정도), spread-radius(그림자 크기 확장), color(색상). 예: box-shadow: 4px 4px 8px 0px rgba(0,0,0,0.2). inset 키워드를 추가하면 내부 그림자가 됩니다. 여러 그림자를 콤마로 구분하여 중첩할 수 있으며, 이를 활용해 뉴모피즘 등 입체적인 효과를 만듭니다.',
        },
      },
      {
        '@type': 'Question',
        name: '그림자 성능에 영향을 주나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'box-shadow는 렌더링 성능에 영향을 줄 수 있습니다. blur-radius가 클수록 GPU 리소스를 더 소모하며, 여러 개의 그림자를 중첩하면 성능 저하가 발생할 수 있습니다. 특히 모바일 기기에서 주의가 필요합니다. 성능 최적화 팁: ① will-change: box-shadow 사용 ② 애니메이션 시 가짜 그림자(::after pseudo-element) 활용 ③ 큰 blur 값보다 적절한 값 사용.',
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
              <BoxShadow />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
