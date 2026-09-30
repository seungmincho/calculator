import { Metadata } from 'next'
import JeonseLoanCalculator from '@/components/JeonseLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '전세대출 계산기 2026 - 버팀목·청년·신혼 금리 비교 | 툴허브',
  description: '2026년 기준 전세자금대출 금리·한도·월이자를 자동 계산합니다. 버팀목, 청년 버팀목, 신혼 버팀목, 시중은행 전세대출을 한눈에 비교하세요.',
  keywords: '전세대출 계산기, 버팀목 전세대출, 청년 전세대출, 신혼 전세대출, 전세대출 금리, 전세대출 한도, 전세대출 이자, LTV, 전세보증금대출',
  openGraph: {
    title: '전세대출 계산기 2026 | 툴허브',
    description: '버팀목·청년·신혼 전세대출 금리·한도 비교, 월 이자 자동 계산.',
    url: 'https://toolhub.ai.kr/jeonse-loan',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/jeonse-loan.png', width: 1200, height: 630, alt: '전세대출 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '전세대출 계산기 2026 | 툴허브',
    description: '전세대출 금리·한도·월이자 자동계산',
    images: ['https://toolhub.ai.kr/og/jeonse-loan.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/jeonse-loan/',
  },
}

export default function JeonseLoanPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '전세대출 계산기',
    description: '2026년 기준 전세자금대출 금리·한도·월이자를 자동 계산. 버팀목·청년·신혼·시중은행 비교.',
    url: 'https://toolhub.ai.kr/jeonse-loan/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '주택도시기금 금리표 반영 (2026-10-01 조회)',
      '버팀목·청년전용·신혼부부전용·신생아 특례·시중은행 5종 비교',
      '소득·보증금 구간별 금리 자동 매칭 + 우대금리 상한 적용',
      '예상 대출 한도·월 이자·필요한 내 돈·2년 총 이자',
      '소득·순자산·보증금·나이 자격 체크리스트',
      '월세 전환 시 비용 비교 (법정 전환율)',
      'HUG 전세보증금반환보증 보증료 계산',
      '만기일시/원리금균등 상환 계산',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '전세대출 계산기 사용 방법',
    description: '전세 보증금과 조건을 입력해 버팀목·청년·신혼 전세대출 한도·금리·월 이자를 계산하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '전세 보증금 입력',
        text: '계약 예정인 전세 보증금 금액을 입력합니다. 수도권과 지방에 따라 대출 한도 기준이 다릅니다.',
      },
      {
        '@type': 'HowToStep',
        name: '대출 한도 확인',
        text: '소득·순자산·나이·혼인·자녀 정보를 입력하면 버팀목(보증금 70%), 청년전용·신혼부부전용·신생아 특례 버팀목(보증금 80%), 시중은행 전세대출의 자격과 대출 가능 한도를 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '금리와 기간 설정',
        text: '자격 조건에 따라 자동 매칭된 금리를 확인하고, 대출 기간(2년 또는 최대 10년)을 설정합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '월 이자와 총 비용 확인',
        text: '월 이자, 필요한 내 돈, 2년 총 이자, 월세로 살 때와의 비용 차이, HUG 전세보증금반환보증 보증료를 확인하고 상품을 비교합니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '전세대출이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전세대출은 전세보증금을 마련하기 위해 금융기관에서 대출받는 것입니다. 주택도시기금의 버팀목 계열 상품과 시중은행 상품(HF·HUG·SGI 보증)이 있으며, 보증금의 70~80% 안에서 상품별 호당 한도까지 대출됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '버팀목 전세대출 금리는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주택도시기금(2026-10-01 조회) 기준 일반 버팀목은 연 2.5~3.5%, 청년전용 버팀목은 연 2.2~3.3%, 신혼부부전용은 연 1.9~3.3%, 신생아 특례는 연 1.3~4.3%입니다. 부부합산 소득과 보증금 구간에 따라 정해지고, 지방 주택은 0.2%p 낮으며, 우대금리는 합계 0.5%p(다자녀 0.7%p)까지, 최종 금리는 최저 연 1.0%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년 전세대출 자격 조건은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '만 19~34세 무주택 세대주(중소·중견기업 재직 등 병역이행자는 최대 만 39세), 부부합산 연소득 5천만원 이하(2자녀 6천만원, 신혼 7.5천만원), 순자산 3.45억원 이하가 대상입니다. 보증금 3억원 이하·전용 85㎡ 이하 주택이며 한도는 1.5억원(만 25세 미만 단독세대주 1.2억원), 보증금의 80% 이내입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '전세대출 LTV란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '전세대출 한도는 보증금 대비 비율과 상품별 호당 한도 중 작은 금액입니다. 일반 버팀목은 보증금의 70%(수도권 1.2억원), 청년·신혼·신생아 특례는 80%입니다. 예를 들어 보증금 2억원이면 청년전용은 80%인 1.6억원이 아니라 호당 한도 1.5억원까지 대출됩니다.',
        },
      },
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
              <JeonseLoanCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
