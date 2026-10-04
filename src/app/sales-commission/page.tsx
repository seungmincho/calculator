import { Metadata } from 'next'
import SalesCommissionCalculator from '@/components/SalesCommissionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import salesCommissionCalcMessages from '../../../messages/generated/ko/ns/salesCommissionCalc.json'

export const metadata: Metadata = {
  title: '판매수수료 계산기 - 쿠팡·스마트스토어·11번가 수수료 비교 | 툴허브',
  description: '영업직·프리랜서·중개인의 커미션을 정률·구간 누진·목표 달성 가속·건당 고정액으로 계산하고 3.3% 원천징수 후 실수령액, A/B 수당안 비교까지. 쿠팡·스마트스토어·11번가 판매수수료 비교도 함께 제공합니다.',
  keywords: '커미션 계산기, 영업 인센티브 계산, 판매수수료 계산기, 누진 커미션, 프리랜서 3.3%, 영업 수당 계산, 쿠팡 수수료, 스마트스토어 수수료, 11번가 수수료',
  openGraph: {
    title: '판매수수료·영업 커미션 계산기 | 툴허브',
    description: '구간 누진·목표 가속 커미션과 3.3% 실수령액, 오픈마켓 수수료 비교',
    url: 'https://toolhub.ai.kr/sales-commission',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/sales-commission.png', width: 1200, height: 630, alt: '판매수수료·영업 커미션 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '판매수수료·영업 커미션 계산기 | 툴허브', description: '영업 커미션·인센티브와 오픈마켓 수수료 계산', images: ['https://toolhub.ai.kr/og/sales-commission.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/sales-commission/' },
}

export default function SalesCommissionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '판매수수료·영업 커미션 계산기',
    description: '영업 커미션·인센티브(정률·구간 누진·목표 달성 가속·건당) 계산과 3.3% 원천징수 실수령액, 오픈마켓 판매수수료 비교.',
    url: 'https://toolhub.ai.kr/sales-commission/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['정률·구간 누진·목표 달성·건당 커미션', '누진(초과분) vs 전체 적용 비교', '프리랜서 3.3% 원천징수 실수령액', 'A/B 수당안 비교와 손익분기 매출', '매출-커미션 곡선', '쿠팡·스마트스토어·11번가 수수료 비교'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={salesCommissionCalcMessages.salesCommissionCalc.sc.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SalesCommissionCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
