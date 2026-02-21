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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '브라우저 메모장의 장점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 설치 불필요: 브라우저만 있으면 어디서든 사용 가능 ② 자동 저장: localStorage에 자동 저장되어 실수로 탭을 닫아도 내용 보존 ③ 개인정보 보호: 서버에 전송하지 않고 브라우저에만 저장 ④ 빠른 접근: 북마크에 추가하면 원클릭 접속 ⑤ 크로스 플랫폼: PC, 모바일 모두 사용 가능. 다만 브라우저 데이터를 삭제하면 내용이 사라지므로 중요한 내용은 별도 백업이 필요합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><Notepad /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
