import { Metadata } from 'next'
import JsonXmlConverter from '@/components/JsonXmlConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'JSON/XML 변환기 | 툴허브',
  description: 'JSON을 XML로, XML을 JSON으로 상호 변환하는 개발자 도구. 실시간 구문 검증, 포맷팅, 다양한 프리셋 지원',
  keywords: [
    'JSON XML 변환',
    'JSON to XML',
    'XML to JSON',
    'JSON 변환기',
    'XML 변환기',
    'JSON XML 컨버터',
    '개발자 도구',
    'API 개발',
    'SOAP 변환',
    'RSS 변환',
    'config 파일 변환',
    '구문 검증',
    '포맷팅 도구'
  ],
  openGraph: {
    title: 'JSON/XML 변환기 | 툴허브',
    description: 'JSON을 XML로, XML을 JSON으로 상호 변환하는 개발자 도구. 실시간 구문 검증, 포맷팅, 다양한 프리셋 지원',
    type: 'website',
    locale: 'ko_KR',
    siteName: '툴허브'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JSON/XML 변환기 | 툴허브',
    description: 'JSON을 XML로, XML을 JSON으로 상호 변환하는 개발자 도구'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/json-xml-converter'
  }
}

export default function JsonXmlConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'JSON/XML 변환기',
    description: 'JSON을 XML로, XML을 JSON으로 상호 변환하는 개발자 도구. 실시간 구문 검증, 포맷팅, 다양한 프리셋 지원',
    url: 'https://toolhub.ai.kr/json-xml-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON to XML', 'XML to JSON', '구문 강조', '포맷팅']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'JSON과 XML의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JSON: 경량, 가독성 좋음, JavaScript와 호환, REST API에 주로 사용. 배열 지원, 주석 미지원. XML: 태그 기반, 스키마 검증(XSD), 네임스페이스 지원, SOAP API/기업 시스템에 사용. 속성(attribute) 지원, 주석 가능. JSON이 더 간결하고(같은 데이터에 XML보다 30-50% 작음) 파싱이 빠르지만, XML은 문서 구조 정의와 복잡한 데이터 모델링에 강합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <JsonXmlConverter />
      </I18nWrapper>
    </>
  )
}