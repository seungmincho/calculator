import { Metadata } from 'next'
import { Suspense } from 'react'
import InquiryForm from '@/components/InquiryForm'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '문의/건의하기 - 버그신고, 기능요청 | 툴허브',
  description: '툴허브에 대한 문의사항, 버그 신고, 기능 요청, 개선 제안을 남겨주세요. 빠르게 검토하여 반영하겠습니다.',
  keywords: '문의, 건의, 피드백, 버그신고, 기능요청, 툴허브',
  openGraph: {
    title: '문의/건의하기 | 툴허브',
    description: '툴허브에 대한 문의사항, 버그 신고, 기능 요청, 개선 제안을 남겨주세요.',
    url: 'https://toolhub.ai.kr/inquiry',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/inquiry',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function InquiryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <I18nWrapper>
            <InquiryForm />
          </I18nWrapper>
        </Suspense>
      </div>
    </div>
  )
}
