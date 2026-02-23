import { Metadata } from 'next'
import { Suspense } from 'react'
import VoiceMemo from '@/components/VoiceMemo'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '음성 메모 - 무료 온라인 음성 녹음기 | 툴허브',
  description: '브라우저에서 바로 음성을 녹음하세요. 설치 없이 무료로 사용 가능한 온라인 음성 녹음기입니다. 녹음 파일 다운로드, 일시정지/재개, 실시간 파형 시각화를 지원합니다.',
  keywords: '음성 녹음, 녹음기, 온라인 녹음, 음성 메모, voice recorder, 무료 녹음, 브라우저 녹음, WebM, 마이크 녹음',
  openGraph: {
    title: '음성 메모 - 온라인 녹음기 | 툴허브',
    description: '설치 없이 브라우저에서 바로 음성 녹음 - 파형 시각화, 다운로드, 일시정지 지원',
    url: 'https://toolhub.ai.kr/voice-memo',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '음성 메모 - 무료 온라인 음성 녹음기',
    description: '브라우저에서 바로 음성을 녹음하세요. 실시간 파형, 다운로드, 일시정지 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/voice-memo',
  },
}

export default function VoiceMemoPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '음성 메모 - 온라인 녹음기',
    description: '브라우저에서 바로 음성을 녹음하는 무료 온라인 도구. 실시간 파형 시각화, 일시정지/재개, 녹음 파일 다운로드를 지원합니다.',
    url: 'https://toolhub.ai.kr/voice-memo',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, MediaRecorder API, getUserMedia',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '브라우저 음성 녹음',
      '실시간 오디오 파형 시각화',
      '녹음 일시정지 및 재개',
      '녹음 파일 다운로드 (WebM/OGG)',
      '녹음 목록 관리',
      '인라인 재생 및 탐색',
      '녹음 이름 편집',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '온라인 음성 녹음기는 어떤 브라우저에서 사용 가능한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Chrome, Edge, Firefox, Safari 등 최신 브라우저에서 사용 가능합니다. MediaRecorder API와 getUserMedia를 지원하는 브라우저가 필요합니다. HTTPS 환경에서만 마이크 접근이 허용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '녹음 파일은 어디에 저장되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '녹음 파일은 서버에 업로드되지 않으며, 브라우저 메모리에 임시 저장됩니다. 페이지를 닫으면 녹음이 삭제되므로 필요한 파일은 반드시 다운로드 버튼으로 저장하세요. 모든 처리는 사용자의 기기에서만 이루어집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '녹음 파일 형식은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '대부분의 브라우저에서 WebM(Opus 코덱) 형식으로 녹음됩니다. Firefox에서는 OGG 형식이 사용될 수 있습니다. WebM 파일은 대부분의 미디어 플레이어와 편집 도구에서 재생 가능합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <VoiceMemo />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
