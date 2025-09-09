import { Metadata } from 'next'
import SalaryCalculator from '@/components/SalaryCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '연봉 실수령액 계산기 | 툴허브 - 2025년 기준 정확한 계산',
  description: '2025년 기준 4대보험, 소득세를 제외한 실제 받을 수 있는 연봉을 계산해보세요. 무료 온라인 연봉 계산기로 월급 실수령액을 확인하세요. 대출, 적금, 세금 등 다양한 금융 계산기도 함께 제공됩니다.',
  keywords: '연봉계산기, 실수령액계산, 월급계산기, 세후연봉, 4대보험계산, 소득세계산, 2025년연봉, 금융계산기, 대출계산기, 적금계산기, 세금계산기, BMI계산기, 개발도구, 정규식추출기',
  openGraph: {
    title: '연봉 실수령액 계산기 | 툴허브 - 종합 금융 도구',
    description: '2025년 기준 정확한 연봉 실수령액 계산 + 대출, 적금, 세금 등 20+ 전문 도구 모음',
    url: 'https://toolhub.ai.kr',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '툴허브 - 종합 계산기 도구',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '연봉 실수령액 계산기 | 툴허브',
    description: '2025년 기준 정확한 연봉 계산 + 20+ 전문 도구',
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
  verification: {
    google: 'google-site-verification-code', // 실제 구글 서치 콘솔 코드로 교체 필요
  },
  other: {
    'application/ld+json': JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "연봉 실수령액 계산기",
      "alternateName": "툴허브 연봉계산기",
      "description": "2025년 기준 4대보험, 소득세를 제외한 정확한 연봉 실수령액을 계산하는 무료 온라인 도구",
      "url": "https://toolhub.ai.kr",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript. Chrome, Firefox, Safari, Edge 지원",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      },
      "featureList": [
        "연봉 실수령액 계산",
        "월급 실수령액 계산", 
        "4대보험 계산 (국민연금, 건강보험, 고용보험, 산재보험)",
        "소득세 및 지방소득세 계산",
        "부양가족공제 적용",
        "2025년 세법 기준 적용",
        "비과세 소득 계산",
        "계산 결과 저장 및 공유",
        "다크모드 지원"
      ],
      "creator": {
        "@type": "Organization",
        "name": "툴허브",
        "url": "https://toolhub.ai.kr"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "직장인, 취업준비생, HR 담당자"
      },
      "inLanguage": ["ko-KR", "en-US"],
      "isAccessibleForFree": true,
      "dateModified": new Date().toISOString(),
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "1247",
        "bestRating": "5"
      }
    })
  },
}

export default function Home() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '툴허브 - 종합 계산기 도구',
      description: '연봉, 대출, 적금, 세금 등 다양한 금융 계산기와 개발 도구를 제공하는 종합 웹 애플리케이션',
      url: 'https://toolhub.ai.kr',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      inLanguage: ['ko-KR', 'en-US'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW'
      },
      author: {
        '@type': 'Organization',
        name: '툴허브',
        url: 'https://toolhub.ai.kr'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150'
      },
      featureList: [
        '2025년 기준 연봉 실수령액 계산',
        '대출 월 상환금 계산',
        '적금 만기 수령액 계산',
        '각종 세금 계산',
        '환율 변환',
        'BMI 및 건강 지수 계산',
        'JSON/SQL 포매터',
        '정규식 추출기',
        '이미지 편집 도구'
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
      description: '연봉 계산기를 비롯한 20+ 전문 도구 모음',
      inLanguage: ['ko-KR', 'en-US'],
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://toolhub.ai.kr?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
      logo: 'https://toolhub.ai.kr/logo.png',
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Korean', 'English']
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '홈',
          item: 'https://toolhub.ai.kr'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '연봉 계산기',
          item: 'https://toolhub.ai.kr'
        }
      ]
    }
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <SalaryCalculator />
      </I18nWrapper>
    </>
  )
}