import { Metadata } from 'next'
import { Suspense } from 'react'
import SignatureGenerator from '@/components/SignatureGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '서명 생성기 - 전자 서명 만들기, 이미지 다운로드 | 툴허브',
  description: '서명 생성기 - 마우스나 터치로 전자 서명을 생성하고 PNG/SVG 이미지로 다운로드합니다. 투명 배경 지원.',
  keywords: '서명 생성기, 전자 서명, e-signature generator, 서명 이미지, 서명 만들기',
  openGraph: { title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드' },
  alternates: { canonical: 'https://toolhub.ai.kr/signature-generator' },
}

export default function SignatureGeneratorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '서명 생성기', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['서명 그리기', 'PNG/SVG 다운로드', '투명 배경', '펜 설정'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><SignatureGenerator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
