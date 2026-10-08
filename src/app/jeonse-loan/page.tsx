import { Metadata } from 'next'
import JeonseLoanCalculator from '@/components/JeonseLoanCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import jeonseLoanCalcMessages from '../../../messages/generated/ko/ns/jeonseLoanCalc.json'

export const metadata: Metadata = {
  title: '전세대출 계산기 2026 - 버팀목·청년·신혼 금리 비교 | 툴허브',
  description: '2026년 기준 전세자금대출 금리·한도·월이자를 자동 계산합니다. 버팀목, 청년 버팀목, 신혼 버팀목, 시중은행 전세대출을 한눈에 비교하세요.',
  keywords: '전세대출 계산기, 버팀목 전세대출, 청년 전세대출, 신혼 전세대출, 전세대출 금리, 전세대출 한도, 전세대출 이자, LTV, 전세보증금대출',
  openGraph: {
    title: '전세대출 계산기 2026 | 툴허브',
    description: '버팀목·청년·신혼 전세대출 금리·한도 비교, 월 이자 자동 계산.',
    url: 'https://toolhub.ai.kr/jeonse-loan/',
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={jeonseLoanCalcMessages.jeonseLoanCalc.faq.items} />
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
