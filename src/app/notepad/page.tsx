import { Metadata } from 'next'
import { Suspense } from 'react'
import Notepad from '@/components/Notepad'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '온라인 메모장 - 자동 저장, 메모 관리 | 툴허브',
  description: '온라인 메모장 - 자동 저장, 여러 메모 관리, .txt 내보내기. 간편하게 메모하고 브라우저에 자동 저장됩니다.',
  keywords: '온라인 메모장, 메모장, 노트패드, notepad, 웹 메모장, 자동 저장 메모',
  openGraph: {
    title: '온라인 메모장 | 툴허브',
    description: '자동 저장, 여러 메모 관리, .txt 내보내기',
    url: 'https://toolhub.ai.kr/notepad',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '온라인 메모장 | 툴허브', description: '자동 저장 온라인 메모장' },
  alternates: { canonical: 'https://toolhub.ai.kr/notepad' },
}

export default function NotepadPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '온라인 메모장', description: '자동 저장, 여러 메모 관리, .txt 내보내기',
    url: 'https://toolhub.ai.kr/notepad', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['자동 저장', '여러 메모 관리', '.txt 내보내기', '글자/단어/줄 수 표시'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><Notepad /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
