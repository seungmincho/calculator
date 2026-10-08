import { Metadata } from 'next'
import ComprehensivePropertyTax from '@/components/ComprehensivePropertyTax'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import comprehensivePropertyTaxMessages from '../../../messages/generated/ko/ns/comprehensivePropertyTax.json'

export const metadata: Metadata = {
  title: '종합부동산세 계산기 2026 - 종부세 자동계산, 세율표, 세액공제 | 툴허브',
  description: '2026년 종부세와 재산세를 함께 계산해 1년 보유세 합계를 보여줍니다. 고지서 금액 대조, 12월 15일 납부기한 D-day·분납, 1세대1주택·다주택 세율, 고령자·장기보유 공제, 공동명의 비교까지 확인하세요.',
  keywords: '종합부동산세 계산기, 종부세 계산기, 종부세 2026, 재산세 계산기, 보유세 계산기, 재산세 2026, 1주택자 재산세, 공동명의 종부세, 종부세 납부기간, 종부세 세율, 종부세 공제, 공정시장가액비율, 고령자 세액공제, 장기보유 세액공제, 세부담상한, 농어촌특별세, 다주택 종부세, 종부세 고지서, 종부세 분납, 종부세 납부기한, 종부세 납부유예, 일시적 2주택 종부세',
  openGraph: {
    title: '종합부동산세 계산기 2026 | 툴허브',
    description: '2026년 종부세·재산세 1년 보유세 합계, 공동명의 비교, 납부 일정까지 단계별로.',
    url: 'https://toolhub.ai.kr/comprehensive-property-tax/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/comprehensive-property-tax.png', width: 1200, height: 630, alt: '종합부동산세 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '종합부동산세 계산기 2026 | 툴허브',
    description: '종부세+재산세 1년 보유세 자동계산',
    images: ['https://toolhub.ai.kr/og/comprehensive-property-tax.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/comprehensive-property-tax/',
  },
}

export default function ComprehensivePropertyTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '종합부동산세·재산세 계산기',
    description: '2026년 종합부동산세와 재산세를 합친 1년 보유세 자동계산. 세율, 세액공제, 공동명의 비교, 납부 일정.',
    url: 'https://toolhub.ai.kr/comprehensive-property-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026년 종부세 세율·공정시장가액비율 60% 반영',
      '1세대1주택·2주택 이하·3주택 이상 구분',
      '재산세 + 종부세 1년 보유세 합계',
      '고령자·장기보유 세액공제 계산',
      '세부담상한 (150%) 적용',
      '7·9·12월 납부 일정과 분납',
      '단독 vs 부부 공동명의 비교',
      '공시가격 변동 시나리오',
      '농어촌특별세 자동 계산',
      '다주택 합산 공시가격 입력',
      '단계별 계산 과정 상세 표시',
      '종부세 고지서 금액 대조와 차이 이유',
      '납부기한 D-day·분납·납부유예 안내',
      '일시적 2주택 처분기한 (종부세·양도세·취득세)',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={comprehensivePropertyTaxMessages.comprehensivePropertyTax.u.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ComprehensivePropertyTax />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
