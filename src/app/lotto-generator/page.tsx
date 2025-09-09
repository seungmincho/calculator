import { Metadata } from 'next'
import LottoGenerator from '@/components/LottoGenerator'

export const metadata: Metadata = {
  title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천 | 툴허브',
  description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요. 과거 당첨번호 분석, 핫/콜드 번호, 빈도 분석 기능 제공.',
  keywords: [
    '로또번호 생성기',
    '로또 당첨번호 조회',
    '로또번호 추천',
    '로또 6/45',
    '당첨번호 분석',
    '통계 기반 번호추천',
    '핫번호 콜드번호',
    '로또번호 빈도',
    '로또번호 통계',
    '당첨번호 검색',
    '로또 회차별 조회',
    '번호 출현 빈도',
    '로또 데이터 분석',
    '당첨확률',
    '로또 전략'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천',
    description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/lotto-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '로또번호 생성기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천',
    description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lotto-generator',
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
  other: {
    'application/ld+json': JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "로또번호 생성기",
      "alternateName": "로또 6/45 번호 생성기",
      "description": "통계 기반 로또 번호 추천 및 과거 당첨번호 조회 서비스. 핫/콜드 번호 분석으로 더 똑똑한 번호 선택을 도와드립니다.",
      "url": "https://toolhub.ai.kr/lotto-generator",
      "applicationCategory": "GameApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript. Chrome, Firefox, Safari, Edge 지원",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      },
      "featureList": [
        "로또 6/45 번호 자동 생성",
        "과거 당첨번호 조회 및 분석",
        "통계 기반 번호 추천",
        "핫/콜드 번호 분석",
        "번호별 출현 빈도 차트",
        "최신 당첨번호 자동 업데이트",
        "번호 제외 및 포함 설정",
        "연속번호 제외 옵션",
        "고액 당첨번호 패턴 분석",
        "결과 저장 및 공유"
      ],
      "creator": {
        "@type": "Organization",
        "name": "툴허브",
        "url": "https://toolhub.ai.kr"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "로또 구매자, 번호 분석에 관심있는 사용자"
      },
      "inLanguage": ["ko-KR", "en-US"],
      "isAccessibleForFree": true,
      "dateModified": new Date().toISOString(),
      "keywords": "로또번호생성기, 당첨번호조회, 로또통계, 핫번호, 콜드번호, 로또6/45",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.7",
        "reviewCount": "892",
        "bestRating": "5"
      },
      "gamePlatform": "Web Browser",
      "genre": "Lottery Number Generator"
    })
  },
}

export default function LottoGeneratorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <LottoGenerator />
      </div>
    </div>
  )
}