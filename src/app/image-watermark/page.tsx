import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageWatermark from '@/components/ImageWatermark'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 워터마크 - 텍스트/이미지 워터마크 추가 | 툴허브',
  description: '이미지에 텍스트 또는 이미지 워터마크를 추가하세요. 위치, 크기, 투명도, 회전, 타일 반복 등 다양한 옵션을 지원합니다.',
  keywords: '이미지 워터마크, 사진 워터마크, 워터마크 넣기, watermark, 저작권 보호',
  openGraph: { title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가', url: 'https://toolhub.ai.kr/image-watermark', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-watermark' },
}

export default function ImageWatermarkPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 워터마크', description: '이미지에 텍스트/이미지 워터마크 추가', url: 'https://toolhub.ai.kr/image-watermark', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['텍스트 워터마크', '이미지 워터마크', '투명도 조절', '타일 반복'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ImageWatermark /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
