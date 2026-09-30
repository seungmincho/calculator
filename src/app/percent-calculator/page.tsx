import { Metadata } from 'next'
import PercentCalculator from '@/components/PercentCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '퍼센트 계산기 - 비율, 증감률, 할인율 계산 | 툴허브',
  description: '퍼센트 계산기 - A의 B%, 비율, 증감률(인상률), 할인가·정가 역산, 중복 할인, 퍼센트포인트(%p)까지 한 화면에서 바로 계산. "5만원의 15%"처럼 한 줄로 물어보세요.',
  keywords: '퍼센트 계산기, 퍼센트 계산, 비율 계산, 증감률 계산, 인상률 계산, 할인율 계산, 할인가 계산, 정가 역산, 중복 할인, 퍼센트포인트, 백분율 계산기, percent calculator',
  openGraph: {
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
    url: 'https://toolhub.ai.kr/percent-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/percent-calculator.png', width: 1200, height: 630, alt: '퍼센트 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '퍼센트 계산기 | 툴허브',
    description: '퍼센트 계산, 비율 계산, 증감률, 할인율 등 다양한 퍼센트 계산을 한 곳에서 간편하게',
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
    description: 'A의 B%, 비율, 증감률, 할인가, 정가 역산, 중복 할인, 퍼센트포인트, 부가세 역산을 한 화면에서 동시에 계산합니다.',
    url: 'https://toolhub.ai.kr/percent-calculator',
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
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퍼센트(%)는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본 퍼센트 계산은 "A의 B% = A × B ÷ 100"입니다. 예를 들어 200의 15%는 200 × 15 ÷ 100 = 30입니다. "A는 B의 몇 %?"는 (A ÷ B) × 100으로 계산합니다. 50은 200의 25%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '증감률은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '증감률 = (변화 후 값 - 변화 전 값) ÷ 변화 전 값 × 100(%)입니다. 양수면 증가율, 음수면 감소율입니다. 예를 들어 100에서 130으로 변했다면 증가율은 (130-100)÷100×100 = 30%이고, 100에서 80으로 변했다면 감소율은 -20%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '할인을 중복 적용하면 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '할인을 중복 적용할 때는 단순히 할인율을 더하지 않고 순차적으로 곱합니다. 예를 들어 30% 할인 후 추가 20% 할인이면, 원가 × 0.7 × 0.8 = 원가 × 0.56이므로 실제 할인율은 44%입니다. 30% + 20% = 50%가 아님에 주의하세요.',
        },
      },
    ],
  }

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PercentCalculator />
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
            퍼센트 계산기는 A의 B%, 비율(A는 B의 몇 %), 증감률·인상률, 할인가와 할인 전 정가 역산, 중복 할인, 퍼센트포인트(%p), 부가세 역산 등 자주 쓰는 백분율 계산을 한 화면에서 동시에 처리하는 무료 온라인 계산기입니다. 쇼핑 할인율, 부가세(10%) 계산, 성적 백분위, 투자 수익률 등 일상과 업무에서 자주 만나는 퍼센트 계산을 빠르고 정확하게 수행할 수 있습니다.
          </p>
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
