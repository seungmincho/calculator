import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import BMICalculator from '@/components/BMICalculator'

export const metadata: Metadata = {
  title: 'BMI 계산기 | 체질량지수 계산 | 툴허브',
  description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요. 키와 몸무게로 간단하게 비만도를 측정하고 건강 관리에 도움이 되는 정보를 제공합니다.',
  keywords: 'BMI, 체질량지수, 비만도, 건강, 체중관리, 다이어트, 표준체중, BMI계산기',
  openGraph: {
    title: 'BMI 계산기 - 체질량지수 계산 | 툴허브',
    description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요. 키와 몸무게로 간단하게 비만도를 측정하고 건강 관리에 도움이 되는 정보를 제공합니다.',
    url: 'https://toolhub.ai.kr/bmi-calculator',
    siteName: '툴허브',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BMI 계산기 - 체질량지수 계산 | 툴허브',
    description: 'BMI(체질량지수)를 계산하여 건강 상태를 확인해보세요.',
  }
}

export default function BMICalculatorPage() {
  return (
    <>
      <I18nWrapper>
        <div className="container mx-auto px-4 py-8">
          <BMICalculator />
        </div>
      </I18nWrapper>
    </>
  )
}