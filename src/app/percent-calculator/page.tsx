import { Metadata } from 'next'
import PercentCalculator from '@/components/PercentCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import koMessages from '@/../messages/generated/ko/ns/percentCalculator.json'

const TITLE = "퍼센트 계산기 - 비율·할인 계산과 결과 비교 | 툴허브"
const DESCRIPTION = "비율·증감률·할인·퍼센트포인트 등 8가지 계산을 한 화면에서 확인하세요. 결과 최대 6개를 당시 입력·수식과 함께 모아 비교하고 전체 내용을 복사하거나 TXT로 내려받을 수 있습니다. 비교 목록은 페이지 메모리에만 보관합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '퍼센트 계산기, 퍼센트 계산, 비율 계산, 증감률 계산, 인상률 계산, 할인율 계산, 할인가 계산, 정가 역산, 중복 할인, 퍼센트포인트, 백분율 계산기, percent calculator',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/percent-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/percent-calculator.png', width: 1200, height: 630, alt: '퍼센트 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/percent-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/percent-calculator/',
  },
}

export default function PercentCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퍼센트 계산기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/percent-calculator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '기본 퍼센트 계산 (X의 Y%)',
      '비율 계산 (X는 Y의 몇%)',
      '증감률 계산',
      '할인가 계산 (정가·할인율 → 판매가)',
      '할인 전 정가 역산',
      '연속(중복) 할인 실효 할인율',
      '퍼센트포인트(%p) vs 퍼센트(%) 비교',
      '부가세 포함가 → 공급가',
      '한 줄 자연어 입력 (5만원의 15%, 3만→4만)',
      '만·억 단위 표시, 소수점 자릿수 조절, 수식 보기, 결과 복사',
      "현재 입력·표시 설정을 보존하는 결과 6개 비교",
      "전체 비교 내용 복사·TXT 다운로드·복사 실패 수동 선택",
    ],
  }

  const faq = koMessages.percentCalculator.guide.faq.items

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '퍼센트 계산하는 방법',
    description: '한 줄 입력창이나 카드에 숫자를 넣으면 모든 퍼센트 질문의 답이 바로 계산됩니다.',
    step: [
      { '@type': 'HowToStep', name: '한 줄로 입력', text: '"5만원의 15%", "3만→4만", "12만 30% 할인"처럼 질문을 한 줄로 적으면 해당 카드가 채워집니다.' },
      { '@type': 'HowToStep', name: '값 입력', text: '또는 원하는 카드(비율, 증감률, 할인가, 정가 역산, 중복 할인, %p)에 직접 숫자를 입력합니다. 5만, 1억 같은 한글 단위도 됩니다.' },
      { '@type': 'HowToStep', name: '결과 확인', text: '결과와 수식을 확인하고 복사 버튼으로 숫자를 복사합니다. 주소 링크를 공유하면 같은 입력값이 열립니다.' },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PercentCalculator />
              <FaqJsonLd items={faq} />
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
            퍼센트 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            퍼센트 계산기는 A의 B%, 비율(A는 B의 몇 %), 증감률·인상률, 할인가와 할인 전 정가 역산, 중복 할인, 퍼센트포인트(%p), 부가세 역산 등 자주 쓰는 백분율 계산을 한 화면에서 동시에 처리하는 무료 온라인 계산기입니다. 쇼핑 할인율, 부가세(10%) 계산, 시험 정답률, 투자 수익률 등 일상과 업무에서 자주 만나는 퍼센트 계산을 빠르고 정확하게 수행할 수 있습니다.
          </p>
          <p className="text-body leading-relaxed mb-6">각 계산 카드에서 비교에 담기를 누르면 당시 입력·표시 설정·결과 단위·수식을 최대 6개까지 보관합니다. 서로 다른 종류의 차이나 순위는 자동 계산하지 않으며, 새로고침 전에 전체 복사 또는 TXT로 보관할 수 있습니다. 공유 주소에는 계산 입력만 들어가고 비교 목록은 포함되지 않습니다.</p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            퍼센트 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>할인율 계산:</strong> 정가 100,000원에서 30% 할인 시 실제 가격은 100,000 × (1 - 0.3) = 70,000원입니다. 중복 할인은 순차적으로 곱해야 정확합니다.</li>
            <li><strong>부가세 포함/제외:</strong> 부가세 포함 금액에서 공급가액을 구하려면 총액 ÷ 1.1로 계산하세요. 10%를 빼는 것(× 0.9)과는 결과가 다릅니다.</li>
            <li><strong>성과·성장률 분석:</strong> 전월 대비 매출 증가율 = (이번달 - 저번달) ÷ 저번달 × 100. 증감률 카드로 사업 성과를 빠르게 분석하세요.</li>
            <li><strong>퍼센트포인트:</strong> 금리가 3%에서 5%로 오르면 2%p 상승이자 약 66.7% 상승입니다. 비율끼리의 차이는 %p로 말해야 정확합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
