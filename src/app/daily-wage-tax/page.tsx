import { Metadata } from 'next'
import DailyWageTaxCalculator from '@/components/DailyWageTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '일용직 세금 계산기 - 일당 원천징수·실수령액 | 툴허브',
  description: '일당을 넣으면 일용근로소득 원천징수 소득세·지방소득세·고용보험과 실수령액을 바로 계산합니다. 일당 187,000원 소액부징수, 매일·주급·월말 지급 차이, 3.3% 사업소득과 비교까지 한 번에.',
  keywords: '일용직 세금 계산기, 일용근로소득 원천징수, 일당 세금, 일용직 3.3%, 일용직 소득세, 일용직 실수령액, 일용근로소득 계산, 소액부징수, 일용직 고용보험, 일용근로소득 지급명세서',
  openGraph: {
    title: '일용직 세금 계산기 - 일당 원천징수·실수령액 | 툴허브',
    description: '일당 → 소득세·지방소득세·고용보험·실수령액. 187,000원 소액부징수와 3.3% 비교까지.',
    url: 'https://toolhub.ai.kr/daily-wage-tax/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/daily-wage-tax.png', width: 1200, height: 630, alt: '일용직 세금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '일용직 세금 계산기 | 툴허브', description: '일당 원천징수 세금과 실수령액, 3.3%와 비교', images: ['https://toolhub.ai.kr/og/daily-wage-tax.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/daily-wage-tax/' },
}

const faqs = [
  { q: '일용직 세금은 어떻게 계산하나요?', a: '하루 일당에서 근로소득공제 15만원을 뺀 금액에 6%를 곱하고, 그 산출세액의 55%를 세액공제해서 계산합니다. 결국 (일당 − 150,000원) × 2.7%가 소득세이고, 여기에 소득세의 10%인 지방소득세가 붙습니다. 일당 200,000원이면 소득세 1,350원, 지방소득세 135원입니다(소득세법 제47조②·제129조①4호·제59조③).' },
  { q: '일당 얼마까지 세금이 없나요?', a: '일당 15만원까지는 근로소득공제로 소득세가 아예 없습니다. 또 원천징수세액이 1,000원 미만이면 걷지 않는 소액부징수(소득세법 제86조) 때문에, 매일 지급받는다면 하루 세액이 999원인 일당 187,000원까지 실제로 떼는 세금이 0원입니다.' },
  { q: '여러 날 치를 한꺼번에 받으면 세금이 달라지나요?', a: '네. 일당을 일정 기간 모아서 한 번에 지급하면 일별 세액을 합친 금액으로 1,000원 미만인지 판단합니다(국세청 법인46013-343). 예를 들어 일당 187,000원을 매일 받으면 0원이지만, 20일 치를 월말에 한 번에 받으면 소득세 19,980원과 지방소득세 1,998원이 원천징수됩니다.' },
  { q: '일용직인데 3.3%를 떼는 건 맞나요?', a: '3.3%는 고용관계 없이 독립적으로 일하는 프리랜서의 사업소득에 떼는 세율입니다. 사업주의 지시를 받아 정해진 시간·장소에서 일하고 일당을 받았다면 일용근로소득으로 6% × 45%를 떼는 것이 원칙입니다. 일당 20만원 20일 기준으로 일용직 세금은 29,700원, 3.3%면 132,000원이라 차이가 큽니다. 3.3%로 처리되면 다음 해 5월 종합소득세 신고 대상이 됩니다.' },
  { q: '일용직도 연말정산이나 종합소득세 신고를 해야 하나요?', a: '아니요. 일용근로소득은 원천징수로 납세 의무가 끝나는 분리과세 소득이라 연말정산이나 5월 종합소득세 신고에 합산하지 않습니다(소득세법 제14조). 다만 3.3%로 사업소득 처리된 금액은 종합소득세 신고 대상입니다.' },
  { q: '일용직도 4대보험을 떼나요?', a: '고용보험은 일용근로자라면 근무시간이 짧아도 적용되어 근로자가 보수의 0.9%를 냅니다(65세 이후 새로 고용된 경우 제외). 국민연금은 1개월 이상 계속 일하면서 월 8일 이상 또는 60시간 이상 일하거나 월 소득 220만원 이상이면, 건강보험은 1개월 이상 계속 일하면서 월 8일 이상 일하면 적용됩니다. 산재보험은 사업주가 전액 부담합니다.' },
  { q: '같은 곳에서 오래 일하면 계속 일용직인가요?', a: '같은 사업주에게 3개월 이상 계속 고용되면 일용근로자가 아니라 일반 근로자로 봅니다(소득세법 시행령 제20조, 건설공사는 1년). 이때부터는 근로소득 간이세액표로 원천징수하고 연말정산 대상이 됩니다.' },
  { q: '사업주는 일용직 세금을 언제 신고하나요?', a: '지급할 때 원천징수한 소득세·지방소득세는 다음 달 10일까지 신고·납부하고, 일용근로소득 지급명세서는 지급일이 속하는 달의 다음 달 말일까지 매월 제출합니다(소득세법 제164조①). 고용보험 근로내용 확인신고는 다음 달 15일까지 근로복지공단에 냅니다.' },
]

export default function DailyWageTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '일용직 세금 계산기',
    description: '일당으로 일용근로소득 원천징수 소득세·지방소득세·고용보험과 실수령액을 계산하고 3.3% 사업소득과 비교하는 도구.',
    url: 'https://toolhub.ai.kr/daily-wage-tax/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['일당 원천징수 소득세·지방소득세', '근로소득공제 1일 15만원·세액공제 55% 반영', '소액부징수 1,000원 판단(매일·주급·월말 지급)', '고용보험 0.9% 공제', '비과세 식대 반영', '하루·기간 실수령액', '3.3% 사업소득 비교', '국민연금·건강보험 적용 조건 안내', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DailyWageTaxCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">일용직 세금 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            일용직 세금 계산기는 하루 단위로 일당을 받는 일용근로자가 실제로 떼이는 소득세·지방소득세·고용보험과 손에 쥐는 실수령액을 계산하는 도구입니다. 일용근로소득은 하루 15만원을 근로소득공제한 뒤 6% 세율을 적용하고 산출세액의 55%를 세액공제하므로, 실제 세금은 15만원 초과분의 2.7%(지방소득세 포함 2.97%)입니다. 원천징수세액이 1,000원 미만이면 걷지 않으며, 여러 날 치를 한 번에 받으면 일별 세액 합계로 판단하기 때문에 지급 방식에 따라 세금이 달라질 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">일당별 세금 예시 (매일 지급)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>일당 150,000원:</strong> 근로소득공제 15만원으로 소득세 0원</li>
            <li><strong>일당 187,000원:</strong> 하루 세액 999원 → 소액부징수로 0원 (월말에 20일 치를 한 번에 받으면 소득세 19,980원)</li>
            <li><strong>일당 200,000원:</strong> 소득세 1,350원 + 지방소득세 135원 + 고용보험 1,800원, 하루 실수령 196,715원</li>
            <li><strong>일당 300,000원:</strong> 소득세 4,050원 + 지방소득세 405원 + 고용보험 2,700원, 하루 실수령 292,845원</li>
          </ul>
        </div>
      </section>
    </>
  )
}
