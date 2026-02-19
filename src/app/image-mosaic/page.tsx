import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageMosaic from '@/components/ImageMosaic'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '사진 모자이크/블러 - 이미지 모자이크, 얼굴 블러 처리 | 툴허브',
  description: '사진에 모자이크나 블러를 적용하세요. 영역 선택 또는 브러시로 원하는 부분만 모자이크/블러 처리할 수 있습니다. 개인정보 보호에 필수!',
  keywords: '모자이크, 블러, 사진 모자이크, 이미지 블러, 얼굴 모자이크, 개인정보 보호, 사진 편집',
  openGraph: {
    title: '사진 모자이크/블러 | 툴허브',
    description: '사진에 모자이크/블러를 간편하게 적용하세요!',
    url: 'https://toolhub.ai.kr/image-mosaic',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '사진 모자이크/블러 | 툴허브', description: '사진에 모자이크/블러를 적용하세요!' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-mosaic' },
}

export default function ImageMosaicPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '사진 모자이크/블러', description: '사진 모자이크 및 블러 처리 도구',
    url: 'https://toolhub.ai.kr/image-mosaic', applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['영역 선택 모자이크', '브러시 모자이크', '블러 효과', '강도 조절', '되돌리기', 'PNG/JPEG 다운로드'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><ImageMosaic /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
