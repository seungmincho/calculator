import { Metadata } from 'next'
import { Suspense } from 'react'
import ScreenRecorder from '@/components/ScreenRecorder'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/screen-recorder/',
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
        <Breadcrumb />
              <ScreenRecorder />
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
            온라인 화면 녹화기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            온라인 화면 녹화기는 별도 프로그램 설치 없이 브라우저에서 바로 화면, 창, 브라우저 탭을 녹화할 수 있는 무료 스크린 레코더입니다. 시스템 오디오와 마이크를 함께 녹음할 수 있어 튜토리얼 영상 제작, 회의 내용 기록, 버그 리포트 화면 첨부, 온라인 강의 녹화 등에 활용됩니다. 녹화 파일은 브라우저 내에서만 처리되어 개인정보 보호에 안전합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            화면 녹화기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>탭 녹화로 시스템 오디오 캡처:</strong> 전체 화면이나 창 공유보다 브라우저 탭을 공유하면 시스템 오디오(유튜브, 회의 소리 등)를 더 안정적으로 녹음할 수 있습니다.</li>
            <li><strong>일시정지 기능 활용:</strong> 녹화 중 민감한 정보가 화면에 표시될 때 일시정지 후 해당 부분을 처리하고 재개하면 불필요한 정보가 영상에 포함되지 않습니다.</li>
            <li><strong>WebM → MP4 변환:</strong> 녹화 파일은 WebM 형식으로 저장됩니다. VLC 미디어 플레이어나 온라인 변환 도구를 이용해 MP4로 변환하면 더 넓은 호환성을 확보할 수 있습니다.</li>
            <li><strong>고품질 녹화 설정:</strong> 화면 공유 시 해상도를 최대로 설정하고 프레임 속도를 30fps로 선택하면 선명한 화질의 튜토리얼 영상을 만들 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
