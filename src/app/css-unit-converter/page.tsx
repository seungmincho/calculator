import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CssUnitConverter from '@/components/CssUnitConverter'

export const metadata: Metadata = {
  title: 'CSS 단위 변환기 - px, rem, em, vw, vh 변환 | 툴허브',
  description: 'CSS 단위를 즉시 변환하세요. px, rem, em, vw, vh, %, pt, cm, mm, in 상호 변환. 루트 폰트 크기, 뷰포트 크기 기준값 설정 지원.',
  keywords: 'CSS 단위 변환, px rem 변환, px em 변환, px vw 변환, CSS 단위 계산기, rem 변환기, viewport 단위',
  openGraph: {
    title: 'CSS 단위 변환기 - px, rem, em, vw, vh 변환 | 툴허브',
    description: 'px, rem, em, vw, vh, %, pt, cm, mm, in 단위를 즉시 변환',
    url: 'https://toolhub.ai.kr/css-unit-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CSS 단위 변환기 - px, rem, em, vw, vh 변환',
    description: 'CSS 단위를 즉시 변환. px, rem, em, vw, vh 등 10가지 단위 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/css-unit-converter',
  },
}

export default function CssUnitConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CSS 단위 변환기',
    description: 'CSS 단위를 즉시 변환하세요. px, rem, em, vw, vh, %, pt, cm, mm, in 상호 변환.',
    url: 'https://toolhub.ai.kr/css-unit-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'px, rem, em, vw, vh, %, pt, cm, mm, in 상호 변환',
      '루트 폰트 크기 설정',
      '부모 요소 폰트 크기 설정',
      '뷰포트 너비/높이 기준값 설정',
      '클릭하여 결과 복사',
      '단위 변환 공식 참고표',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'px를 rem으로 변환하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'rem은 루트(<html>) 요소의 폰트 크기를 기준으로 합니다. 기본 루트 폰트 크기는 보통 16px입니다. 변환 공식: rem = px ÷ 루트 폰트 크기. 예를 들어 24px ÷ 16 = 1.5rem입니다. 반대로 rem → px는 rem × 루트 폰트 크기 = px입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'vw와 vh 단위는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'vw(viewport width)는 뷰포트 너비의 1%를 의미합니다. 100vw = 전체 화면 너비. vh(viewport height)는 뷰포트 높이의 1%입니다. 100vh = 전체 화면 높이. 반응형 웹 디자인에서 화면 크기에 비례하는 레이아웃을 만들 때 유용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'rem과 em의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'rem은 루트(<html>) 요소의 폰트 크기를 기준으로 하여 항상 일정한 기준점을 가집니다. em은 현재 요소 또는 부모 요소의 폰트 크기를 기준으로 합니다. 요소가 중첩될수록 em 값이 누적되어 복잡해질 수 있습니다. 일반적으로 전역 스타일에는 rem, 컴포넌트 내부에는 em을 권장합니다.',
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
          <I18nWrapper>
            <CssUnitConverter />
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
