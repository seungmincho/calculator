import { Metadata } from 'next'
import { Suspense } from 'react'
import Viewer3D from '@/components/Viewer3D'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/3d-viewer/',
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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '지원하는 3D 파일 형식은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이 뷰어는 GLB, GLTF, OBJ, STL 형식을 지원합니다. GLB/GLTF: Khronos 표준 형식으로 웹 3D에서 가장 널리 사용됩니다. 텍스처, 애니메이션, 머티리얼을 포함할 수 있습니다. OBJ: 가장 오래된 범용 3D 형식으로 대부분의 3D 소프트웨어가 지원합니다. STL: 3D 프린팅에 주로 사용되는 형식으로 메쉬(표면) 정보만 포함합니다. Babylon.js 엔진으로 브라우저에서 실시간 렌더링합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <Viewer3D />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            온라인 3D 뷰어 및 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            3D 뷰어는 GLB, GLTF, OBJ, STL 등 다양한 3D 파일 형식을 브라우저에서 바로 열람하고 변환할 수 있는 무료 온라인 도구입니다. Babylon.js 엔진을 기반으로 WebGL 렌더링을 제공하며, 별도 소프트웨어 설치 없이 3D 모델 미리보기, 와이어프레임 확인, 3D 프린팅 분석(출력 시간·재료량 예상)까지 한 번에 처리할 수 있습니다. 3D 프린터 사용자, 게임 개발자, 디자이너에게 유용한 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            3D 뷰어 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>파일 형식 선택:</strong> 웹/게임용은 GLB(텍스처 포함 단일 파일), 3D 프린팅용은 STL, 범용 호환성은 OBJ 형식을 사용하세요.</li>
            <li><strong>3D 프린팅 분석:</strong> STL 파일을 업로드하면 예상 출력 시간과 필라멘트 소모량을 미리 확인하여 비용을 계산할 수 있습니다.</li>
            <li><strong>와이어프레임 모드:</strong> 모델의 폴리곤 구조와 메쉬 품질을 확인하는 데 와이어프레임 뷰를 활용하세요.</li>
            <li><strong>자동 회전 기능:</strong> 모델을 360도 자동으로 회전하여 모든 각도에서 확인하고 스크린샷으로 저장할 수 있습니다.</li>
            <li><strong>드래그앤드롭 업로드:</strong> 파일 탐색기에서 3D 파일을 뷰어 영역으로 바로 드래그하면 즉시 로딩됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
