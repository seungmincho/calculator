import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageCompressor from '@/components/ImageCompressor'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 압축기 - 무료 온라인 이미지 용량 줄이기 | 툴허브',
  description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요. 화질 조절, 포맷 변환, 일괄 처리를 지원합니다.',
  keywords: '이미지 압축, 사진 용량 줄이기, 이미지 최적화, JPG 압축, PNG 압축, WebP 변환, 온라인 이미지 압축',
  openGraph: {
    title: '이미지 압축기 | 툴허브',
    description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요.',
    url: 'https://toolhub.ai.kr/image-compressor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '이미지 압축기 | 툴허브', description: '무료 온라인 이미지 압축 도구' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-compressor' },
}

export default function ImageCompressorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 압축기',
    description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요.',
    url: 'https://toolhub.ai.kr/image-compressor',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['이미지 압축', '포맷 변환', '일괄 처리', '품질 조절', 'WebP 변환']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ImageCompressor />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
