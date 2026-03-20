import { Metadata } from 'next'
import { Suspense } from 'react'
import WebserverConfig from '@/components/WebserverConfig'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '웹서버 설정 생성기 - Nginx·Caddy | 툴허브',
  description: 'Nginx, Caddy 웹서버 설정 파일을 상황별 베스트 프리셋으로 자동 생성합니다. 리버스 프록시, SSL, SPA, 로드 밸런서, API 게이트웨이 설정을 간편하게 만드세요.',
  keywords: '웹서버 설정, Nginx 설정 생성기, Caddy 설정, 리버스 프록시, SSL 설정, Nginx config generator, Caddy config, reverse proxy, load balancer',
  openGraph: {
    title: '웹서버 설정 생성기 | 툴허브',
    description: 'Nginx, Caddy 설정 파일을 상황별 베스트 프리셋으로 자동 생성',
    url: 'https://toolhub.ai.kr/webserver-config/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '웹서버 설정 생성기',
    description: 'Nginx, Caddy 설정 파일을 상황별 베스트 프리셋으로 자동 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/webserver-config/',
  },
}

export default function WebserverConfigPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '웹서버 설정 생성기',
    description: 'Nginx, Caddy 웹서버 설정 파일을 상황별 베스트 프리셋으로 자동 생성합니다.',
    url: 'https://toolhub.ai.kr/webserver-config',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'Nginx 설정 생성',
      'Caddy 설정 생성',
      '상황별 베스트 프리셋',
      '리버스 프록시, SSL, SPA, 로드 밸런서 지원',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <WebserverConfig />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
