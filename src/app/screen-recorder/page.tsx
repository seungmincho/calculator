import { Metadata } from 'next'
import { Suspense } from 'react'
import ScreenRecorder from '@/components/ScreenRecorder'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '화면 녹화기 - 무료 온라인 스크린 레코더 | 툴허브',
  description: '무설치 무료 온라인 화면 녹화 도구. 브라우저에서 바로 화면, 창, 탭을 녹화하세요. 시스템 오디오와 마이크도 함께 녹음할 수 있습니다.',
  keywords: '화면 녹화, 스크린 레코더, 온라인 녹화, 무료 화면 녹화, 브라우저 녹화, 웹캠 녹화, 화면 캡처',
  openGraph: {
    title: '화면 녹화기 | 툴허브',
    description: '무설치 무료 온라인 화면 녹화 도구. 브라우저에서 바로 화면을 녹화하세요.',
    url: 'https://toolhub.ai.kr/screen-recorder',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '화면 녹화기 | 툴허브',
    description: '무설치 무료 온라인 화면 녹화 도구',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/screen-recorder',
  },
}

export default function ScreenRecorderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '화면 녹화기',
    description: '무설치 무료 온라인 화면 녹화 도구',
    url: 'https://toolhub.ai.kr/screen-recorder',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, MediaRecorder API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['화면 녹화', '창 녹화', '탭 녹화', '오디오 녹음', '일시정지/재개'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '온라인 화면 녹화기의 녹화 파일은 어디에 저장되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '녹화된 파일은 서버에 업로드되지 않으며, 브라우저 내에서만 처리됩니다. 다운로드 버튼을 클릭하면 WebM 형식으로 로컬 컴퓨터에 저장됩니다. 개인정보 보호에 안전합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '시스템 오디오와 마이크를 동시에 녹음할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 오디오 설정에서 "둘 다"를 선택하면 시스템 소리와 마이크 입력을 동시에 녹음할 수 있습니다. 단, 시스템 오디오 녹음은 브라우저 탭 공유 시에만 지원되며, 전체 화면이나 창 공유 시에는 브라우저에 따라 제한될 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '녹화 파일을 MP4로 변환할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '현재 브라우저 MediaRecorder API는 WebM 형식으로 녹화합니다. MP4로 변환하려면 녹화 후 별도의 동영상 변환 도구를 사용하시거나, VLC 미디어 플레이어의 변환 기능을 활용하세요. 대부분의 동영상 편집 프로그램에서 WebM 파일을 직접 가져올 수도 있습니다.',
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ScreenRecorder />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
