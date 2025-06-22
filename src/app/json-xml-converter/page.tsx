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
  return (
    <I18nWrapper>
      <JsonXmlConverter />
    </I18nWrapper>
  )
}