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

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'JWT(JSON Web Token)란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'JWT는 당사자 간 정보를 안전하게 전송하기 위한 JSON 기반 토큰입니다. 헤더(알고리즘, 토큰 타입), 페이로드(사용자 정보, 만료시간 등 클레임), 서명의 3부분으로 구성되며 점(.)으로 구분됩니다. Base64URL로 인코딩되어 URL, HTTP 헤더, 쿠키에 안전하게 사용할 수 있습니다. 주로 API 인증, SSO(Single Sign-On)에 사용됩니다.'
      }
    },
    {
      '@type': 'Question',
      name: 'JWT의 보안 취약점과 대응 방법은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주요 취약점: ① alg:none 공격 - 서명 검증을 우회. 대응: 알고리즘을 서버에서 고정 ② 비밀키 노출 - 토큰 위조 가능. 대응: 충분히 긴 키 사용, 환경변수 관리 ③ 만료시간 없음 - 탈취 시 영구 사용. 대응: exp 클레임 필수 설정(보통 15-60분) ④ XSS로 토큰 탈취. 대응: HttpOnly 쿠키에 저장. Refresh Token과 Access Token을 분리하여 보안과 편의성을 균형잡는 것이 좋습니다.'
      }
    },
    {
      '@type': 'Question',
      name: 'JWT와 세션 인증의 차이는?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '세션 인증: 서버가 세션 ID를 생성하여 서버 메모리/DB에 저장하고, 클라이언트는 쿠키로 세션 ID를 전송합니다. 서버에 상태가 있어(stateful) 확장 시 세션 공유가 필요합니다. JWT 인증: 토큰에 모든 정보가 포함되어 서버에 상태 저장 불필요(stateless). 서버 확장이 쉽고 마이크로서비스에 적합합니다. 단점은 토큰 크기가 크고 즉시 무효화가 어렵습니다.'
      }
    }
  ]
}

export default function JwtDecoderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense fallback={<div>Loading...</div>}>
        <I18nWrapper>
          <JwtDecoder />
        </I18nWrapper>
      </Suspense>
    </>
  )
}