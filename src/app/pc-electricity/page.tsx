import { Metadata } from 'next'
import { Suspense } from 'react'
import PcElectricityCalculator from '@/components/PcElectricityCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '컴퓨터 전기세 계산기 - PC 전력 소비·전기요금 | 툴허브',
  description: 'PC 부품별 소비전력으로 월간·연간 전기요금을 계산합니다. CPU, GPU, RAM, 모니터 등 부품별 전력 소비를 분석하세요.',
  keywords: '컴퓨터 전기세, PC 전기요금, 소비전력 계산, GPU 전력, CPU 전력, 전기요금 계산기, 게이밍 PC 전기세',
  openGraph: { title: '컴퓨터 전기세 계산기 | 툴허브', description: 'PC 전력 소비·전기요금 계산', url: 'https://toolhub.ai.kr/pc-electricity', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '컴퓨터 전기세 계산기 | 툴허브' },
  alternates: { canonical: 'https://toolhub.ai.kr/pc-electricity/' },
}

export default function PcElectricityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '컴퓨터 전기세 계산기',
    description: 'PC 부품별 소비전력으로 전기요금 계산.',
    url: 'https://toolhub.ai.kr/pc-electricity/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['CPU/GPU 프리셋', '누진제 전기요금', '부품별 소비 비율', '게이밍/일반/대기 부하율'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '게이밍 PC 한 달 전기세는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '게이밍 PC(CPU 125W + GPU 300W 기준)를 하루 5시간, 한 달 30일 사용 시 약 85kWh를 소비하며, 전기요금은 약 10,000~18,000원 수준입니다. 부하율과 부품에 따라 달라집니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <PcElectricityCalculator />
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
