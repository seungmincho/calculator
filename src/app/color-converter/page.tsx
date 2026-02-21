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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'HEX, RGB, HSL 색상 코드의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'HEX는 #FF5733처럼 16진수로 표현하며 웹 개발에서 가장 널리 사용됩니다. RGB는 rgb(255, 87, 51)처럼 빨강, 초록, 파랑 값(0-255)으로 표현하며 모니터 디스플레이 원리와 동일합니다. HSL은 hsl(14, 100%, 60%)처럼 색상(Hue 0-360°), 채도(Saturation 0-100%), 밝기(Lightness 0-100%)로 표현하며 직관적인 색상 조절에 유리합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'CMYK와 RGB의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'RGB는 빛의 삼원색(빨강, 초록, 파랑)을 혼합하는 가산혼합 방식으로, 모니터, TV 등 디스플레이에 사용됩니다. CMYK는 잉크의 사원색(시안, 마젠타, 노랑, 검정)을 혼합하는 감산혼합 방식으로, 인쇄물에 사용됩니다. 모니터에서 보이는 색상과 인쇄 결과가 다를 수 있어 인쇄 작업 시 CMYK 변환이 필수적입니다.'
        }
      },
      {
        '@type': 'Question',
        name: '웹 접근성을 위한 색상 대비 기준은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'WCAG 2.1 기준으로 일반 텍스트는 배경과 최소 4.5:1, 큰 텍스트(18pt 이상)는 3:1의 명도 대비를 충족해야 합니다. AAA 등급은 일반 텍스트 7:1, 큰 텍스트 4.5:1을 요구합니다. 예를 들어 흰 배경(#FFFFFF)에 회색 텍스트는 #757575 이상 어두워야 AA 기준을 충족합니다.'
        }
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <ColorConverter />
      </I18nWrapper>
    </>
  )
}
