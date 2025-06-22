import { Suspense } from 'react'
import { Metadata } from 'next'
import JwtDecoder from '@/components/JwtDecoder'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'JWT 디코더 | 툴허브 - JWT 토큰 분석 및 검증',
  description: 'JWT 토큰을 안전하게 디코드하고 분석하세요. Header, Payload, Signature를 명확히 분리하여 표시하고 토큰 유효성을 검증합니다.',
  keywords: 'JWT, JSON Web Token, 디코더, 토큰 분석, 토큰 검증, Base64 디코딩, 개발자 도구',
  openGraph: {
    title: 'JWT 디코더 - JWT 토큰 분석 및 검증 도구',
    description: 'JWT 토큰을 안전하게 디코드하고 분석하세요. Header, Payload, Signature를 명확히 분리하여 표시합니다.',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JWT 디코더 - JWT 토큰 분석 및 검증 도구',
    description: 'JWT 토큰을 안전하게 디코드하고 분석하세요. Header, Payload, Signature를 명확히 분리하여 표시합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/jwt-decoder',
  },
}

// JSON-LD structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'JWT 디코더',
  description: 'JWT 토큰을 안전하게 디코드하고 분석하는 무료 온라인 도구',
  url: 'https://toolhub.ai.kr/jwt-decoder',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  permissions: 'browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  featureList: [
    'JWT 토큰 디코딩',
    'Header, Payload, Signature 분리 표시',
    '토큰 유효성 검증',
    '실시간 Base64 디코딩',
    '보안 정보 안내',
    '다국어 지원'
  ]
}

export default function JwtDecoderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div>Loading...</div>}>
        <I18nWrapper>
          <JwtDecoder />
        </I18nWrapper>
      </Suspense>
    </>
  )
}