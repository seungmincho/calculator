import { Metadata } from 'next'
import { Suspense } from 'react'
import PasswordGenerator from '@/components/PasswordGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '비밀번호 생성기 - 안전한 패스워드 및 패스프레이즈 생성 | 툴허브',
  description: '강력하고 안전한 비밀번호와 패스프레이즈를 쉽고 빠르게 생성하세요. 비밀번호 강도 분석, 엔트로피 계산, 일괄 생성 및 복사 기능을 제공합니다.',
  keywords: '비밀번호 생성기, 패스워드 생성, 패스프레이즈, 랜덤 비밀번호, 보안, password generator, 강력한 비밀번호, 비밀번호 강도',
  openGraph: {
    title: '비밀번호 생성기 | 툴허브',
    description: '안전한 비밀번호와 패스프레이즈 생성 도구 - 강도 분석, 엔트로피 계산, 일괄 생성',
    url: 'https://toolhub.ai.kr/password-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '비밀번호 생성기 - 안전한 패스워드 생성 도구',
    description: '강력하고 안전한 비밀번호와 패스프레이즈를 생성하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/password-generator',
  },
}

export default function PasswordGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '비밀번호 생성기',
    description: '강력하고 안전한 비밀번호와 패스프레이즈를 생성하는 도구',
    url: 'https://toolhub.ai.kr/password-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '랜덤 비밀번호 생성 (8-128자)',
      '패스프레이즈 생성',
      '비밀번호 강도 분석',
      '엔트로피 계산',
      '대량 생성 기능',
      '원클릭 복사',
      '세션 히스토리'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <PasswordGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
