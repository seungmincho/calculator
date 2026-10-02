import { Metadata } from 'next'
import ComprehensivePropertyTax from '@/components/ComprehensivePropertyTax'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '종합부동산세 계산기 2026 - 종부세 자동계산, 세율표, 세액공제 | 툴허브',
  description: '2026년 종부세와 재산세를 함께 계산해 1년 보유세 합계를 보여줍니다. 1세대1주택·다주택 세율, 고령자·장기보유 세액공제, 단독 vs 부부 공동명의 비교, 7·9·12월 납부 일정까지 확인하세요.',
  keywords: '종합부동산세 계산기, 종부세 계산기, 종부세 2026, 재산세 계산기, 보유세 계산기, 재산세 2026, 1주택자 재산세, 공동명의 종부세, 종부세 납부기간, 종부세 세율, 종부세 공제, 공정시장가액비율, 고령자 세액공제, 장기보유 세액공제, 세부담상한, 농어촌특별세, 다주택 종부세',
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
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '종합부동산세란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '종합부동산세(종부세)는 일정 금액 이상의 부동산을 보유한 사람에게 부과되는 국세입니다. 주택의 경우 공시가격 합산액이 기본공제(1세대1주택 12억원, 일반 9억원)를 초과하면 과세 대상이 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2026년 종부세 공정시장가액비율은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 귀속 종합부동산세 공정시장가액비율은 60%입니다. 공시가격 합산액에서 기본공제(9억원, 1세대1주택 12억원)를 뺀 뒤 60%를 곱해 과세표준을 산출합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '1세대1주택자 종부세 혜택은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1세대1주택자는 기본공제 12억원(일반 9억원 대비 3억원 추가), 고령자 세액공제(최대 40%), 장기보유 세액공제(최대 50%)를 받을 수 있습니다. 두 공제의 합산 한도는 80%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '세부담상한이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '세부담상한은 전년도 보유세 대비 급격한 세금 인상을 방지하는 제도입니다. 개인은 주택 수와 관계없이 올해 재산세와 종부세 합계가 전년도 합계의 150%를 넘을 수 없습니다(2023년부터). 법인에는 세부담 상한이 없습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '재산세는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택 재산세는 공시가격에 공정시장가액비율(1세대1주택 43~45%, 그 외 60%)을 곱한 과세표준에 0.1~0.4% 세율(1세대1주택 공시가격 9억원 이하는 0.05~0.35% 특례)을 적용하고, 지방교육세 20%와 도시지역분 0.14%가 더해집니다. 7월과 9월에 절반씩 내며, 20만원 이하면 7월에 한 번에 냅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '부부 공동명의가 종부세에 유리한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '공동명의 1주택은 부부가 각자 9억원씩 공제받는 방식과 1세대1주택자 특례(12억원 공제 + 고령자·장기보유 공제) 중 하나를 고를 수 있습니다. 나이와 보유기간이 길면 특례가, 공시가격이 높고 공제 요건이 없으면 각자 공제가 유리한 경우가 많으니 계산기에서 비교해 보세요.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
