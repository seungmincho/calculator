import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import ColorConverter from '@/components/ColorConverter'

export const metadata: Metadata = {
  title: '색상 변환기 - HEX, RGB, HSL, CMYK 변환 | 툴허브',
  description: '색상 코드를 HEX, RGB, HSL, HSV, CMYK 형식으로 변환합니다. 컬러 피커와 색상 팔레트 기능을 제공합니다.',
  keywords: '색상변환기, hex변환, rgb변환, hsl변환, cmyk변환, 컬러피커, color converter',
  openGraph: {
    title: '색상 변환기 - HEX/RGB/HSL/CMYK 변환',
    description: '다양한 색상 형식을 손쉽게 변환하세요',
    type: 'website',
  },
}

export default function ColorConverterPage() {
  return (
    <I18nWrapper>
      <ColorConverter />
    </I18nWrapper>
  )
}
