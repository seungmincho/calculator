import LoanCalculator from '@/components/LoanCalculator'

export const metadata = {
  title: '대출 계산기 | 계산기 모음',
  description: '원리금균등상환 방식으로 월 상환금액과 총 이자를 계산해보세요.',
  keywords: '대출계산기, 월상환금, 이자계산, 주택대출, 원리금균등상환',
}

export default function LoanCalculatorPage() {
  return <LoanCalculator />
}