import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageConverter from '@/components/ImageConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 변환기 - JPEG/PNG/WebP 포맷 변환 | 툴허브',
  description: '이미지 변환기 - JPEG, PNG, WebP, GIF 등 이미지 파일 형식을 변환합니다. 품질 조절, 미리보기, 일괄 변환 지원.',
  keywords: '이미지 변환기, 이미지 포맷 변환, JPEG PNG 변환, WebP 변환, image converter',
  openGraph: { title: '이미지 변환기 | 툴허브', description: 'JPEG/PNG/WebP 이미지 포맷 변환', url: 'https://toolhub.ai.kr/image-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 변환기 | 툴허브', description: 'JPEG/PNG/WebP 이미지 포맷 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-converter' },
}

export default function ImageConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 변환기', description: 'JPEG/PNG/WebP 이미지 포맷 변환', url: 'https://toolhub.ai.kr/image-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['포맷 변환', '품질 조절', '일괄 변환', '미리보기'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ImageConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
