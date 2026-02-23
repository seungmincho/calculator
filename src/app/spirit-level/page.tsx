import { Metadata } from 'next'
import { Suspense } from 'react'
import SpiritLevel from '@/components/SpiritLevel'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '수평계·나침반 - 기울기 측정, 방위 확인 | 툴허브',
  description: '스마트폰 센서를 활용한 디지털 수평계와 나침반. 기울기 각도 실시간 측정, 방위각 확인, 잠금 기능 지원. 공사·인테리어·캠핑에 유용합니다.',
  keywords: '수평계, 나침반, 기울기 측정, 방위각, spirit level, compass, 디지털 수평계, 스마트폰 수평계',
  openGraph: {
    title: '수평계·나침반 | 툴허브',
    description: '스마트폰으로 기울기와 방위를 측정하세요. 디지털 수평계 & 나침반.',
    url: 'https://toolhub.ai.kr/spirit-level',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '수평계·나침반 | 툴허브',
    description: '스마트폰 센서 기반 디지털 수평계 & 나침반',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/spirit-level',
  },
}

const faqData = [
  {
    question: '수평계가 정확하게 작동하지 않아요.',
    answer: '수평계는 스마트폰의 가속도 센서(자이로스코프)를 사용합니다. 데스크톱 PC에서는 작동하지 않으며, 일부 구형 스마트폰에서는 센서가 없을 수 있습니다. iOS의 경우 센서 권한을 별도로 허용해야 합니다.',
  },
  {
    question: '나침반 방위가 실제와 다른 것 같아요.',
    answer: '스마트폰 나침반은 자기 센서(magnetometer)를 사용하며, 주변의 자기장(전자기기, 금속 등)에 영향을 받을 수 있습니다. 8자 모양으로 기기를 흔들어 캘리브레이션하면 정확도가 향상됩니다.',
  },
  {
    question: '이 도구를 실제 공사에 사용해도 되나요?',
    answer: '스마트폰 센서의 정밀도는 전문 수평계보다 낮습니다. 간단한 DIY나 가구 배치 확인에는 유용하지만, 정밀 공사에는 전문 수평계를 사용하시기 바랍니다. 일반적으로 ±1~2도 정도의 오차가 있을 수 있습니다.',
  },
]

export default function SpiritLevelPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수평계·나침반',
    description: '스마트폰 센서를 활용한 디지털 수평계와 나침반',
    url: 'https://toolhub.ai.kr/spirit-level',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, DeviceOrientation API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '실시간 기울기 측정 (수평계 모드)',
      '방위각 확인 (나침반 모드)',
      '좌우/전후 각도 표시',
      '측정값 잠금 기능',
      '수평 달성 시 시각적 피드백',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <SpiritLevel />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
