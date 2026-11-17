import { Metadata } from 'next'
import NumberToKorean from '@/components/NumberToKorean'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = "금액 한글 변환 - 입력 편집·한자·영문·일괄 복사 | 툴허브"
const DESCRIPTION = "숫자와 한글 금액을 한글·한자 갖은자·영문·혼용 표기로 바꾸세요. 가운데 입력과 IME 조합을 유지하며 단일·최대 100줄 일괄 복사 실패 시 전체 원문 선택·재시도와 CSV 다운로드를 제공합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '숫자 한글 변환, 금액 한글 표기, 수표 금액 한글, number to korean, 한글 숫자, 금일봉',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/number-to-korean/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/number-to-korean.png', width: 1200, height: 630, alt: '숫자 한글 변환' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/number-to-korean.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/number-to-korean/' },
}

export default function NumberToKoreanPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '숫자 한글 변환', description: DESCRIPTION, url: 'https://toolhub.ai.kr/number-to-korean/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ["한글·한자 갖은자·영문 금액 변환","숫자와 문자 금액 병기","숫자+한글 혼용 표기","한글 금액 역변환","정수부 최대 20자리 숫자 문자열","입력 중 원문·편집 위치·IME 조합 보존","최대 100줄 일괄 변환·행별 오류","단일·일괄 복사 실패 원문 선택·재시도","결과 표·CSV 다운로드"] }
  const faq = [
  {
    "q": "편집 중 쉼표가 바로 생기지 않는 이유는 무엇인가요?",
    "a": "가운데 삽입·삭제와 IME 조합의 원문·커서를 보존하기 위해 편집 중 강제 정리를 하지 않습니다. 유효한 숫자는 입력을 마친 뒤 정리하고 한글이 섞인 역변환 원문은 유지합니다."
  },
  {
    "q": "숫자는 몇 자리까지 지원하나요?",
    "a": "숫자 문자열의 정수부는 최대 20자리까지 지원합니다. 한글이 섞인 역변환은 기존 안전 정수 범위 제한을 유지하므로 두 입력 방식의 한도는 다릅니다."
  },
  {
    "q": "소수와 음수도 문서용 금액으로 나오나요?",
    "a": "소수·음수는 읽기 가능한 결과 항목과 양의 정수용 금액 병기를 구분합니다. 소수는 한글 읽기에서 점 뒤 숫자로 읽으며 입력에 맞지 않는 결과 항목을 사용할 수 있다고 표시하지 않습니다."
  },
  {
    "q": "복사가 실패하거나 이전 결과가 늦게 도착하면 어떻게 되나요?",
    "a": "전체 원문을 직접 선택하거나 현재 결과로 다시 시도할 수 있습니다. 입력·옵션·언어·대상이 바뀐 뒤 이전 요청의 안내와 자동 복구는 현재 결과를 덮지 않습니다. 이미 기기에 제출된 클립보드 쓰기 자체를 되돌리는 기능은 아닙니다."
  },
  {
    "q": "계약서나 영수증에는 어떤 결과를 쓰나요?",
    "a": "문서 양식에서 요구하는 숫자·한글·한자 등 형식을 선택하고 숫자와 문자 금액이 일치하는지 확인하세요. 금·일금·접두사 없음과 띄어쓰기 옵션을 조절할 수 있습니다."
  }
]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <NumberToKorean />
            <ToolFaq items={faq} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            숫자 한글 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            숫자 한글 변환기는 숫자 또는 한글이 섞인 금액을 한글·한자 갖은자·영문·혼용 형식으로 바꾸는 도구입니다. 입력 중 원문과 커서 위치를 유지하고 필요한 결과를 명시적으로 복사할 수 있습니다. 여러 금액은 최대 100줄 결과 표와 CSV로 확인하며, 복사 실패 시 전체 원문 선택과 재시도를 제공합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            숫자 한글 변환 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>문자 금액 확인:</strong> 문서 양식이 요구하는 출력 형식을 고르고 원래 숫자와 변환한 금액을 대조하세요.</li>
            <li><strong>숫자·문자 병기:</strong> 숫자와 한글 금액을 함께 적을 때 두 금액이 일치하는지 확인하세요.</li>
            <li><strong>한자 표기 활용:</strong> 공식 문서나 경조사 봉투에는 한자 금액 표기(壹, 貳, 參...)가 격식을 갖춘 표현으로 사용됩니다.</li>
            <li><strong>만 단위 구분:</strong> 한국어 금액 표기는 만·억·조 단위로 구분하므로, 숫자를 4자리씩 끊어 읽는 연습을 하면 큰 금액도 쉽게 읽을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
