import { Metadata } from 'next'
import JsonCsvConverter from '@/components/JsonCsvConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = 'JSON ↔ CSV 변환기 - 여러 줄 셀·문자열 보존 | 툴허브'
const DESCRIPTION = 'JSON과 CSV를 브라우저 Worker에서 변환하고 작업을 취소할 수 있습니다. 여러 줄 셀·문자열을 보존하며 긴 결과는 나눠 확인하고 전체 내용을 복사·다운로드하세요. UTF-8·EUC-KR 파일 읽기와 복사 실패 복구를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'JSON변환기, CSV변환기, 데이터변환, JSON to CSV, CSV to JSON, 여러줄CSV, 문자열보존, UTF-8, EUC-KR, 개발도구',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/json-csv-converter/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/json-csv-converter.png', width: 1200, height: 630, alt: 'JSON ↔ CSV 변환기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/json-csv-converter.png'],
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
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/json-csv-converter/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    featureList: ['CSV 인용 셀의 줄바꿈·공백 보존', 'CSV 값의 기본 문자열 보존과 선택적 숫자 변환', '중첩 JSON·배열 처리와 키 충돌 검사', 'Worker 변환·파일 디코딩과 작업 취소', '긴 텍스트 페이지·1,000개 이하 데이터 셀 미리보기와 전체 결과 반출', 'UTF-8·EUC-KR 파일 읽기와 UTF-8 출력', '실패한 복사의 전체 원문 선택·재시도'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    }
  }

  const faq = [
    { q: '여러 줄 셀과 00123 같은 식별자는 어떻게 처리하나요?', a: '큰따옴표로 감싼 CSV 셀 안의 줄바꿈·구분자·공백과 이중 큰따옴표를 보존합니다. CSV→JSON은 기본적으로 모든 값을 문자열로 둡니다. 숫자 변환을 선택해도 00123, 앞뒤 공백이 있는 값, 안전 범위를 넘는 정수는 문자열로 유지합니다. 소수를 숫자로 바꾸면 일반 JavaScript Number 정밀도를 사용합니다.' },
    { q: '중첩 JSON을 CSV로 바꾸면 원래 구조를 복원할 수 있나요?', a: '점 경로로 평탄화하거나 중첩 값을 JSON 문자열 셀로 유지할 수 있습니다. 배열을 합치거나 펼치는 방식은 원래 JSON과 완전히 가역적이지 않을 수 있습니다. 평탄화 키 충돌·빈 열·객체가 아닌 행은 오류로 알립니다. 안전한 정수 범위를 넘는 JSON 숫자는 거부하므로 큰 식별자는 따옴표로 감싼 문자열로 입력하세요.' },
    { q: '파일 인코딩과 용량 제한은 어떻게 되나요?', a: '파일은 UTF-8 또는 EUC-KR로 읽으며 출력은 UTF-8입니다. CSV 출력에만 BOM을 추가할 수 있고 JSON 출력에는 BOM을 넣지 않습니다. 입력 파일 원래 크기와 디코딩 후 UTF-8 크기는 각각 2MiB, 데이터는 10,000행·200열·200,000셀, JSON 깊이는 20, 중간 데이터와 출력은 8MiB까지입니다. 한도를 넘으면 잘라서 내보내지 않고 원문을 유지한 채 오류를 표시합니다.' },
    { q: '변환한 데이터는 저장되나요?', a: '이 도구는 입력과 결과를 브라우저 메모리에서 처리하며 URL이나 기기 기록에 넣지 않습니다. 입력이나 옵션을 바꾸면 이전 결과를 그대로 반출하지 않도록 다시 변환해야 합니다. 복사에 실패하면 결과를 직접 선택하거나 재시도할 수 있습니다.' },
    { q: '긴 결과가 일부만 보이면 파일도 잘리나요?', a: '텍스트 미리보기는 약 50,000 UTF-16 단위씩, 표는 한 페이지에 최대 1,000개의 데이터 셀을 보여 줍니다. 전체 결과 복사·다운로드와 수동 복사 복구에는 모든 내용이 포함됩니다. 변환과 파일 디코딩은 Worker에서 실행하며 작업 취소가 가능합니다. 큰 원문 편집이나 전체 수동 선택에는 기기 성능에 따라 시간이 걸릴 수 있습니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <JsonCsvConverter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            JSON ↔ CSV 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            JSON-CSV 변환기는 JSON 객체·객체 배열과 CSV 표를 서로 변환하는 도구입니다. CSV를 단순히 줄마다 자르지 않고 따옴표 안의 줄바꿈과 구분자를 하나의 셀로 읽습니다. 문자열 식별자를 기본으로 보존하며, 변환을 확정한 뒤 같은 데이터에서 표·통계·복사·다운로드를 제공합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            JSON ↔ CSV 변환 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>엑셀에서 한글 깨짐 방지:</strong> CSV를 엑셀에서 열 때 한글이 깨지면 UTF-8 BOM 옵션을 선택하여 내보내세요.</li>
            <li><strong>중첩 JSON 변환:</strong> 평탄화와 중첩 유지 중 필요한 방식을 선택하세요. 키 충돌은 오류로 표시하며 임의로 덮어쓰지 않습니다.</li>
            <li><strong>API 응답 데이터 분석:</strong> REST API에서 받은 JSON 응답을 CSV로 변환하여 엑셀에서 데이터 분석을 진행하세요.</li>
            <li><strong>구분자 선택:</strong> 쉼표·탭·파이프·세미콜론을 지원합니다. 빈 셀과 실제 빈 레코드를 보존하며 헤더의 빈 이름·중복 또는 열 수 불일치는 오류로 알립니다.</li>
            <li><strong>파일 읽기:</strong> 파일 인코딩은 읽기에만 적용합니다. 붙여넣은 문자열을 다시 인코딩하지 않으며 EUC-KR 출력은 제공하지 않습니다.</li>
            <li><strong>한도 확인:</strong> 입력은 2MiB까지이며 출력은 8MiB까지입니다. 큰 식별자는 JSON에서도 문자열로 입력하고 변환 결과를 확인한 뒤 다운로드하세요.</li>
            <li><strong>긴 결과 확인:</strong> 텍스트와 표의 페이지를 이동해 내용을 확인하세요. 미리보기 범위와 관계없이 전체 복사와 다운로드는 같은 확정 결과 전체를 사용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
