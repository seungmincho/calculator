import { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import ImageEditorComponent from '@/components/ImageEditor'

export const metadata: Metadata = {
  title: '이미지 편집기 | 툴허브 - 브라우저에서 이미지 편집',
  description: '브라우저에서 바로 이미지를 편집하세요. 크롭, 회전, 필터, 텍스트 추가 등 다양한 편집 기능을 제공하며, 서버 업로드 없이 안전하게 작동합니다.',
  keywords: '이미지편집기, 사진편집, 이미지크롭, 이미지필터, 온라인편집기, 이미지회전, 텍스트추가',
  openGraph: {
    title: '이미지 편집기 | 툴허브',
    description: '브라우저에서 바로 이미지를 편집하고 다운로드하세요',
    url: 'https://toolhub.ai.kr/image-editor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 편집기 | 툴허브',
    description: '브라우저에서 바로 이미지를 편집하고 다운로드하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/image-editor',
  },
}

export default function ImageEditorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 편집기',
    description: '브라우저에서 바로 이미지를 편집하세요. 크롭, 회전, 필터, 텍스트 추가 등 다양한 편집 기능 제공.',
    url: 'https://toolhub.ai.kr/image-editor',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['이미지 크롭', '회전/반전', '필터 효과', '텍스트 추가', '다운로드'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '브라우저에서 이미지 편집 시 개인정보는 안전한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이 도구는 모든 이미지 처리를 브라우저(클라이언트)에서 수행하며, 서버에 이미지를 업로드하지 않습니다. HTML5 Canvas API를 사용하여 로컬에서 크롭, 회전, 필터 등을 처리하므로 개인 사진이나 민감한 이미지도 안전하게 편집할 수 있습니다. 인터넷 연결 없이도 작동합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '이미지 크롭과 리사이즈의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크롭(Crop)은 이미지의 원하는 부분만 잘라내는 것으로, 불필요한 영역을 제거할 때 사용합니다. 리사이즈(Resize)는 이미지 전체의 크기(해상도)를 변경하는 것입니다. 예: 4000×3000 이미지를 크롭하면 선택 영역만 남고, 리사이즈하면 전체를 2000×1500으로 축소합니다. 두 작업을 함께 사용하면 효과적입니다.'
        }
      },
      {
        '@type': 'Question',
        name: '이미지 필터와 보정의 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '밝기(Brightness): 모든 픽셀의 RGB 값을 동일하게 증감합니다. 대비(Contrast): 밝은 픽셀은 더 밝게, 어두운 픽셀은 더 어둡게 만들어 차이를 강조합니다. 채도(Saturation): 색상의 선명도를 조절하며 0이면 흑백이 됩니다. 블러(Blur): 인접 픽셀의 평균값으로 대체하여 부드럽게 만듭니다. 이 모든 처리는 Canvas API의 필터 기능으로 실시간 적용됩니다.'
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <ImageEditorComponent />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
