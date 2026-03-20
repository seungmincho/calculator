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
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/json-xml-converter',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JSON/XML 변환기 | 툴허브',
    description: 'JSON을 XML로, XML을 JSON으로 상호 변환하는 개발자 도구'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/json-xml-converter/'
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            JSON ↔ XML 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            JSON-XML 변환기는 REST API의 JSON 데이터를 레거시 시스템이나 SOAP API에서 사용하는 XML로, 또는 XML 데이터를 현대적인 JSON으로 상호 변환하는 개발자 도구입니다. 실시간 구문 강조와 유효성 검증을 제공하며, RSS 피드 변환, 설정 파일 변환, 기업 시스템 연동 시 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            JSON ↔ XML 변환 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SOAP API 연동:</strong> 현대 REST API의 JSON 응답을 SOAP 방식의 XML로 변환하거나 레거시 XML 데이터를 JSON으로 변환하여 시스템을 연동하세요.</li>
            <li><strong>RSS 피드 변환:</strong> RSS/Atom XML 피드를 JSON으로 변환하면 JavaScript 앱에서 쉽게 처리할 수 있습니다.</li>
            <li><strong>XML 속성 처리:</strong> XML의 attribute는 JSON 변환 시 '@attributes' 키로 매핑됩니다. 변환 결과를 확인하고 필요에 따라 조정하세요.</li>
            <li><strong>네임스페이스 주의:</strong> XML 네임스페이스(xmlns)가 있는 문서는 변환 후 키 이름에 접두사가 붙을 수 있습니다.</li>
            <li><strong>설정 파일 변환:</strong> Maven의 pom.xml이나 Android의 AndroidManifest.xml을 JSON으로 변환하여 구조를 파악하는 데 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}