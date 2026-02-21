import { Metadata } from 'next'
import { Suspense } from 'react'
import CssGradient from '@/components/CssGradient'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'CSS 그라디언트 생성기 - 그라데이션 코드 생성 | 툴허브',
  description: 'CSS 그라디언트 생성기 - 선형, 방사형, 원뿔형 그라데이션 CSS 코드를 생성하세요. 색상, 방향, 위치 조절, 프리셋 제공.',
  keywords: 'CSS 그라디언트, CSS 그라데이션, gradient generator, CSS 배경, linear-gradient, 그라디언트 생성기',
  openGraph: { title: 'CSS 그라디언트 생성기 | 툴허브', description: 'CSS 그라데이션 코드 생성', url: 'https://toolhub.ai.kr/css-gradient', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'CSS 그라디언트 생성기 | 툴허브', description: 'CSS 그라데이션 코드 생성' },
  alternates: { canonical: 'https://toolhub.ai.kr/css-gradient' },
}

export default function CssGradientPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'CSS 그라디언트 생성기', description: 'CSS 그라데이션 코드 생성', url: 'https://toolhub.ai.kr/css-gradient', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['선형/방사형/원뿔형', '색상 조절', '프리셋', 'CSS 복사'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CSS 그라디언트의 종류는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CSS에서 3가지 그라디언트를 지원합니다. linear-gradient: 직선 방향으로 색상이 전환됩니다. 방향(to right, 45deg)과 색상 정지점을 지정합니다. radial-gradient: 중심에서 바깥으로 원형/타원형으로 전환됩니다. conic-gradient: 중심점을 기준으로 각도에 따라 전환되며 파이 차트 등에 활용됩니다. 여러 색상 정지점을 추가하여 복잡한 그라디언트를 만들 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '그라디언트를 배경 이미지 위에 겹치는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "CSS의 background 속성에서 그라디언트와 이미지를 콤마로 구분하여 겹칠 수 있습니다. 예: background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('image.jpg'). 그라디언트가 먼저 오면 이미지 위에 오버레이됩니다. 이 기법은 히어로 섹션에서 텍스트 가독성을 높이는 데 자주 사용됩니다.",
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><CssGradient /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
