import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import PrivacyPolicy from '@/components/PrivacyPolicy'

export const metadata: Metadata = {
  title: '개인정보처리방침 - 툴허브',
  description: '툴허브의 개인정보처리방침입니다. 개인정보의 수집, 이용, 보호에 관한 사항을 안내합니다.',
  robots: { index: false, follow: false },
  openGraph: {
    title: '개인정보처리방침 | 툴허브',
    description: '툴허브의 개인정보처리방침',
    url: 'https://toolhub.ai.kr/privacy',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/privacy/',
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <I18nWrapper>
          <PrivacyPolicy />
        </I18nWrapper>
      </div>
    </div>
  )
}
