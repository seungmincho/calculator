import { Metadata } from 'next'
import { Suspense } from 'react'
import InheritanceGiftTax from '@/components/InheritanceGiftTax'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '상속세 증여세 계산기 - 2025년 세율, 공제한도, 간편 계산 | 툴허브',
  description: '2025년 기준 상속세와 증여세를 간편하게 계산하세요. 배우자 상속공제, 일괄공제, 증여재산공제(배우자 6억, 자녀 5천만원), 혼인·출산 추가공제까지 반영한 정확한 세금 계산기입니다.',
  keywords: '상속세 계산기, 증여세 계산기, 상속세 세율, 증여세 공제, 2025 상속세, 배우자 상속공제, 증여 공제한도, 상속세 면제한도',
  openGraph: {
    title: '상속세 증여세 계산기 2025 | 툴허브',
    description: '상속세·증여세 간편 계산. 2025년 세율과 모든 공제를 반영한 정확한 계산기.',
    url: 'https://toolhub.ai.kr/inheritance-gift-tax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '상속세 증여세 계산기 2025 | 툴허브',
    description: '상속세·증여세 간편 계산. 2025년 세율과 모든 공제를 반영.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/inheritance-gift-tax/',
  },
}

const faqData = [
  {
    question: '상속세 면제한도는 얼마인가요?',
    answer: '배우자가 있는 경우 일괄공제 5억원 + 배우자 상속공제 최소 5억원 = 최소 10억원까지 상속세가 면제됩니다. 배우자가 없는 경우 일괄공제 5억원이 적용됩니다. 추가로 금융재산 공제(최대 2억), 장례비 공제(최대 1,500만원) 등이 있습니다.',
  },
  {
    question: '부모님이 자녀에게 증여할 때 공제한도는?',
    answer: '성인 자녀에게는 10년간 5천만원까지 증여세가 면제됩니다. 미성년 자녀는 2천만원까지입니다. 2024년부터 혼인·출산 시 추가로 1억원 공제가 가능합니다(직계존속 증여에 한함).',
  },
  {
    question: '상속세와 증여세 세율은 같은가요?',
    answer: '네, 동일한 5단계 누진세율이 적용됩니다. 1억 이하 10%, 1~5억 20%, 5~10억 30%, 10~30억 40%, 30억 초과 50%입니다. 차이점은 공제 항목과 한도가 다릅니다.',
  },
]

export default function InheritanceGiftTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '상속세 증여세 계산기',
    description: '2025년 기준 상속세와 증여세를 간편하게 계산하는 온라인 도구',
    url: 'https://toolhub.ai.kr/inheritance-gift-tax',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '상속세 계산 (배우자 공제, 일괄공제, 금융재산공제)',
      '증여세 계산 (6가지 관계별 공제)',
      '2025년 최신 세율 반영',
      '혼인·출산 추가공제 반영',
      '세율표 및 상세 내역',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <InheritanceGiftTax />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            상속세·증여세 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            상속세·증여세 계산기는 2025년 최신 세율을 기준으로 상속 및 증여 시 납부해야 할 세금을 미리 계산해볼 수 있는 온라인 도구입니다. 배우자 상속공제(최소 5억), 일괄공제(5억), 금융재산공제, 증여재산공제(배우자 6억·성인 자녀 5천만원) 등 모든 공제 항목을 반영하여 정확한 세금 예상 금액을 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            상속세·증여세 절세 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>사전 증여 활용:</strong> 10년마다 공제 한도가 초기화되므로 자녀에게 10년 주기로 5천만원씩 증여하면 증여세 없이 재산을 이전할 수 있습니다.</li>
            <li><strong>혼인·출산 공제 활용:</strong> 2024년부터 자녀 결혼 또는 출산 시 직계존속으로부터 최대 1억원 추가 공제가 가능하니 활용하세요.</li>
            <li><strong>배우자 상속공제 최대화:</strong> 배우자가 실제로 상속받는 금액에 따라 최대 30억까지 공제되므로 배우자 상속 비율을 조절하세요.</li>
            <li><strong>부담부 증여 검토:</strong> 부채가 있는 재산을 증여하면 부채 부분은 양도세, 나머지는 증여세가 적용되어 세금을 줄일 수 있습니다.</li>
            <li><strong>전문가 상담 권장:</strong> 실제 세금 신고는 세무사와 상담하세요. 이 계산기는 참고용으로만 사용하시기 바랍니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
