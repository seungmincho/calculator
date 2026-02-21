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
  alternates: {
    canonical: 'https://toolhub.ai.kr/color-converter',
  },
}

export default function ColorConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '색상 변환기',
    description: '색상 코드를 HEX, RGB, HSL, HSV, CMYK 형식으로 변환합니다. 컬러 피커와 색상 팔레트 기능을 제공합니다.',
    url: 'https://toolhub.ai.kr/color-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['HEX 변환', 'RGB 변환', 'HSL 변환', 'CMYK 변환', '실시간 미리보기']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <ColorConverter />
      </I18nWrapper>
    </>
  )
}
