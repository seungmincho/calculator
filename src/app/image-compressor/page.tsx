import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageCompressor from '@/components/ImageCompressor'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이미지 압축기 - 무료 온라인 이미지 용량 줄이기 | 툴허브',
  description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요. 화질 조절, 포맷 변환, 일괄 처리를 지원합니다.',
  keywords: '이미지 압축, 사진 용량 줄이기, 이미지 최적화, JPG 압축, PNG 압축, WebP 변환, 온라인 이미지 압축',
  openGraph: {
    title: '이미지 압축기 | 툴허브',
    description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요.',
    url: 'https://toolhub.ai.kr/image-compressor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '이미지 압축기 | 툴허브', description: '무료 온라인 이미지 압축 도구' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-compressor/' },
}

export default function ImageCompressorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 압축기',
    description: '무료 온라인 이미지 압축 도구. JPG, PNG, WebP 파일의 용량을 최대 90%까지 줄여보세요.',
    url: 'https://toolhub.ai.kr/image-compressor',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['이미지 압축', '포맷 변환', '일괄 처리', '품질 조절', 'WebP 변환']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ImageCompressor />
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
            이미지 압축기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            이미지 압축기는 JPG·PNG·WebP 이미지 파일의 용량을 최대 90%까지 줄이는 무료 온라인 이미지 최적화 도구입니다. 화질 조절 슬라이더로 크기와 품질의 균형을 맞추고, 여러 파일을 일괄 처리하거나 WebP 형식으로 변환하여 웹사이트 로딩 속도를 크게 개선할 수 있습니다. 모든 처리는 브라우저에서 이루어져 이미지가 서버에 업로드되지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이미지 압축 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>웹 최적화:</strong> 블로그·쇼핑몰 상품 이미지를 WebP로 변환하면 같은 화질에서 JPEG 대비 25~35% 파일 크기를 줄여 페이지 로딩 속도를 향상시킵니다.</li>
            <li><strong>화질 설정:</strong> 웹 게시용은 80~85%, 인쇄·고화질 보관용은 90~95%로 설정하면 품질을 크게 손상시키지 않고 용량을 줄일 수 있습니다.</li>
            <li><strong>SNS 업로드 최적화:</strong> 인스타그램·카카오스토리 업로드 전 이미지를 1MB 이하로 압축하면 플랫폼의 자동 재압축으로 인한 화질 저하를 방지합니다.</li>
            <li><strong>PNG vs JPG 선택:</strong> 투명 배경이 필요한 로고·아이콘은 PNG로, 사진·배경 이미지는 JPG나 WebP로 압축하면 최적의 결과를 얻을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
