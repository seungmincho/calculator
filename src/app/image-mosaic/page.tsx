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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지 모자이크란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이미지 모자이크(Pixelation)는 이미지의 특정 영역을 블록화하여 식별할 수 없게 만드는 기법입니다. 개인정보 보호를 위해 얼굴, 차량 번호판, 주소 등을 가릴 때 사용합니다. 원리: 선택 영역을 큰 픽셀 블록으로 분할하고 각 블록의 평균 색상으로 채워 세부 정보를 제거합니다. 이 도구는 브라우저에서 Canvas API로 처리하므로 서버에 이미지가 전송되지 않습니다.',
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
            <I18nWrapper><ImageMosaic /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
