import { Metadata } from 'next'
import { Suspense } from 'react'
import SpeedTest from '@/components/SpeedTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '인터넷 속도 측정 - 다운로드 속도, 핑 테스트 | 툴허브',
  description: '인터넷 다운로드 속도와 핑(지연 시간)을 무료로 측정하세요. 별도 앱 설치 없이 브라우저에서 바로 측정 가능하며 측정 기록을 확인할 수 있습니다.',
  keywords: '인터넷 속도 측정, 다운로드 속도 테스트, 핑 테스트, 인터넷 속도 확인, 네트워크 속도, Mbps 측정, 속도 측정기',
  openGraph: {
    title: '인터넷 속도 측정 | 툴허브',
    description: '다운로드 속도와 핑(지연 시간)을 브라우저에서 바로 측정하세요.',
    url: 'https://toolhub.ai.kr/speed-test',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '인터넷 속도 측정 | 툴허브',
    description: '다운로드 속도와 핑(지연 시간)을 브라우저에서 바로 측정하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/speed-test',
  },
}

export default function SpeedTestPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '인터넷 속도 측정',
      description: '인터넷 다운로드 속도와 핑(지연 시간)을 브라우저에서 무료로 측정합니다.',
      url: 'https://toolhub.ai.kr/speed-test',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '다운로드 속도 측정 (Mbps)',
        '핑(지연 시간) 측정 (ms)',
        '속도 등급 분류',
        'SVG 반원 게이지 시각화',
        '최근 5회 측정 기록',
        '1MB 빠른 테스트 / 10MB 전체 테스트',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '인터넷 속도 측정 결과가 정확한가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '브라우저 기반 측정이므로 전용 앱보다 다소 차이가 있을 수 있습니다. CORS 제한으로 외부 서버 측정이 제한될 경우 근사값이 표시됩니다. 정확한 측정을 위해 여러 번 측정하고 평균값을 참고하세요.',
          },
        },
        {
          '@type': 'Question',
          name: 'Mbps와 MB/s는 어떻게 다른가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Mbps(Megabits per second)는 초당 메가비트로 인터넷 속도 단위이며, MB/s(Megabytes per second)는 초당 메가바이트로 파일 전송 속도 단위입니다. 1 MB/s = 8 Mbps 입니다. 100 Mbps 인터넷은 약 12.5 MB/s의 파일 다운로드 속도를 냅니다.',
          },
        },
        {
          '@type': 'Question',
          name: '핑(Ping)이 높으면 어떤 문제가 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '핑은 서버까지 데이터가 왕복하는 시간(ms)입니다. 핑이 높으면 온라인 게임에서 반응이 느리거나 화상통화 품질이 저하될 수 있습니다. 일반적으로 20ms 이하면 매우 좋고, 100ms 이상이면 게이밍에 불리합니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <SpeedTest />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
