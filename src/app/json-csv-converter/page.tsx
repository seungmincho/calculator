import { Metadata } from 'next'
import JsonCsvConverter from '@/components/JsonCsvConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'JSON ↔ CSV 변환기 | 툴허브 - 고성능 데이터 변환',
  description: '대용량 JSON과 CSV 파일을 빠르게 변환하세요. Web Workers를 활용한 고성능 처리, 드래그 앤 드롭 지원, 다양한 포맷 프리셋으로 개발자들이 편리하게 사용할 수 있습니다.',
  keywords: 'JSON변환기, CSV변환기, 데이터변환, JSON to CSV, CSV to JSON, 고성능변환, Web Workers, 대용량파일, 개발도구, 데이터처리',
  openGraph: {
    title: 'JSON ↔ CSV 변환기 | 툴허브',
    description: '고성능 JSON-CSV 변환기 + 대용량 파일 처리 + 개발자 친화적 옵션',
    url: 'https://toolhub.ai.kr/json-csv-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
}

export default function JsonCsvConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'JSON-CSV 변환기',
    description: '고성능 JSON과 CSV 상호 변환 도구',
    url: 'https://toolhub.ai.kr/json-csv-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <JsonCsvConverter />
      </I18nWrapper>
    </>
  )
}