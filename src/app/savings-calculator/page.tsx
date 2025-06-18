import SavingsCalculator from '@/components/SavingsCalculator'

export const metadata = {
  title: '적금 계산기 | 계산기 모음',
  description: '다양한 적금 상품을 비교하고 목표 금액 달성을 위한 최적의 저축 계획을 세워보세요.',
  keywords: '적금계산기, 목표적금, 복리적금, 저축계획, 이자계산',
}

export default function SavingsCalculatorPage() {
  return <SavingsCalculator />
}