import { Metadata } from 'next'
import { Suspense } from 'react'
import ResidentNumber from '@/components/ResidentNumber'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '주민등록번호 검증기 - 유효성 검사, 생년월일 추출 | 툴허브',
  description: '주민등록번호 검증기 - 주민등록번호의 유효성을 검사하고 생년월일, 성별, 지역 정보를 추출합니다. 개인정보 보호 처리.',
  keywords: '주민등록번호 검증, 주민번호 확인, 주민등록번호 유효성, resident number validator, 주민번호 검증기',
  openGraph: { title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출' },
  alternates: { canonical: 'https://toolhub.ai.kr/resident-number' },
}

export default function ResidentNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주민등록번호 검증기', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주민번호 검증', '생년월일 추출', '성별 확인', '지역 정보'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><ResidentNumber /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
