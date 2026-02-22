import { Metadata } from 'next'
import { Suspense } from 'react'
import ScreenInfo from '@/components/ScreenInfo'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '화면/기기 정보 - 해상도, 브라우저, OS 확인 | 툴허브',
  description: '내 화면 크기, 해상도, 뷰포트, 브라우저, OS, CPU 코어 수 등 기기 정보를 한눈에 확인하세요. 웹 개발, 기술 지원에 유용합니다.',
  keywords: '화면 크기 확인, 해상도 확인, 뷰포트 크기, 내 화면 해상도, screen resolution, 브라우저 정보',
  openGraph: { title: '화면/기기 정보 | 툴허브', description: '화면 해상도, 브라우저, OS 정보 확인', url: 'https://toolhub.ai.kr/screen-info', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '화면/기기 정보 | 툴허브', description: '화면 해상도, 브라우저, OS 정보 확인' },
  alternates: { canonical: 'https://toolhub.ai.kr/screen-info' },
}

export default function ScreenInfoPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면/기기 정보', description: '화면 해상도, 뷰포트, 브라우저, OS 정보 확인', url: 'https://toolhub.ai.kr/screen-info', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['화면 해상도/뷰포트', '브라우저 정보', '기기 정보', '전체 복사'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '화면 해상도와 관련 용어는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '해상도: 화면의 픽셀 수 (예: 1920×1080 = FHD). 주요 해상도: HD(1280×720), FHD(1920×1080), QHD/2K(2560×1440), 4K/UHD(3840×2160). DPI/PPI: 인치당 픽셀 수, 높을수록 선명. 일반 모니터 96-110ppi, 레티나 디스플레이 220+ppi. Device Pixel Ratio: CSS 픽셀과 물리 픽셀의 비율 (레티나는 2x 또는 3x). 색 심도: 8bit(1,670만 색), 10bit(10억 색).',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ScreenInfo /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
