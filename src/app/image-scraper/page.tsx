import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageScraper from '@/components/ImageScraper'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 스크래퍼 - 웹페이지 이미지 일괄 다운로드 | 툴허브',
  description: '웹페이지 URL을 입력하면 모든 이미지를 자동 수집합니다. ZIP 일괄 다운로드, 세로 이미지 합치기, 크기·형식 필터 지원. 무료 온라인 이미지 추출 도구.',
  keywords: '이미지 스크래퍼, 이미지 다운로드, 웹페이지 이미지 추출, 이미지 일괄 다운로드, 이미지 합치기, image scraper, bulk image download',
  openGraph: {
    title: '이미지 스크래퍼 - 웹페이지 이미지 일괄 다운로드 | 툴허브',
    description: '웹페이지의 모든 이미지를 자동 수집하고 ZIP 다운로드 또는 세로 이미지로 합치기',
    url: 'https://toolhub.ai.kr/image-scraper',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 스크래퍼',
    description: '웹페이지의 모든 이미지를 자동 수집하고 일괄 다운로드',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/image-scraper/',
  },
}

export default function ImageScraperPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 스크래퍼',
    description: '웹페이지 URL을 입력하면 모든 이미지를 자동 수집하고 ZIP 일괄 다운로드 또는 세로 이미지 합치기를 지원합니다.',
    url: 'https://toolhub.ai.kr/image-scraper',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '웹페이지 이미지 자동 수집',
      'ZIP 일괄 다운로드',
      '세로 이미지 합치기',
      '크기·형식 필터',
      '이미지 미리보기',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지 스크래퍼로 어떤 사이트의 이미지를 다운로드할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '대부분의 공개 웹페이지에서 이미지를 수집할 수 있습니다. img 태그, background-image, srcset 등 다양한 방식의 이미지를 자동 감지합니다. 단, 로그인이 필요하거나 CORS 정책으로 차단된 사이트는 제한될 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '중복 이미지는 어떻게 처리되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Perceptual Hash(지각적 해시) 알고리즘으로 시각적으로 유사한 이미지를 자동 감지하여 중복을 제거합니다. 8x8 Canvas 지문을 비교하여 90% 이상 유사한 이미지를 필터링합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '세로 합치기 기능은 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이미지를 선택한 후 "세로 합치기" 버튼을 클릭하면 선택한 이미지들을 위에서 아래로 이어붙인 하나의 긴 이미지로 만들 수 있습니다. 드래그앤드롭으로 순서를 변경하고, 너비/간격/배경색을 설정할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ImageScraper />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
