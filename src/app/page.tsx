import { Metadata } from 'next'
import { Suspense } from 'react'
import HomePage from '@/components/HomePage'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '툴허브 - 126+ 무료 온라인 도구 모음 | 계산기, 개발도구, 게임',
  description: '연봉 계산기, JSON 포맷터, 이미지 편집기 등 126개 이상의 무료 온라인 도구를 한 곳에서. 금융, 개발, 건강, 미디어, 게임까지 필요한 모든 도구를 제공합니다.',
  keywords: '온라인도구, 무료계산기, 개발자도구, 연봉계산기, JSON포맷터, 이미지편집, 단위변환, QR코드생성, 게임, 툴허브',
  openGraph: {
    title: '툴허브 - 126+ 무료 온라인 도구 모음',
    description: '금융 계산기, 개발 도구, 이미지 편집, 게임까지 126개 이상의 도구를 한 곳에서',
    url: 'https://toolhub.ai.kr',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '툴허브 - 126+ 무료 온라인 도구 모음',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '툴허브 - 126+ 무료 온라인 도구 모음',
    description: '금융, 개발, 건강, 게임까지 126+ 무료 도구',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr',
  },
}

export default function Home() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '툴허브',
      alternateName: 'ToolHub',
      description: '126개 이상의 무료 온라인 도구 - 금융 계산기, 개발 도구, 이미지 편집, 게임',
      url: 'https://toolhub.ai.kr',
      inLanguage: ['ko-KR', 'en-US'],
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://toolhub.ai.kr?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: '툴허브 - 종합 온라인 도구',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '금융 계산기 35종',
        '개발 도구 55종',
        '이미지/미디어 도구 9종',
        '건강 도구 7종',
        '게임 20종'
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
      logo: 'https://toolhub.ai.kr/logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Korean', 'English']
      }
    }
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
        <I18nWrapper>
          <HomePage />
        </I18nWrapper>
      </Suspense>
    </>
  )
}
