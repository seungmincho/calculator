import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RealEstateCalculator from '@/components/RealEstateCalculator'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import realEstateMessages from '../../../messages/generated/ko/ns/realEstate.json'

export const metadata: Metadata = {
  title: '부동산 계산기 - 대출·취득세 계산 | 툴허브',
  description: '집 살 때 실제로 필요한 현금(자기자본+취득세+중개보수+국민주택채권·법무사 등기비용)과 주택담보대출 월 상환액·DSR을 한 번에 계산하세요. 2026년 세법 기준.',
  keywords: '부동산계산기, 집 살 때 드는 비용, 내 집 마련 자금, 부대비용, 주택담보대출, 취득세계산, LTV계산, 부동산세금, 대출계산기',
  openGraph: {
    title: '부동산 계산기 - 집 살 때 필요한 현금·월 상환액',
    description: '자기자본+취득세+중개보수+등기비용, 월 상환액·DSR까지 한 화면에서',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/real-estate-calculator/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/real-estate-calculator.png', width: 1200, height: 630, alt: '부동산 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '부동산 계산기 - 집 살 때 필요한 현금·월 상환액',
    description: '집 살 때 실제로 필요한 현금(자기자본+취득세+중개보수+국민주택채권·법무사 등기비용)과 주택담보대출 월 상환액·DSR을 한 번에 계산하세요. 2026년 세법 기준.',
    images: ['https://toolhub.ai.kr/og/real-estate-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/real-estate-calculator/',
  },
}

export default function RealEstateCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '부동산 계산기',
    description: '집 살 때 실제로 필요한 현금(자기자본+취득세+중개보수+국민주택채권·법무사 등기비용)과 주택담보대출 월 상환액·DSR을 한 번에 계산하세요. 2026년 세법 기준.',
    url: 'https://toolhub.ai.kr/real-estate-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    author: {
      '@type': 'Organization',
      name: '툴허브'
    },
    featureList: [
      '집 살 때 총 필요 현금',
      '부대비용(취득세·중개보수·국민주택채권·법무사)',
      '주택담보대출 월 상환(원리금·원금균등)',
      'LTV·대략 DSR',
      '매매가별 비용 비교'
    ]
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '집 살 때 필요한 돈 계산하는 방법',
    description: '매매가와 대출 조건을 입력하면 총 필요 현금, 부대비용, 월 상환액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '매매가·지역 입력', text: '매매가, 지역(조정대상지역 여부), 전용면적, 취득 후 주택 수를 입력합니다.' },
      { '@type': 'HowToStep', name: '대출 조건 입력', text: 'LTV 또는 대출 금액, 금리, 기간, 상환 방식과 연소득을 입력합니다.' },
      { '@type': 'HowToStep', name: '비용 내역 확인', text: '중개수수료, 취득세, 대출 월 상환금 등 거래에 필요한 총 비용을 확인합니다.' },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqJsonLd items={realEstateMessages.realEstate.u.faq.items} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <I18nWrapper>
        <RealEstateCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            부동산 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            부동산 계산기는 집을 살 때 실제로 필요한 현금(자기자본, 취득세, 중개보수, 국민주택채권·법무사 등기비용)과 주택담보대출 월 상환액, LTV·DSR을 한 번에 계산해 주는 내 집 마련 자금 계산 도구입니다. 한국 부동산 세법과 대출 규정을 반영해 내 집 마련 전 예산 계획을 세우거나 이사 비용을 미리 파악하는 데 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            부동산 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>취득세 미리 파악:</strong> 주택 매매 계약 전에 취득세를 계산해두면 계약금·잔금 외의 추가 비용을 정확히 준비할 수 있습니다. 주택 수와 가격에 따라 세율이 크게 다릅니다.</li>
            <li><strong>LTV 확인으로 대출 한도 예측:</strong> 내 주택의 LTV(담보인정비율)와 DSR(총부채원리금상환비율)을 파악하면 실제 받을 수 있는 대출 한도를 사전에 예측할 수 있습니다.</li>
            <li><strong>매매가별 비교:</strong> 매매가별 비교 표에서 가격대를 바꿔 보면 6억·9억 같은 취득세 구간 경계에서 부대비용이 얼마나 달라지는지 바로 확인할 수 있습니다.</li>
            <li><strong>중개수수료 확인:</strong> 거래 금액에 따른 법정 중개수수료 상한을 미리 계산하면 과도한 수수료 요구에 대응할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}