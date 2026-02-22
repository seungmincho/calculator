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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지에서 색상을 추출하는 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이미지 색상 추출은 픽셀 분석을 통해 주요 색상을 찾는 과정입니다. 주요 알고리즘: ① 중간값 절단(Median Cut): 색상 공간을 재귀적으로 분할하여 대표 색상 선정 ② K-평균 클러스터링: 유사한 색상을 그룹화하여 중심 색상 추출 ③ 옥트리(Octree): RGB 색상을 트리 구조로 분류. 브랜드 색상 참고, 디자인 컬러 팔레트 생성, 웹사이트 테마 설정 등에 활용됩니다.',
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
            <I18nWrapper><ColorExtractor /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
