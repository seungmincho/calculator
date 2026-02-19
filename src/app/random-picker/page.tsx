import { Metadata } from 'next'
import { Suspense } from 'react'
import RandomPicker from '@/components/RandomPicker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '랜덤 뽑기 - 추첨기, 숫자 뽑기, 팀 나누기 | 툴허브',
  description: '랜덤 뽑기 도구 - 랜덤 숫자 생성, 이름/항목 추첨, 팀 나누기를 간편하게. 교실, 이벤트, 회식 장소 정하기 등에 활용하세요.',
  keywords: '랜덤 뽑기, 추첨기, 랜덤 숫자, 팀 나누기, 제비뽑기, random picker, 돌림판',
  openGraph: {
    title: '랜덤 뽑기 | 툴허브',
    description: '랜덤 숫자 생성, 이름 뽑기, 팀 나누기',
    url: 'https://toolhub.ai.kr/random-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '랜덤 뽑기 | 툴허브', description: '랜덤 숫자, 이름 뽑기, 팀 나누기' },
  alternates: { canonical: 'https://toolhub.ai.kr/random-picker' },
}

export default function RandomPickerPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '랜덤 뽑기', description: '랜덤 숫자, 이름 뽑기, 팀 나누기',
    url: 'https://toolhub.ai.kr/random-picker', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['랜덤 숫자 생성', '목록에서 랜덤 뽑기', '팀 나누기'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><RandomPicker /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
