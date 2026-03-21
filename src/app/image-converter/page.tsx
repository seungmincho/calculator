import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageConverter from '@/components/ImageConverter'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이미지 변환기 - 포맷 변환 | 툴허브',
  description: '이미지 변환기 - JPEG, PNG, WebP, GIF 등 이미지 파일 형식을 변환합니다. 품질 조절, 미리보기, 일괄 변환 지원.',
  keywords: '이미지 변환기, 이미지 포맷 변환, JPEG PNG 변환, WebP 변환, image converter',
  openGraph: { title: '이미지 변환기 | 툴허브', description: 'JPEG/PNG/WebP 이미지 포맷 변환', url: 'https://toolhub.ai.kr/image-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 변환기 | 툴허브', description: 'JPEG/PNG/WebP 이미지 포맷 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-converter/' },
}

export default function ImageConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 변환기', description: 'JPEG/PNG/WebP 이미지 포맷 변환', url: 'https://toolhub.ai.kr/image-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['포맷 변환', '품질 조절', '일괄 변환', '미리보기'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지 포맷 변환이 필요한 경우는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 웹 업로드: HEIC(아이폰)을 JPEG로 변환 (대부분 사이트가 HEIC 미지원) ② 파일 크기 축소: PNG를 JPEG나 WebP로 변환하면 70-90% 크기 감소 ③ 투명 배경 필요: JPEG를 PNG로 변환 후 배경 제거 ④ 인쇄용: RGB 이미지를 CMYK TIFF로 변환 ⑤ 웹 최적화: JPEG/PNG를 WebP나 AVIF로 변환하면 페이지 로딩 속도 개선.',
        },
      },
      {
        '@type': 'Question',
        name: 'HEIC 파일이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'HEIC(High Efficiency Image Container)는 Apple이 iOS 11부터 도입한 이미지 포맷으로, HEVC 코덱 기반입니다. JPEG 대비 약 50% 작은 파일 크기로 동일 화질을 제공합니다. 하지만 Windows, 일부 안드로이드, 웹 브라우저에서 호환성 문제가 있어 공유 시 JPEG 변환이 필요합니다. iPhone 설정에서 \'호환성 우선\'을 선택하면 처음부터 JPEG으로 저장할 수 있습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ImageConverter />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            이미지 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            이미지 변환기는 JPEG·PNG·WebP·GIF 등 이미지 파일 형식을 브라우저에서 즉시 변환하는 무료 온라인 도구입니다. 아이폰 HEIC 파일을 JPEG로 변환하거나, 투명 배경 보존을 위해 JPEG를 PNG로, 웹 최적화를 위해 PNG를 WebP로 변환하는 등 다양한 포맷 변환이 가능하며, 화질 조절과 실시간 미리보기를 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이미지 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>HEIC → JPEG 변환:</strong> 아이폰으로 찍은 HEIC 파일은 Windows·안드로이드·대부분의 웹사이트에서 열리지 않습니다. JPEG로 변환하면 호환성 문제가 해결됩니다.</li>
            <li><strong>PNG → WebP 변환:</strong> 웹사이트 이미지를 WebP로 변환하면 PNG 대비 파일 크기가 26% 줄어 Core Web Vitals(LCP) 점수를 향상시킬 수 있습니다.</li>
            <li><strong>투명 배경 보존:</strong> PNG에서 PNG로 변환할 때는 투명 배경(alpha 채널)이 유지됩니다. JPEG 변환 시에는 배경이 흰색으로 채워집니다.</li>
            <li><strong>일괄 변환:</strong> 여러 이미지를 한 번에 업로드하여 일괄 변환하면 개별 처리보다 훨씬 빠르게 작업을 완료할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
