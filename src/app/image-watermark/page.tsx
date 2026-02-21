import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageWatermark from '@/components/ImageWatermark'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 워터마크 - 텍스트/이미지 워터마크 추가 | 툴허브',
  description: '이미지에 텍스트 또는 이미지 워터마크를 추가하세요. 위치, 크기, 투명도, 회전, 타일 반복 등 다양한 옵션을 지원합니다.',
  keywords: '이미지 워터마크, 사진 워터마크, 워터마크 넣기, watermark, 저작권 보호',
  openGraph: { title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가', url: 'https://toolhub.ai.kr/image-watermark', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 워터마크 | 툴허브', description: '이미지에 텍스트/이미지 워터마크 추가' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-watermark' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ImageWatermark /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
