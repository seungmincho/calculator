import { Metadata } from 'next'
import JsonCsvConverter from '@/components/JsonCsvConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'JSON ↔ CSV 변환기 - 데이터 변환 | 툴허브',
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
  alternates: {
    canonical: 'https://toolhub.ai.kr/json-csv-converter/',
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'JSON과 CSV의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JSON(JavaScript Object Notation): 중첩 구조, 다양한 데이터 타입(문자열, 숫자, 배열, 객체, boolean, null) 지원, API 통신에 적합. CSV(Comma-Separated Values): 평면적 테이블 구조, 텍스트 값만 지원, 스프레드시트/데이터 분석에 적합. JSON은 복잡한 데이터를 표현할 수 있지만 CSV보다 파일 크기가 큽니다. CSV는 엑셀에서 바로 열 수 있어 비개발자와의 데이터 공유에 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'JSON을 CSV로 변환할 때 주의할 점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 중첩 객체: JSON의 중첩 구조는 CSV의 평면 구조에 맞지 않아 \'점 표기법\'(address.city)이나 JSON 문자열로 처리 ② 배열 값: 세미콜론 등 다른 구분자로 연결하거나 별도 행으로 분리 ③ 특수문자: 쉼표, 줄바꿈, 큰따옴표가 포함된 값은 큰따옴표로 감싸야 함 ④ 인코딩: 한글이 포함된 CSV는 UTF-8 BOM을 추가해야 엑셀에서 깨지지 않음.',
        },
      },
    ],
  }

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
      <I18nWrapper>
        <JsonCsvConverter />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            JSON ↔ CSV 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            JSON-CSV 변환기는 API에서 받은 JSON 데이터를 엑셀에서 쓸 수 있는 CSV로, 또는 스프레드시트 CSV 데이터를 웹 애플리케이션용 JSON으로 빠르게 변환해주는 개발자 도구입니다. Web Workers를 활용한 고성능 처리로 대용량 파일도 빠르게 변환하며, 드래그 앤 드롭 파일 업로드와 다양한 인코딩 옵션을 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            JSON ↔ CSV 변환 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>엑셀에서 한글 깨짐 방지:</strong> CSV를 엑셀에서 열 때 한글이 깨지면 UTF-8 BOM 옵션을 선택하여 내보내세요.</li>
            <li><strong>중첩 JSON 변환:</strong> JSON의 중첩 객체는 CSV로 변환 시 점 표기법(user.name)으로 평면화됩니다.</li>
            <li><strong>API 응답 데이터 분석:</strong> REST API에서 받은 JSON 응답을 CSV로 변환하여 엑셀에서 데이터 분석을 진행하세요.</li>
            <li><strong>구분자 선택:</strong> 쉼표(,) 외에도 탭(\t)이나 세미콜론(;) 구분자를 선택할 수 있어 다양한 데이터 포맷과 호환됩니다.</li>
            <li><strong>배열 데이터 처리:</strong> JSON 배열의 각 항목이 CSV의 각 행으로 변환됩니다. 최상위 배열 구조를 확인하고 변환하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}