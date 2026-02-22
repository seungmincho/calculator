import { Metadata } from 'next'
import { Suspense } from 'react'
import FaviconGenerator from '@/components/FaviconGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '파비콘 생성기 - 모든 사이즈 자동 생성 | 툴허브',
  description: '이미지를 업로드하면 웹, iOS, Android, Windows 등 모든 플랫폼에 필요한 파비콘을 한 번에 생성합니다. HTML 코드와 Next.js 설정 예시도 함께 제공됩니다.',
  keywords: '파비콘생성기, favicon generator, 파비콘만들기, apple-touch-icon, android-chrome, 웹아이콘, 사이트아이콘, ico생성',
  openGraph: {
    title: '파비콘 생성기 - 모든 사이즈 자동 생성 | 툴허브',
    description: '이미지 하나로 웹, iOS, Android, Windows 등 모든 파비콘 한 번에 생성',
    url: 'https://toolhub.ai.kr/favicon-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '파비콘 생성기 | 툴허브',
    description: '모든 플랫폼 파비콘 한 번에 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/favicon-generator',
  },
}

export default function FaviconGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '파비콘 생성기',
    description: '이미지를 업로드하면 웹, iOS, Android, Windows 등 모든 플랫폼에 필요한 파비콘을 한 번에 생성합니다.',
    url: 'https://toolhub.ai.kr/favicon-generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '21종 파비콘 자동 생성',
      'Apple Touch Icon 지원',
      'Android Chrome 아이콘 지원',
      'Microsoft Tile 지원',
      'ZIP 일괄 다운로드',
      'HTML 코드 자동 생성',
      'Next.js 설정 코드 제공',
      'site.webmanifest 자동 생성',
      'browserconfig.xml 자동 생성',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '파비콘이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "파비콘(favicon)은 웹사이트 브라우저 탭, 북마크, 검색 결과에 표시되는 작은 아이콘입니다. 'favorites icon'의 줄임말입니다. 필요한 크기: 16×16(브라우저 탭), 32×32(북마크), 180×180(Apple Touch Icon), 192×192/512×512(PWA). ICO 형식이 전통적이지만, 최신 브라우저는 PNG, SVG도 지원합니다. 브랜드 인지도와 사용자 경험에 중요한 요소입니다.",
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
            <I18nWrapper>
              <FaviconGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
