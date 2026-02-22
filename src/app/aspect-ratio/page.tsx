import { Metadata } from 'next'
import { Suspense } from 'react'
import AspectRatio from '@/components/AspectRatio'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '화면 비율 계산기 - 종횡비, 해상도 계산 | 툴허브',
  description: '화면 비율 계산기 - 가로세로 비율(종횡비) 계산, 해상도 변환, 비율 유지 리사이즈. 주요 해상도 프리셋 제공.',
  keywords: '화면 비율 계산기, aspect ratio calculator, 종횡비, 해상도 계산, 16:9, 4:3',
  openGraph: { title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/aspect-ratio' },
}

export default function AspectRatioPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면 비율 계산기', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['종횡비 계산', '해상도 변환', '비율 유지 리사이즈', '프리셋 해상도'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '화면 비율(Aspect Ratio)이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면 비율은 가로와 세로의 비율을 나타냅니다. 주요 비율: 16:9(FHD/4K TV, 유튜브), 4:3(구형 TV, iPad), 21:9(울트라와이드 모니터), 1:1(인스타그램 정사각형), 9:16(모바일 세로, 릴스/쇼츠), 3:2(DSLR 사진). 웹 디자인에서는 CSS aspect-ratio 속성으로 요소의 비율을 유지할 수 있으며, 반응형 이미지/비디오에 필수입니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><AspectRatio /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
