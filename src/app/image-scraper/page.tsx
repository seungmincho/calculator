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
    canonical: 'https://toolhub.ai.kr/image-scraper',
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
