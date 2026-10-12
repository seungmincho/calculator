import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TermsOfService from '@/components/TermsOfService'

export const metadata: Metadata = {
  title: '이용약관 - 툴허브',
  description: '툴허브 이용약관입니다. 서비스 이용 조건, 계산 결과의 성격, 게임 기록, 이용자의 의무를 안내합니다.',
  robots: { index: false, follow: true },
  alternates: {
    canonical: 'https://toolhub.ai.kr/terms/',
  },
  openGraph: {
    title: '이용약관 | 툴허브',
    description: '툴허브 이용약관',
    url: 'https://toolhub.ai.kr/terms/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/terms.png', width: 1200, height: 630, alt: '이용약관' }],
  },
}

export default function Page() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <I18nWrapper>
          <TermsOfService />
        </I18nWrapper>
      </div>
    </div>
  )
}
