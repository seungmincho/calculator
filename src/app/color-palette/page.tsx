import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorPalette from '@/components/ColorPalette'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '색상 팔레트 생성기 - 조화로운 색상 조합 | 툴허브',
  description: '색상 팔레트 생성기 - 기준 색상에서 보색, 유사색, 삼색 등 조화로운 색상 조합을 자동 생성합니다. CSS/JSON/Tailwind 내보내기.',
  keywords: '색상 팔레트, color palette generator, 보색, 유사색, 색상 조합, 컬러 팔레트',
  openGraph: { title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성', url: 'https://toolhub.ai.kr/color-palette', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-palette/' },
}

export default function ColorPalettePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색상 팔레트 생성기', description: '조화로운 색상 조합 생성', url: 'https://toolhub.ai.kr/color-palette', applicationCategory: 'DesignApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['보색/유사색/삼색', 'CSS 변수 내보내기', 'Tailwind 설정', '팔레트 저장'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색상 팔레트 생성 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주요 색상 조화 이론: ① 보색(Complementary): 색상환에서 정반대 색상, 강한 대비 ② 유사색(Analogous): 인접한 3개 색상, 자연스러운 조화 ③ 삼각형(Triadic): 120도 간격 3개 색상, 균형 잡힌 대비 ④ 분할보색(Split-complementary): 보색의 양 옆 색상 사용 ⑤ 단색(Monochromatic): 한 색상의 밝기/채도 변형. 60-30-10 법칙(주색 60%, 보조색 30%, 강조색 10%)이 기본입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '브랜드 색상을 선택하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색상 심리학 기본: 빨강(열정, 긴급), 파랑(신뢰, 전문성 - 삼성, IBM), 초록(자연, 건강 - 스타벅스), 노랑(낙관, 에너지 - 카카오), 보라(창의, 고급 - 컬리), 검정(고급, 세련됨 - 샤넬). 산업별 관행: 금융=파랑, 식품=빨강/주황, IT=파랑/보라. 경쟁사와 차별화하면서 타겟 고객의 감성에 맞는 색상을 선택하고, 접근성 기준(대비 4.5:1 이상)을 충족해야 합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ColorPalette />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              색상 팔레트 생성기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              색상 팔레트 생성기는 <strong>기준 색상 하나를 입력하면 보색·유사색·삼각형·단색 등 색채 이론에 기반한 조화로운 색상 조합을 자동으로 생성</strong>하는 무료 도구입니다. 생성된 팔레트는 CSS 변수, JSON, Tailwind CSS 설정 파일로 내보낼 수 있어 웹 개발과 UI 디자인에 바로 적용할 수 있습니다. 브랜드 색상 개발, 웹사이트 테마 구성, 디자인 시스템 구축에 활용하세요.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              색상 팔레트 생성기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>60-30-10 법칙:</strong> 주색 60%, 보조색 30%, 강조색 10%로 배분하면 균형 잡힌 디자인이 됩니다.</li>
              <li><strong>보색 대비:</strong> 강렬한 인상을 줄 때는 보색 조합을, 부드러운 느낌에는 유사색 조합을 사용하세요.</li>
              <li><strong>CSS 변수 활용:</strong> 생성된 CSS 변수 코드를 `:root`에 넣으면 다크모드 전환도 쉽게 구현됩니다.</li>
              <li><strong>Tailwind 내보내기:</strong> `tailwind.config.js`의 `colors`에 붙여넣으면 커스텀 색상을 즉시 사용할 수 있습니다.</li>
              <li><strong>접근성 확인:</strong> 팔레트 완성 후 색상 변환기의 대비 비율 확인으로 WCAG 기준을 충족했는지 검증하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
