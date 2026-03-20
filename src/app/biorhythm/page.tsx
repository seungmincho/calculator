import { Metadata } from 'next'
import { Suspense } from 'react'
import BiorhythmCalculator from '@/components/BiorhythmCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '바이오리듬 계산기 - 신체·감성·지성 리듬 차트 | 툴허브',
  description: '생년월일 기반 바이오리듬을 계산합니다. 신체(23일), 감성(28일), 지성(33일) 주기 차트, 위험일 표시, 종합 컨디션 점수, 두 사람 호환성 분석까지 한눈에 확인하세요.',
  keywords: '바이오리듬 계산기, biorhythm calculator, 바이오리듬 차트, 신체리듬, 감성리듬, 지성리듬, 바이오리듬 호환성, 컨디션 계산, 위험일',
  openGraph: {
    title: '바이오리듬 계산기 - 신체·감성·지성 리듬 | 툴허브',
    description: '생년월일 기반 바이오리듬 차트, 위험일, 종합 컨디션, 호환성 분석',
    url: 'https://toolhub.ai.kr/biorhythm',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '바이오리듬 계산기 | 툴허브',
    description: '생년월일 기반 바이오리듬 차트와 호환성 분석',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/biorhythm/',
  },
}

export default function BiorhythmPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '바이오리듬 계산기',
    description: '생년월일 기반 바이오리듬 계산 - 신체·감성·지성 리듬 차트, 위험일, 호환성 분석',
    url: 'https://toolhub.ai.kr/biorhythm/',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '신체(23일)·감성(28일)·지성(33일) 바이오리듬 계산',
      '인터랙티브 라인 차트',
      '위험일(영점 통과일) 자동 표시',
      '종합 컨디션 점수',
      '캘린더 뷰로 한 달 리듬 확인',
      '두 사람 호환성 분석',
      'URL 공유 지원',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '바이오리듬이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '바이오리듬은 사람의 신체적, 감성적, 지적 상태가 생년월일부터 일정한 주기로 변화한다는 이론입니다. 신체 23일, 감성 28일, 지성 33일 주기의 사인파로 표현됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '바이오리듬의 위험일이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '위험일은 바이오리듬 곡선이 0을 지나는 날로, 리듬이 양에서 음으로 또는 음에서 양으로 전환되는 불안정한 시점입니다. 이 날에는 주의력이 떨어질 수 있다고 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '바이오리듬은 과학적으로 검증되었나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '바이오리듬 이론은 과학적으로 검증되지 않았습니다. 재미로 참고하는 용도로 활용하시기 바라며, 중요한 의사결정에 사용하지 마세요.',
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
              <BiorhythmCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
