import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import RealEstateCalculator from '@/components/RealEstateCalculator'

export const metadata: Metadata = {
  title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
  description: '전세자금대출, 주택담보대출 월 상환금액과 취득세를 정확하게 계산해보세요. LTV 계산 및 한국 부동산 세법 기준 적용.',
  keywords: '부동산계산기, 전세자금대출, 주택담보대출, 취득세계산, LTV계산, 부동산세금, 대출계산기',
  openGraph: {
    title: '부동산 계산기 - 전세자금대출, 주택담보대출, 취득세',
    description: '부동산 관련 모든 계산을 한 곳에서 쉽게 해결하세요',
    type: 'website',
  },
}

export default function RealEstateCalculatorPage() {
  return <I18nWrapper>
        <RealEstateCalculator />
      </I18nWrapper>
}