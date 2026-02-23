import { Metadata } from 'next'
import { Suspense } from 'react'
import NoiseMeter from '@/components/NoiseMeter'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '소음 측정기 - 데시벨(dB) 측정, 층간소음 측정 | 툴허브',
  description: '마이크를 이용하여 주변 소음을 실시간으로 측정합니다. 데시벨(dB) 수치, 최대·최소·평균값, 히스토리 그래프를 확인하세요. 층간소음, 작업환경 소음 체크에 유용합니다.',
  keywords: '소음 측정기, 데시벨 측정, dB 측정, 층간소음 측정, 소음 레벨, 소리 크기 측정, 소음 측정 앱, 데시벨 미터',
  openGraph: {
    title: '소음 측정기 (데시벨 미터) | 툴허브',
    description: '마이크로 주변 소음을 실시간 측정. 층간소음 체크에 유용.',
    url: 'https://toolhub.ai.kr/noise-meter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '소음 측정기 | 툴허브',
    description: '실시간 데시벨(dB) 소음 측정.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/noise-meter',
  },
}

const faqData = [
  {
    question: '웹에서 소음 측정이 정확한가요?',
    answer: '웹 소음 측정기는 전문 장비와 달리 정밀한 보정이 되어 있지 않아 참고용입니다. 마이크 성능, 환경, 기기에 따라 ±5~15dB 오차가 있을 수 있습니다. 정확한 측정이 필요하면 전문 소음 측정기를 사용하세요.',
  },
  {
    question: '층간소음 기준은 어떻게 되나요?',
    answer: '한국 환경부 기준으로 직접충격소음은 1분간 등가소음도 43dB(주간)/38dB(야간), 공기전달소음은 5분간 등가소음도 45dB(주간)/40dB(야간)을 초과하면 층간소음으로 인정됩니다.',
  },
  {
    question: '85dB 이상이 위험한 이유는?',
    answer: '85dB 이상의 소음에 8시간 이상 지속적으로 노출되면 청력 손실 위험이 있습니다. 산업안전보건법에서도 85dB을 소음 작업 기준으로 규정하고 있으며, 100dB 이상은 15분 이상 노출에도 위험합니다.',
  },
]

export default function NoiseMeterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '소음 측정기',
    description: '마이크를 이용한 실시간 소음(데시벨) 측정 도구',
    url: 'https://toolhub.ai.kr/noise-meter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Microphone access',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '실시간 데시벨(dB) 측정',
      '최대·최소·평균 통계',
      '히스토리 그래프',
      '소음 수준 참고표',
      '모바일 최적화',
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
              <NoiseMeter />
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
