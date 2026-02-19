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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ScreenInfo /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
