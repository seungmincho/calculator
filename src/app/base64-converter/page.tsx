import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Base64Converter from '@/components/Base64Converter'

export const metadata: Metadata = {
  title: 'Base64 인코더/디코더 - 텍스트, 이미지 변환 | 툴허브',
  description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
  keywords: 'base64, 인코더, 디코더, 인코딩, 디코딩, 변환, 이미지변환, 텍스트변환',
  openGraph: {
    title: 'Base64 인코더/디코더 - 온라인 변환 도구',
    description: '텍스트와 파일을 Base64로 인코딩/디코딩하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/base64-converter',
  },
}

export default function Base64ConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Base64 변환기',
    description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
    url: 'https://toolhub.ai.kr/base64-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Base64 인코딩', 'Base64 디코딩', '파일 변환', 'URL-safe Base64']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Base64 인코딩이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Base64는 바이너리 데이터를 ASCII 문자열로 변환하는 인코딩 방식입니다. A-Z, a-z, 0-9, +, / 총 64개 문자를 사용하며, 패딩에 = 문자를 사용합니다. 주요 용도: ① 이메일 첨부파일(MIME) ② HTML/CSS에 이미지 인라인 삽입(data URI) ③ API 인증 토큰(Basic Auth) ④ JWT 토큰 페이로드. 인코딩 후 크기는 원본의 약 133%로 증가합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Base64와 URL-safe Base64의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '표준 Base64는 +, /, = 문자를 사용하는데, 이들은 URL에서 특수한 의미를 가져 문제를 일으킵니다. URL-safe Base64는 +를 -, /를 _로 대체하고, 패딩(=)을 생략합니다. JWT 토큰, URL 파라미터, 파일명에는 URL-safe Base64를 사용해야 합니다. RFC 4648에 정의되어 있으며, 대부분의 프로그래밍 언어에서 지원됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <Base64Converter />
      </I18nWrapper>
    </>
  )
}
