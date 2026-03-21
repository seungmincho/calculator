import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorExtractor from '@/components/ColorExtractor'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이미지 색상 추출기 - 컬러 피커, 팔레트 추출 | 툴허브',
  description: '이미지에서 색상을 추출하세요. 클릭으로 색상 픽킹, 자동 팔레트 추출, HEX/RGB/HSL 변환, CSS/Tailwind 내보내기를 지원합니다.',
  keywords: '색상 추출기, 컬러 피커, 이미지 색상, 팔레트 추출, color picker, 색상 추출, HEX, RGB',
  openGraph: {
    title: '이미지 색상 추출기 | 툴허브',
    description: '이미지에서 색상을 추출하고 팔레트를 만드세요!',
    url: 'https://toolhub.ai.kr/color-extractor',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '이미지 색상 추출기 | 툴허브', description: '이미지에서 색상을 추출하세요!' },
  alternates: { canonical: 'https://toolhub.ai.kr/color-extractor/' },
}

export default function ColorExtractorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '이미지 색상 추출기', description: '이미지에서 색상 추출 및 팔레트 생성',
    url: 'https://toolhub.ai.kr/color-extractor', applicationCategory: 'DesignApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['클릭 색상 추출', '자동 팔레트 추출', 'HEX/RGB/HSL 변환', 'CSS/Tailwind 내보내기', '돋보기 기능'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지에서 색상을 추출하는 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이미지 색상 추출은 픽셀 분석을 통해 주요 색상을 찾는 과정입니다. 주요 알고리즘: ① 중간값 절단(Median Cut): 색상 공간을 재귀적으로 분할하여 대표 색상 선정 ② K-평균 클러스터링: 유사한 색상을 그룹화하여 중심 색상 추출 ③ 옥트리(Octree): RGB 색상을 트리 구조로 분류. 브랜드 색상 참고, 디자인 컬러 팔레트 생성, 웹사이트 테마 설정 등에 활용됩니다.',
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
            <I18nWrapper><ColorExtractor />  <div className="mt-8">
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
              이미지 색상 추출기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              이미지 색상 추출기는 <strong>사진이나 이미지에서 주요 색상을 자동으로 추출하거나 특정 픽셀의 색상을 클릭으로 직접 선택</strong>할 수 있는 무료 온라인 컬러 피커 도구입니다. HEX·RGB·HSL 형식으로 변환하고 CSS·Tailwind CSS 코드로 바로 내보낼 수 있어 브랜드 색상 파악, 디자인 팔레트 구성, 웹사이트 테마 설정에 유용합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              이미지 색상 추출기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>브랜드 색상 파악:</strong> 경쟁사 로고나 브랜드 이미지에서 색상을 추출해 벤치마킹하세요.</li>
              <li><strong>자동 팔레트:</strong> 자동 추출 기능으로 이미지의 주요 색상 5~10가지를 한 번에 추출할 수 있습니다.</li>
              <li><strong>Tailwind CSS 내보내기:</strong> 추출한 색상을 Tailwind 설정 파일용 코드로 바로 내보낼 수 있습니다.</li>
              <li><strong>돋보기 기능:</strong> 돋보기를 활용하면 미세한 픽셀 색상도 정확하게 선택할 수 있습니다.</li>
              <li><strong>개인정보 보호:</strong> 이미지가 서버에 업로드되지 않고 브라우저에서만 처리됩니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
