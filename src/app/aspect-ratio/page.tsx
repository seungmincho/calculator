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
  alternates: { canonical: 'https://toolhub.ai.kr/aspect-ratio/' },
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            화면 비율(종횡비) 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            화면 비율 계산기는 이미지나 동영상의 가로세로 비율(종횡비, Aspect Ratio)을 계산하고 특정 비율을 유지하면서 해상도를 변환하는 무료 온라인 도구입니다. 16:9, 4:3, 1:1, 9:16 등 주요 비율 프리셋과 함께 원하는 한 쪽 치수를 입력하면 나머지 값을 자동으로 계산합니다. 유튜브 썸네일, 인스타그램 이미지, TV 해상도 최적화, 반응형 웹 디자인 작업에 필수적인 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            화면 비율 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>유튜브·TV 콘텐츠:</strong> 16:9 비율이 표준이며, FHD(1920×1080), QHD(2560×1440), 4K(3840×2160) 해상도를 활용하세요.</li>
            <li><strong>인스타그램 최적화:</strong> 정사각형 게시물은 1:1(1080×1080), 세로 릴스·스토리는 9:16(1080×1920) 비율을 사용하세요.</li>
            <li><strong>DSLR 사진 인화:</strong> 카메라 센서 비율은 3:2(6×4인치, 10×15cm 인화)가 표준이며, 4:3은 마이크로포서드 카메라에 해당합니다.</li>
            <li><strong>반응형 웹 디자인:</strong> CSS aspect-ratio 속성과 함께 계산 결과를 활용하면 다양한 화면 크기에서 비율을 유지할 수 있습니다.</li>
            <li><strong>울트라와이드 모니터:</strong> 21:9(2560×1080 또는 3440×1440) 비율은 영상 편집과 멀티태스킹 환경에 최적화되어 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
