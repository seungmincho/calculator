import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import UnitConverter from '@/components/UnitConverter'

export const metadata: Metadata = {
  title: '단위 변환기 - 길이, 무게, 온도, CSS 단위 변환 | 툴허브',
  description: '길이, 무게, 온도, 면적, 부피, 데이터, CSS 단위를 변환합니다. px/rem/em 변환, 평수 계산 등 실용적인 단위 변환 기능.',
  keywords: '단위변환기, 길이변환, 무게변환, 온도변환, px변환, rem변환, 평수계산, unit converter',
  openGraph: {
    title: '단위 변환기 - 다양한 단위 변환',
    description: '길이, 무게, 온도, CSS 단위 등을 변환하세요',
    type: 'website',
  },
}

export default function UnitConverterPage() {
  return (
    <I18nWrapper>
      <UnitConverter />
    </I18nWrapper>
  )
}
