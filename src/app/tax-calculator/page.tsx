import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TaxCalculator from '@/components/TaxCalculator'

export const metadata: Metadata = {
  title: '세금 계산기 - 소득세, 부가세, 양도소득세',
  description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요. 2026년 세법 기준으로 세후 금액을 알 수 있습니다.',
  keywords: '세금계산기, 소득세계산기, 부가세계산기, 양도소득세계산기, 세금계산, 소득세, 부가가치세, 양도소득세, 세법',
  openGraph: {
    title: '세금 계산기 - 소득세, 부가세, 양도소득세 | 툴허브',
    description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/tax-calculator',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '세금 계산기',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '세금 계산기 - 소득세, 부가세, 양도소득세 | 툴허브',
    description: '한국 기준 소득세, 부가가치세, 양도소득세를 정확하게 계산하세요',
    images: ['/og-image-1200x630.png'],
  },
  alternates: { canonical: 'https://toolhub.ai.kr/tax-calculator/' },
}

export default function TaxCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '세금 계산기',
    description: '소득세, 부가가치세, 양도소득세를 계산하는 한국 기준 세금 계산 도구',
    url: 'https://toolhub.ai.kr/tax-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '소득세 계산',
      '부가가치세 계산',
      '양도소득세 계산',
      '세후 금액 계산',
      '공제항목 반영'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '종합소득세 세율은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 기준 종합소득세 세율은 과세표준에 따라 6%~45%까지 8단계 누진세율이 적용됩니다. 1,400만원 이하 6%, 5,000만원 이하 15%, 8,800만원 이하 24%, 1.5억 이하 35%, 3억 이하 38%, 5억 이하 40%, 10억 이하 42%, 10억 초과 45%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '부가가치세 신고 기간은 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '부가가치세는 1기(1~6월)는 7월 25일까지, 2기(7~12월)는 다음해 1월 25일까지 신고·납부합니다. 개인사업자는 예정신고를 생략할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '양도소득세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '양도소득세는 양도가액에서 취득가액과 필요경비를 차감한 양도차익에서 장기보유특별공제와 기본공제(250만원)를 뺀 과세표준에 세율을 적용합니다.',
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
        <TaxCalculator />
      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            세금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            세금 계산기는 2026년 한국 세법 기준으로 소득세, 부가가치세(VAT), 양도소득세를 정확하게 계산해 주는 무료 온라인 도구입니다. 프리랜서·사업자의 종합소득세 신고, 부동산 양도 시 세금 예측, 공급가액과 부가세 분리 계산 등 다양한 납세 상황에서 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            세금 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>종합소득세 누진세율:</strong> 2026년 기준 소득에 따라 6%~45%의 누진세율이 적용됩니다. 과세표준이 1,400만원 이하면 6%, 5,000만원 이하면 15%입니다.</li>
            <li><strong>부가세 역산:</strong> 공급가액에 10%가 부가세이므로, 부가세 포함 금액에서 공급가액을 구하려면 총액 ÷ 1.1을 계산하세요.</li>
            <li><strong>양도소득세 절세:</strong> 보유 기간이 길수록 장기보유특별공제율이 높아집니다. 1세대 1주택은 2년 이상 보유 시 비과세 혜택을 받을 수 있습니다.</li>
            <li><strong>신고 기간 확인:</strong> 종합소득세는 매년 5월, 부가가치세는 1월과 7월이 신고·납부 기간으로, 기간을 놓치면 가산세가 부과됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}