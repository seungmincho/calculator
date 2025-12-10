import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import MedianIncomeTable from '@/components/MedianIncomeTable'

export const metadata: Metadata = {
  title: '기준 중위소득 조회 - 2025년, 2026년 가구별 중위소득',
  description: '2025년, 2026년 기준 중위소득을 가구원수별, 비율별로 조회하세요. 기초생활수급자 선정기준, 복지급여 기준, 정부 지원사업 자격요건을 한눈에 확인할 수 있습니다.',
  keywords: '기준중위소득, 2025년 중위소득, 2026년 중위소득, 기초생활수급자, 복지급여, 생계급여, 의료급여, 주거급여, 교육급여, 차상위계층',
  openGraph: {
    title: '기준 중위소득 조회 - 2025년, 2026년 | 툴허브',
    description: '가구원수별, 비율별 기준 중위소득과 정부 복지사업 자격요건을 한눈에 확인하세요',
    url: 'https://toolhub.ai.kr/median-income',
    images: [
      {
        url: '/og-median-income.png',
        width: 1200,
        height: 630,
        alt: '기준 중위소득 조회',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '기준 중위소득 조회 - 2025년, 2026년 | 툴허브',
    description: '가구원수별, 비율별 기준 중위소득과 정부 복지사업 자격요건을 한눈에 확인하세요',
    images: ['/og-median-income.png'],
  },
}

export default function MedianIncomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '기준 중위소득 조회',
    description: '한국 기준 중위소득을 연도별, 가구원수별, 비율별로 조회하고 복지사업 자격요건을 확인하는 도구',
    url: 'https://toolhub.ai.kr/median-income',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '연도별 기준 중위소득 조회',
      '가구원수별 중위소득 확인',
      '비율별 중위소득 계산',
      '기초생활수급자 선정기준 확인',
      '정부 지원사업 자격요건 안내'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <MedianIncomeTable />
      </I18nWrapper>
    </>
  )
}
