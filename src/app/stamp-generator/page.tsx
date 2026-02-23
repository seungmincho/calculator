import { Metadata } from 'next'
import { Suspense } from 'react'
import StampGenerator from '@/components/StampGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '인감 도장 생성기 - 온라인 도장 만들기, 전자 서명 | 툴허브',
  description: '무료 온라인 인감 도장 생성기. 원형·사각·타원 도장을 한국어 이름(1~4글자)으로 즉시 만들고 PNG로 다운로드. 전통 붉은 도장, 현대적 파란·검정 스타일, 글꼴 3종 선택 가능.',
  keywords: '인감 도장 만들기, 온라인 도장 생성기, 도장 이미지 만들기, 전자 서명, 한글 도장, 원형 도장, 사각 도장, 무료 도장 생성, 도장 PNG 다운로드',
  openGraph: {
    title: '인감 도장 생성기 - 온라인 도장 만들기 | 툴허브',
    description: '원형·사각·타원 도장을 무료로 만들고 PNG 다운로드. 전통 붉은 인감부터 현대적 스타일까지.',
    url: 'https://toolhub.ai.kr/stamp-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '인감 도장 생성기 | 툴허브',
    description: '원형·사각·타원 도장을 무료로 만들고 PNG 다운로드.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/stamp-generator',
  },
}

export default function StampGeneratorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '인감 도장 생성기',
      description: '무료 온라인 인감 도장 생성기. 원형·사각·타원 도장을 한국어 이름으로 즉시 만들고 PNG로 다운로드.',
      url: 'https://toolhub.ai.kr/stamp-generator',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '원형·사각·타원 도장 모양 선택',
        '전통 붉은 인감·현대 파란·검정·커스텀 색상',
        '명조·고딕·붓글씨 글꼴 3종',
        '크기·테두리 굵기·투명도 조절',
        'PNG 다운로드 및 클립보드 복사',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '인감 도장 생성기로 만든 도장을 법적으로 사용할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '이 도장 이미지는 디자인·문서 장식·개인 메모 용도로만 사용하세요. 법적 효력을 가지는 인감 도장은 반드시 인감도장 등록 절차를 거쳐야 합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '도장에 몇 글자까지 입력할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '최대 4글자까지 입력할 수 있습니다. 한국어 이름 2~3글자에 가장 적합하며, 원형·타원 도장은 세로 배열, 사각 도장은 격자 배열로 표시됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '생성한 도장 이미지를 어떤 형식으로 저장할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'PNG 형식으로 다운로드하거나 클립보드에 복사할 수 있습니다. 배경이 투명한 PNG이므로 문서·이미지에 바로 붙여넣기 가능합니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <StampGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
