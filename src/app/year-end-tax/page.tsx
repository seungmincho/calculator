import { Metadata } from 'next'
import YearEndTaxCalculator from '@/components/YearEndTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '연말정산 계산기 2027 (2026년 귀속) - 환급액 자동계산 | 툴허브',
  description: '2026년 귀속 연말정산 환급액을 자동으로 계산합니다. 근로소득공제, 인적공제, 신용카드·체크카드 소득공제, 의료비·교육비·연금저축 세액공제, 월세 세액공제까지 항목별 계산 결과를 한눈에 확인하세요.',
  keywords: '연말정산 계산기, 연말정산 2027, 2026 귀속 연말정산, 연말정산 2026, 연말정산 환급액, 소득공제, 세액공제, 신용카드 공제, 의료비 공제, 교육비 공제, 연금저축 공제, 월세 공제, 결정세액, 원천징수',
  openGraph: {
    title: '연말정산 계산기 2027 (2026년 귀속) | 툴허브',
    description: '2026년 귀속 연말정산 환급액·결정세액을 자동 계산. 소득공제·세액공제 항목별 분석.',
    url: 'https://toolhub.ai.kr/year-end-tax',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/year-end-tax.png', width: 1200, height: 630, alt: '연말정산 계산기 2027 (2026년 귀속)' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '연말정산 계산기 2026 | 툴허브',
    description: '2026년 귀속 연말정산 환급액 자동계산',
    images: ['https://toolhub.ai.kr/og/year-end-tax.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/year-end-tax/',
  },
}

export default function YearEndTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연말정산 계산기',
    description: '2026년 귀속 연말정산 환급액·결정세액을 자동 계산. 소득공제·세액공제 항목별 분석.',
    url: 'https://toolhub.ai.kr/year-end-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026년 귀속 최신 세율 반영',
      '근로소득공제 자동 계산',
      '신용카드·체크카드 소득공제',
      '의료비·교육비 세액공제',
      '연금저축·IRP 세액공제',
      '월세 세액공제',
      '결혼 세액공제 (2025 신설)',
      '자녀 세액공제 (2025 확대)',
      '단계별 계산 내역 표시',
      '환급액/추가납부액 자동 산출',
      '2026년 귀속 신용카드 자녀 추가한도·고향사랑기부 40% 구간 반영',
      '연금저축·체크카드·월세 절세 시뮬레이터',
      '중소기업 취업자 소득세 감면',
      '결과 이미지 공유',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '연말정산이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연말정산은 근로자가 1년간 납부한 근로소득세를 정산하는 절차입니다. 매월 급여에서 원천징수된 세금과 실제 납부해야 할 세금을 비교하여 차액을 환급받거나 추가 납부합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2026년 귀속 연말정산의 주요 변경사항은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 귀속 주요 변경사항: 자녀 세액공제 확대(1명 25만원, 2명 55만원), 월세 세액공제 한도 1,000만원으로 상향 및 대상 총급여 8,000만원 이하로 확대, 결혼 세액공제 50만원 신설, 주택청약저축 납입한도 300만원으로 상향, 6세 이하 의료비 한도 폐지 등이 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '신용카드 소득공제는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '총급여의 25%를 초과하여 사용한 금액부터 공제됩니다. 신용카드 15%, 체크카드·현금영수증 30%, 도서·공연·체육시설 30%(총급여 7,000만원 이하), 전통시장·대중교통 40%의 공제율이 적용됩니다. 기본 한도는 총급여 7,000만원 이하 300만원, 초과 250만원이며, 2026년 귀속부터 자녀 1명당 50만원(최대 100만원, 7,000만원 초과자는 25만원·최대 50만원)이 늘어납니다. 전통시장·대중교통·도서공연체육은 합산 300만원(7,000만원 초과 200만원)의 추가 한도가 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '연금저축과 IRP의 세액공제 한도는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연금저축 최대 600만원, 연금저축+IRP 합산 최대 900만원까지 세액공제를 받을 수 있습니다. 총급여 5,500만원 이하는 16.5%, 초과는 13.2%의 공제율이 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월세 세액공제를 받을 수 있는 조건은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '총급여 8,000만원 이하(2026년 귀속 기준) 무주택 세대주 또는 세대원으로, 전용면적 85㎡ 이하 또는 기준시가 4억원 이하 주택에 거주하는 경우 월세의 15~17%(총급여 5,500만원 이하 17%, 초과 15%)를 세액공제 받을 수 있습니다. 연간 한도는 1,000만원입니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '연말정산 환급액 계산하는 방법',
    description: '총급여와 공제 항목을 입력하면 연말정산 환급액 또는 추가납부액을 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '총급여 입력', text: '연간 총급여(세전)와 기납부 소득세(원천징수 세액)를 입력합니다.' },
      { '@type': 'HowToStep', name: '공제 항목 입력', text: '인적공제, 신용카드·체크카드 사용액, 의료비, 교육비, 연금저축, 월세 등 공제 항목을 입력합니다.' },
      { '@type': 'HowToStep', name: '환급액 확인', text: '소득공제·세액공제 내역과 결정세액을 확인하고, 환급액 또는 추가납부액을 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <YearEndTaxCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
