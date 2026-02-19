import { Metadata } from 'next'
import { Suspense } from 'react'
import CodeScreenshot from '@/components/CodeScreenshot'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '코드 스크린샷 - 코드를 예쁜 이미지로 변환 | 툴허브',
  description: '코드 스크린샷 생성기 - 코드를 아름다운 이미지로 변환하세요. 8가지 테마, 그라디언트 배경, 구문 강조, PNG/SVG 내보내기를 지원합니다.',
  keywords: '코드 스크린샷, code screenshot, Carbon, 코드 이미지, 코드 캡처, syntax highlighting, 코드 공유',
  openGraph: {
    title: '코드 스크린샷 생성기 | 툴허브',
    description: '코드를 아름다운 이미지로 변환하세요',
    url: 'https://toolhub.ai.kr/code-screenshot',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '코드 스크린샷 생성기 | 툴허브',
    description: '코드를 예쁜 이미지로 변환',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/code-screenshot',
  },
}

export default function CodeScreenshotPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '코드 스크린샷 생성기',
    description: '코드를 아름다운 이미지로 변환',
    url: 'https://toolhub.ai.kr/code-screenshot',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['8가지 테마', '그라디언트 배경', '구문 강조', 'PNG/SVG 내보내기', '클립보드 복사'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <CodeScreenshot />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
