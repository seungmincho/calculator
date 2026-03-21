import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageWatermark from '@/components/ImageWatermark'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이미지 워터마크 - 텍스트/이미지 워터마크 추가 | 툴허브',
  description: '이미지에 텍스트 또는 이미지 워터마크를 추가하세요. 위치, 크기, 투명도, 회전, 타일 반복 등 다양한 옵션을 지원합니다.',
  keywords: '이미지 워터마크, 사진 워터마크, 워터마크 넣기, watermark, 저작권 보호',
  openGraph: { title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가', url: 'https://toolhub.ai.kr/image-watermark', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-watermark/' },
}

export default function ImageWatermarkPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 워터마크', description: '이미지에 텍스트/이미지 워터마크 추가', url: 'https://toolhub.ai.kr/image-watermark', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['텍스트 워터마크', '이미지 워터마크', '투명도 조절', '타일 반복'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '워터마크의 적절한 투명도와 위치는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '텍스트 워터마크는 투명도 30-50%가 적절하며, 이미지가 잘 보이면서도 저작권을 표시할 수 있습니다. 위치는 우하단이 가장 일반적이나, 도용 방지를 위해서는 대각선 타일 반복이 효과적입니다. 로고 워터마크는 투명도 20-40%로 설정하고, 이미지 크기의 10-20% 비율이 적당합니다. 크롭으로 제거하기 어렵도록 중앙이나 반복 배치를 권장합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '워터마크가 필요한 경우는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 온라인에 공개하는 사진의 저작권 보호 ② 스톡 사진 미리보기(구매 전 도용 방지) ③ 문서의 \'기밀\', \'초안\' 등 상태 표시 ④ 브랜드 로고 삽입을 통한 마케팅 ⑤ SNS 업로드 시 출처 표시. 개인 사진은 메타데이터(EXIF)에 저작권 정보를 기록하는 것도 보조적으로 유용합니다.'
        }
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ImageWatermark />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            이미지 워터마크란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            이미지 워터마크는 사진이나 그림 위에 텍스트나 로고 이미지를 반투명하게 삽입하여 저작권을 표시하고 무단 도용을 방지하는 기술입니다. 사진작가, 디자이너, 유튜버, 블로거 등 콘텐츠 창작자들이 자신의 작업물을 온라인에 공개할 때 반드시 필요하며, 투명도·위치·크기·회전·타일 반복 등 다양한 옵션으로 개성 있는 워터마크를 만들 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이미지 워터마크 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>도용 방지 타일 반복:</strong> 워터마크를 전체 이미지에 대각선으로 반복 배치하면 특정 부분을 잘라내도 제거하기 어렵습니다.</li>
            <li><strong>적절한 투명도 설정:</strong> 너무 진하면 사진 감상을 방해하고, 너무 옅으면 효과가 없습니다. 투명도 30~50%가 가장 일반적입니다.</li>
            <li><strong>브랜드 로고 삽입:</strong> 텍스트 대신 로고 이미지를 워터마크로 사용하면 브랜드 인지도를 높이면서 저작권도 보호됩니다.</li>
            <li><strong>SNS 사진 공유:</strong> 인스타그램·블로그에 올리는 여행 사진이나 요리 사진에 닉네임이나 계정명을 워터마크로 넣어보세요.</li>
            <li><strong>문서 상태 표시:</strong> '초안', '기밀', 'DRAFT' 등 텍스트 워터마크를 문서 이미지에 삽입하여 배포 상태를 명확히 표시하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
