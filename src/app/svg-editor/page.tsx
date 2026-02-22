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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'SVG란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SVG(Scalable Vector Graphics)는 XML 기반의 2D 벡터 그래픽 형식입니다. 래스터 이미지(JPEG, PNG)와 달리 수학적 좌표로 도형을 정의하므로 확대해도 깨지지 않습니다. 주요 장점: ① 무한 확대 가능 (로고, 아이콘에 최적) ② CSS/JavaScript로 스타일링 및 애니메이션 가능 ③ 텍스트로 검색/접근성 우수 ④ 파일 크기가 작음 (특히 단순 도형). 단점: 사진 같은 복잡한 이미지에는 부적합합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <SvgEditor />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
