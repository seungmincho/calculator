import { Metadata } from 'next'
import { Suspense } from 'react'
import Viewer3D from '@/components/Viewer3D'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '3D 변환기 | 툴허브 - 3D 파일 변환, 최적화, 프린팅 분석',
  description: 'GLB, OBJ, STL 3D 파일 변환 및 뷰어. 포맷 변환, 모델 최적화, 3D 프린팅 분석까지 한 번에. 무료 온라인 3D 도구',
  keywords: '3D변환기, 3D파일변환, GLB변환, OBJ변환, STL변환, 3D프린팅, 3D뷰어, 3D최적화, WebGPU, 3D모델, 개발도구',
  openGraph: {
    title: '3D 변환기 | 툴허브',
    description: '3D 파일 변환, 최적화, 프린팅 분석까지 한 번에',
    url: 'https://toolhub.ai.kr/3d-viewer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D 변환기 - 변환, 최적화, 프린팅 분석',
    description: 'GLB, OBJ, STL 변환 및 3D 프린팅 예상 시간/재료 분석',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/3d-viewer',
  },
}

export default function Viewer3DPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '3D 변환기',
    description: '3D 파일 변환, 최적화, 프린팅 분석까지 한 번에. GLB, OBJ, STL 등 다양한 포맷 지원',
    url: 'https://toolhub.ai.kr/3d-viewer',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, WebGPU or WebGL',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '3D 파일 포맷 변환 (GLB, OBJ, STL)',
      '3D 프린팅 분석 (시간, 재료량 예상)',
      '모델 최적화 미리보기',
      'WebGPU 기반 고성능 렌더링',
      '자동 회전 및 와이어프레임 모드',
      '스크린샷 저장'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <Viewer3D />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
