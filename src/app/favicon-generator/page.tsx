import { Metadata } from 'next'
import { Suspense } from 'react'
import FaviconGenerator from '@/components/FaviconGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/favicon-generator/',
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
        <Breadcrumb />
              <FaviconGenerator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            파비콘 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            파비콘 생성기는 로고 이미지 하나를 업로드하면 웹(16×16, 32×32), iOS(Apple Touch Icon 180×180), Android Chrome(192×192, 512×512), Windows 타일(150×150) 등 21가지 크기의 파비콘을 자동으로 생성합니다. HTML 코드, Next.js 설정, site.webmanifest, browserconfig.xml까지 한 번에 제공하여 별도 개발 없이 웹사이트 아이콘을 완성할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            파비콘 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>원본 이미지 품질:</strong> 최소 512×512px 이상의 정사각형 PNG(투명 배경) 이미지를 업로드하면 모든 사이즈에서 선명하게 렌더링됩니다.</li>
            <li><strong>ZIP 일괄 다운로드:</strong> 생성된 파비콘 파일 전체를 ZIP으로 한 번에 다운로드하여 public 폴더에 바로 넣으세요.</li>
            <li><strong>Next.js 통합:</strong> 제공된 Next.js 코드를 layout.tsx의 metadata.icons에 그대로 붙여넣으면 바로 적용됩니다.</li>
            <li><strong>PWA 필수 아이콘:</strong> Android Chrome 192×192, 512×512 아이콘은 PWA(Progressive Web App) 설치에 반드시 필요합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
