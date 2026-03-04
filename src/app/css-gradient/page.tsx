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
  alternates: { canonical: 'https://toolhub.ai.kr/css-gradient/' },
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            CSS 그라디언트 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            CSS 그라디언트 생성기는 선형(linear), 방사형(radial), 원뿔형(conic) 그라데이션 CSS 코드를 직관적인 UI로 만들어주는 웹 디자인 도구입니다. 색상 조합과 방향을 마우스로 조정하면 실시간으로 미리보기와 완성된 CSS 코드가 생성되어, 복잡한 그라디언트 문법을 직접 외울 필요 없이 원하는 배경 효과를 즉시 구현할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            CSS 그라디언트 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>프리셋 활용:</strong> 인기 있는 그라디언트 조합을 프리셋으로 제공합니다. 시작점으로 프리셋을 선택한 뒤 색상을 미세 조정하면 빠르게 원하는 결과를 얻을 수 있습니다.</li>
            <li><strong>이미지 위 오버레이:</strong> 반투명 그라디언트(rgba 사용)와 배경 이미지를 콤마로 연결하면 히어로 섹션에서 텍스트 가독성을 높이는 오버레이 효과를 만들 수 있습니다.</li>
            <li><strong>원뿔형 그라디언트:</strong> conic-gradient는 파이 차트, 색상환, 로딩 스피너 등 각도 기반 디자인에 유용합니다. 순수 CSS로 도형을 그릴 때 활용해보세요.</li>
            <li><strong>다중 색상 정지점:</strong> 색상을 3개 이상 추가하고 퍼센트 위치를 조정하면 선셋, 오로라 같은 복잡한 그라데이션도 만들 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
