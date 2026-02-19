import { Metadata } from 'next'
import { Suspense } from 'react'
import FontPreview from '@/components/FontPreview'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '글꼴 미리보기 - 폰트 테스트, 웹폰트 비교 | 툴허브',
  description: '글꼴 미리보기 - 다양한 한글/영문 웹폰트로 텍스트를 미리보세요. 크기, 굵기, 줄간격 조절, CSS 복사 기능.',
  keywords: '폰트 미리보기, 글꼴 테스트, 웹폰트 비교, font preview, 한글 폰트, 구글 폰트',
  openGraph: { title: '글꼴 미리보기 | 툴허브', description: '다양한 폰트로 텍스트 미리보기', url: 'https://toolhub.ai.kr/font-preview', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '글꼴 미리보기 | 툴허브', description: '폰트 미리보기, 비교, CSS 복사' },
  alternates: { canonical: 'https://toolhub.ai.kr/font-preview' },
}

export default function FontPreviewPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '글꼴 미리보기', description: '다양한 웹폰트로 텍스트 미리보기 및 비교', url: 'https://toolhub.ai.kr/font-preview', applicationCategory: 'DesignApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글/영문 폰트', '크기/굵기 조절', '폰트 비교', 'CSS 복사'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><FontPreview /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
