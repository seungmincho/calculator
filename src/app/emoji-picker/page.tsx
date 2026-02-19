import { Metadata } from 'next'
import { Suspense } from 'react'
import EmojiPicker from '@/components/EmojiPicker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이모지 검색 - 이모지 복사, 카테고리별 모음 | 툴허브',
  description: '이모지 검색 도구 - 한글/영어로 이모지를 검색하고 클릭 한 번으로 복사하세요. 표정, 동물, 음식 등 카테고리별로 분류된 이모지 모음.',
  keywords: '이모지 검색, 이모지 복사, 이모지 모음, emoji picker, 이모티콘 복사, 특수문자',
  openGraph: { title: '이모지 검색 | 툴허브', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이모지 검색 | 툴허브', description: '이모지 검색, 복사, 카테고리별 모음' },
  alternates: { canonical: 'https://toolhub.ai.kr/emoji-picker' },
}

export default function EmojiPickerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이모지 검색', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['이모지 검색', '클릭 복사', '카테고리별 분류', '최근 사용 기록'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><EmojiPicker /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
