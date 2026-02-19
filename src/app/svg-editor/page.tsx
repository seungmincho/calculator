import { Metadata } from 'next'
import { Suspense } from 'react'
import SvgEditor from '@/components/SvgEditor'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'SVG 편집기 & 최적화 - SVG 코드 편집, 변환 | 툴허브',
  description: 'SVG 편집기 - SVG 코드 편집, 최적화, PNG/JPEG 변환을 한번에. 파일 크기 최적화, 색상 교체, 실시간 미리보기 지원.',
  keywords: 'SVG 편집기, SVG 최적화, SVG to PNG, SVG 변환, SVG optimizer, SVG editor, SVG 코드 편집',
  openGraph: {
    title: 'SVG 편집기 & 최적화 | 툴허브',
    description: 'SVG 코드 편집, 최적화, PNG/JPEG 변환을 한번에',
    url: 'https://toolhub.ai.kr/svg-editor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SVG 편집기 & 최적화 | 툴허브',
    description: 'SVG 코드 편집, 최적화, PNG/JPEG 변환을 한번에',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/svg-editor',
  },
}

export default function SvgEditorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SVG 편집기 & 최적화',
    description: 'SVG 코드 편집, 최적화, PNG/JPEG 변환을 한번에. 파일 크기 최적화, 색상 교체, 실시간 미리보기 지원.',
    url: 'https://toolhub.ai.kr/svg-editor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'SVG 코드 편집',
      'SVG 최적화 (파일 크기 축소)',
      'PNG/JPEG 변환 (1x~4x 해상도)',
      '색상 검출 및 교체',
      '실시간 미리보기',
      '크기 조절 (width/height/viewBox)',
      '드래그 앤 드롭 업로드',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <SvgEditor />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
