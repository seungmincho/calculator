import { Metadata } from 'next'
import { Suspense } from 'react'
import SleepCalculator from '@/components/SleepCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/sleep-calculator/',
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
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            수면 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            수면 계산기는 90분 단위의 수면 주기(렘수면·깊은수면 사이클)를 기반으로 최적의 취침 시간과 기상 시간을 계산해 주는 건강 도구입니다. 수면 주기 중간에 깨면 피로와 수면 관성이 심해지므로, 주기가 끝나는 시점에 맞춰 기상하면 성인 기준 7~9시간 권장 수면을 더 개운하게 채울 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            수면 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>잠들기까지 시간 반영:</strong> 잠자리에 눕고 실제로 잠드는 데 평균 15~20분이 걸리므로, 계산기에서 이 시간을 설정하면 더 정확한 기상 시각을 얻을 수 있습니다.</li>
            <li><strong>수면 주기 5~6회 목표:</strong> 성인에게 권장되는 7.5~9시간 수면은 수면 주기 5~6회에 해당합니다. 최소 4주기(6시간)는 확보하는 것이 좋습니다.</li>
            <li><strong>일관된 기상 시간 유지:</strong> 주말에도 평일과 같은 시간에 일어나면 일주기 리듬(서카디언 리듬)이 안정되어 취침 시간에 자연스럽게 졸음이 옵니다.</li>
            <li><strong>취침 전 습관 관리:</strong> 취침 1시간 전 스마트폰·TV의 블루라이트를 줄이고, 18~20°C의 서늘한 환경을 만들면 깊은 수면 진입이 빨라집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
