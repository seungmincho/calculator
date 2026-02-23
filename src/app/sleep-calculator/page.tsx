import { Metadata } from 'next'
import { Suspense } from 'react'
import SleepCalculator from '@/components/SleepCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '수면 계산기 - 최적 취침·기상 시간 계산 | 툴허브',
  description:
    '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 지금 잠들면 언제 일어나야 하는지, 원하는 시간에 일어나려면 언제 자야 하는지 알려드립니다. 연령별 권장 수면 시간과 수면 습관 가이드 제공.',
  keywords:
    '수면 계산기, 수면 주기, 취침 시간, 기상 시간, 90분 수면, 렘수면, 수면 사이클, 수면 시간 계산, 잠 계산기, sleep calculator',
  openGraph: {
    title: '수면 계산기 - 최적 취침·기상 시간 계산 | 툴허브',
    description:
      '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 개운한 아침을 위한 수면 계산기.',
    url: 'https://toolhub.ai.kr/sleep-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '수면 계산기 - 최적 취침·기상 시간 계산',
    description:
      '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 개운한 아침을 위한 수면 계산기.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/sleep-calculator',
  },
}

export default function SleepCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '수면 계산기',
      description:
        '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 연령별 권장 수면 시간과 수면 습관 가이드를 제공합니다.',
      url: 'https://toolhub.ai.kr/sleep-calculator',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '수면 주기(90분) 기반 최적 기상 시간 계산',
        '목표 기상 시간 기반 최적 취침 시간 계산',
        '잠들기까지 걸리는 시간 설정 (1~60분)',
        '1~6 수면 주기별 시간 표시',
        '연령별 권장 수면 시간 안내',
        '수면 과학 및 건강한 수면 습관 가이드',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '수면 주기란 무엇인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '수면 주기는 약 90분 단위로 반복되는 수면의 단계입니다. 각 주기는 가벼운 수면(NREM 1-2단계), 깊은 수면(NREM 3단계), 렘수면(REM)으로 구성됩니다. 하룻밤에 보통 4~6회 반복되며, 수면 주기의 끝에서 기상하면 더 개운하게 일어날 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '왜 90분 단위로 수면을 계산하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '수면 주기 한 바퀴가 약 90분(80~100분)이기 때문입니다. 수면 주기 도중에 기상하면 깊은 수면에서 강제로 깨어나 수면 관성(sleep inertia)으로 인해 피로감과 몽롱함이 심해집니다. 주기가 완료되는 시점에 맞춰 기상하면 보다 상쾌하게 깨어날 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '성인의 적정 수면 시간은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '미국 수면 재단(National Sleep Foundation) 기준으로 성인(18~64세)의 적정 수면 시간은 7~9시간입니다. 이는 수면 주기 5~6회(7.5~9시간)에 해당합니다. 65세 이상은 7~8시간이 권장됩니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <SleepCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
