import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorPalette from '@/components/ColorPalette'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '색상 팔레트 생성기 - 조화로운 색상 조합 | 툴허브',
  description: '색상 팔레트 생성기 - 기준 색상에서 보색, 유사색, 삼색 등 조화로운 색상 조합을 자동 생성합니다. CSS/JSON/Tailwind 내보내기.',
  keywords: '색상 팔레트, color palette generator, 보색, 유사색, 색상 조합, 컬러 팔레트',
  openGraph: { title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성', url: 'https://toolhub.ai.kr/color-palette', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '색상 팔레트 생성기 | 툴허브', description: '조화로운 색상 조합 생성' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-palette' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ColorPalette /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
