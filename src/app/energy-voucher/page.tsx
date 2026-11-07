import { Metadata } from 'next'
import EnergyVoucher from '@/components/EnergyVoucher'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/energyVoucher.json'

const TITLE = '2026 에너지바우처 - 대상·지원금액·신청 마감 | 툴허브'
const DESC = '기초생활 수급 종류와 세대원 특성(노인·영유아·장애인 등), 세대원 수를 고르면 2026년 에너지바우처 대상인지와 연간 지원 금액(1인 295,200원~4인 이상 701,300원)을 알려 줘요. 연탄쿠폰 등 중복 지원, 사용 기간, 요금차감·국민행복카드 차이, 12월 31일 신청 마감까지 정리했습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '에너지바우처, 에너지바우처 2026, 에너지바우처 대상, 에너지바우처 금액, 에너지바우처 신청, 에너지바우처 신청기간, 에너지바우처 잔액조회, 에너지바우처 사용기간, 난방비 지원, 국민행복카드 에너지바우처',
  openGraph: {
    title: TITLE,
    description: '2026 에너지바우처 대상 여부와 세대원 수별 연간 지원 금액, 신청 마감 D-day',
    url: 'https://toolhub.ai.kr/energy-voucher/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/energy-voucher.png', width: 1200, height: 630, alt: '2026 에너지바우처 대상·금액' }],
  },
  twitter: { card: 'summary_large_image', title: '2026 에너지바우처 대상·금액 | 툴허브', description: '에너지바우처 대상 여부와 연간 지원 금액, 신청 마감', images: ['https://toolhub.ai.kr/og/energy-voucher.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/energy-voucher/' },
}

const faqs = messages.energyVoucher.guide.faq.items

export default function EnergyVoucherPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '2026 에너지바우처 대상·금액',
    description: '기초생활 수급 종류·세대원 특성·세대원 수로 2026년도 에너지바우처 대상 여부와 연간 지원 금액, 사용 기간, 신청 마감을 확인하는 도구.',
    url: 'https://toolhub.ai.kr/energy-voucher/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['소득기준(생계·의료·주거·교육급여)과 세대원 특성기준 동시 판정', '세대원 수별 연간 지원 금액(295,200원~701,300원)', '긴급복지 동절기 연료비·연탄쿠폰·연탄전환 바우처 중복 시 하절기 금액', '사용 기간과 신청 마감(2026년 12월 31일) D-day', '요금차감·국민행복카드 사용 방법 비교'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <EnergyVoucher />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
