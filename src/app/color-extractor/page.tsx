import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorExtractor from '@/components/ColorExtractor'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 색상 추출기 - 컬러 피커, 팔레트 추출 | 툴허브',
  description: '이미지에서 색상을 추출하세요. 클릭으로 색상 픽킹, 자동 팔레트 추출, HEX/RGB/HSL 변환, CSS/Tailwind 내보내기를 지원합니다.',
  keywords: '색상 추출기, 컬러 피커, 이미지 색상, 팔레트 추출, color picker, 색상 추출, HEX, RGB',
  openGraph: {
    title: '이미지 색상 추출기 | 툴허브',
    description: '이미지에서 색상을 추출하고 팔레트를 만드세요!',
    url: 'https://toolhub.ai.kr/color-extractor',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '이미지 색상 추출기 | 툴허브', description: '이미지에서 색상을 추출하세요!' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-extractor' },
}

export default function ColorExtractorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '이미지 색상 추출기', description: '이미지에서 색상 추출 및 팔레트 생성',
    url: 'https://toolhub.ai.kr/color-extractor', applicationCategory: 'DesignApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['클릭 색상 추출', '자동 팔레트 추출', 'HEX/RGB/HSL 변환', 'CSS/Tailwind 내보내기', '돋보기 기능'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><ColorExtractor /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
