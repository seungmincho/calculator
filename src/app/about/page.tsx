import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import AboutPage from '@/components/AboutPage'

export const metadata: Metadata = {
  title: '툴허브 소개 - 계산 기준과 운영 원칙 | 툴허브',
  description: '툴허브는 연봉·세금·대출 계산기부터 개발·이미지·건강 도구, 게임까지 모은 무료 웹 도구 모음입니다. 계산 기준과 출처, 입력한 정보의 처리 방식, 오류 제보 방법을 안내합니다.',
  alternates: {
    canonical: 'https://toolhub.ai.kr/about/',
  },
  openGraph: {
    title: '툴허브 소개 | 툴허브',
    description: '계산 기준과 출처, 입력한 정보의 처리 방식, 오류 제보 방법',
    url: 'https://toolhub.ai.kr/about/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/about.png', width: 1200, height: 630, alt: '툴허브 소개' }],
  },
}

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '툴허브 소개',
    url: 'https://toolhub.ai.kr/about/',
    mainEntity: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr/',
      logo: 'https://toolhub.ai.kr/logo.png',
      email: 'toolhub.ai.kr@gmail.com',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'toolhub.ai.kr@gmail.com',
        url: 'https://toolhub.ai.kr/inquiry/',
        availableLanguage: ['Korean', 'English'],
      },
    },
  }

  return (
    <div className="min-h-screen py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <I18nWrapper>
          <AboutPage />
        </I18nWrapper>
      </div>
    </div>
  )
}
