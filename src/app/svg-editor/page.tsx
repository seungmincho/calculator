import { Metadata } from 'next'
import { Suspense } from 'react'
import SvgEditor from '@/components/SvgEditor'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/svg-editor/',
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
            SVG 편집기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            SVG 편집기는 SVG 코드를 직접 편집하고, 파일 크기를 최적화하며, PNG·JPEG 이미지로 변환할 수 있는 온라인 개발자·디자이너 도구입니다. 드래그 앤 드롭으로 SVG 파일을 불러와 색상 교체, 크기 조절, 실시간 미리보기를 할 수 있어 로고, 아이콘, 일러스트레이션 작업에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            SVG 편집기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SVG 최적화로 용량 절감:</strong> 불필요한 메타데이터, 주석, 빈 그룹을 제거하면 파일 크기를 30~70% 줄일 수 있어 웹 페이지 로딩 속도가 빨라집니다.</li>
            <li><strong>고해상도 PNG 변환:</strong> 1x~4x 배율로 PNG 변환하면 Retina 디스플레이용 고해상도 이미지를 만들 수 있어 앱 아이콘이나 소셜 미디어 이미지에 활용할 수 있습니다.</li>
            <li><strong>색상 일괄 교체:</strong> 로고나 아이콘의 컬러 팔레트를 변경할 때 색상 검출 기능으로 사용된 모든 색상을 확인하고 한 번에 교체할 수 있습니다.</li>
            <li><strong>viewBox 조정:</strong> 여백을 추가하거나 특정 영역만 보이도록 viewBox 값을 수정하면 SVG를 자유롭게 크롭하거나 패딩을 설정할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
