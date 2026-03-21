import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import CssUnitConverter from '@/components/CssUnitConverter'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/css-unit-converter/',
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
        <Breadcrumb />
            <CssUnitConverter />
            <div className="mt-8">

              <RelatedTools />

            </div>

          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            CSS 단위 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            CSS 단위 변환기는 px, rem, em, vw, vh, %, pt, cm, mm, in 등 10가지 CSS 단위를 즉시 상호 변환해주는 웹 개발 도구입니다. 반응형 웹 디자인을 구현할 때 픽셀 단위의 디자인 시안을 rem이나 vw 기반의 유연한 레이아웃으로 변환하거나, 루트 폰트 크기와 뷰포트 크기를 기준값으로 설정하여 정확한 변환 결과를 얻을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            CSS 단위 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>디자인 시안 변환:</strong> Figma 등 디자인 툴에서 px 값으로 작업된 간격, 폰트 크기를 rem으로 변환하여 접근성 친화적인 코드를 작성하세요.</li>
            <li><strong>루트 폰트 크기 설정:</strong> 프로젝트의 html 요소 기본 폰트 크기(기본 16px)에 맞게 루트 폰트 크기를 조정하면 정확한 rem 변환 결과를 확인할 수 있습니다.</li>
            <li><strong>rem vs em 선택:</strong> 전역 여백과 폰트 크기에는 rem을, 컴포넌트 내부 요소 간격처럼 부모 크기에 따라 변해야 하는 값에는 em을 사용하는 것이 일반적입니다.</li>
            <li><strong>뷰포트 단위 활용:</strong> 히어로 섹션 높이(100vh), 전체 너비 레이아웃(100vw) 등 화면 크기에 비례하는 레이아웃을 만들 때 vw·vh 변환이 유용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
