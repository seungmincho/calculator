import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageOcr from '@/components/ImageOcr'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 텍스트 추출 (OCR) - 사진에서 글자 인식 | 툴허브',
  description: '이미지에서 텍스트를 추출하는 OCR 도구입니다. 한국어, 영어, 일본어, 중국어를 지원하며, 추출된 텍스트를 복사하거나 다운로드할 수 있습니다.',
  keywords: 'OCR, 이미지 텍스트 추출, 사진 글자 인식, 텍스트 인식, 광학문자인식',
  openGraph: { title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-ocr' },
}

export default function ImageOcrPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 텍스트 추출 (OCR)', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한국어 OCR', '영어 OCR', '일본어 OCR', '텍스트 복사', '결과 다운로드'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ImageOcr /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
