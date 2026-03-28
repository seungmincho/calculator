import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import CpuSchedulingVisualizer from '@/components/CpuSchedulingVisualizer'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'CPU 스케줄링 시각화 - FCFS, SJF, Round Robin 비교 | 툴허브',
  description: 'CPU 스케줄링 알고리즘을 간트 차트로 시각화하고 비교하세요. FCFS, SJF, SRTF, Round Robin, Priority 스케줄링을 애니메이션으로 학습할 수 있습니다.',
  keywords: 'CPU 스케줄링, 프로세스 스케줄링, FCFS, SJF, SRTF, Round Robin, Priority, 운영체제, OS 시각화, 간트 차트, 대기시간, 반환시간',
  openGraph: {
    title: 'CPU 스케줄링 시각화 - FCFS, SJF, Round Robin 비교 | 툴허브',
    description: 'CPU 스케줄링 알고리즘을 간트 차트로 시각화하고 비교하세요. FCFS, SJF, SRTF, Round Robin, Priority 스케줄링을 애니메이션으로 학습합니다.',
    url: 'https://toolhub.ai.kr/cpu-scheduling',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CPU 스케줄링 시각화',
    description: 'FCFS, SJF, SRTF, Round Robin, Priority 스케줄링 알고리즘을 간트 차트로 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cpu-scheduling/',
  },
}

export default function CpuSchedulingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CPU 스케줄링 시각화',
    description: 'CPU 스케줄링 알고리즘을 간트 차트로 시각화하고 비교하세요. FCFS, SJF, SRTF, Round Robin, Priority 스케줄링을 애니메이션으로 학습합니다.',
    url: 'https://toolhub.ai.kr/cpu-scheduling',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'FCFS, SJF, SRTF, Round Robin, Priority 스케줄링',
      '간트 차트 애니메이션',
      '알고리즘 비교 모드',
      '프로세스별 대기/반환/응답 시간 통계',
      '프리셋 시나리오',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'CPU 스케줄링이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CPU 스케줄링은 운영체제가 여러 프로세스 중 어떤 프로세스에 CPU를 할당할지 결정하는 방법입니다. FCFS, SJF, Round Robin 등 다양한 알고리즘이 있으며, 각각 대기 시간, 반환 시간, 응답 시간 등의 성능 지표가 다릅니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Round Robin의 시간 할당량(Time Quantum)은 어떻게 설정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '시간 할당량이 너무 크면 FCFS와 비슷해지고, 너무 작으면 문맥 교환 오버헤드가 증가합니다. 일반적으로 프로세스의 평균 CPU 버스트 시간의 80% 정도가 적절하며, 실무에서는 10~100ms를 사용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '선점형과 비선점형 스케줄링의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '비선점형(Non-preemptive)은 프로세스가 CPU를 자발적으로 반납할 때까지 기다리는 방식이고, 선점형(Preemptive)은 우선순위가 높은 프로세스가 도착하면 현재 실행 중인 프로세스를 중단시킬 수 있는 방식입니다. SRTF와 선점형 Priority가 선점형의 대표적 예입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <CpuSchedulingVisualizer />
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
