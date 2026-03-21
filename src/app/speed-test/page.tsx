import { Metadata } from 'next'
import { Suspense } from 'react'
import SpeedTest from '@/components/SpeedTest'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/speed-test/',
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
        <Breadcrumb />
              <SpeedTest />
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
            인터넷 속도 측정기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            인터넷 속도 측정기는 현재 사용 중인 인터넷 연결의 다운로드 속도(Mbps)와 핑(지연 시간, ms)을 브라우저에서 바로 측정할 수 있는 무료 도구입니다. 별도 앱 설치 없이 1MB·10MB 테스트를 선택하여 최근 5회의 측정 기록을 비교할 수 있어, 인터넷 품질 이슈를 빠르게 확인하는 데 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            인터넷 속도 측정 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>여러 번 측정 후 평균:</strong> 브라우저 기반 측정은 네트워크 상태에 따라 편차가 있을 수 있으므로, 3회 이상 측정해 평균값을 참고하세요.</li>
            <li><strong>Mbps와 MB/s 구분:</strong> 인터넷 속도는 Mbps(메가비트)로 표시되며, 파일 다운로드 속도(MB/s)의 약 8배입니다. 100Mbps = 약 12.5MB/s입니다.</li>
            <li><strong>핑 수치 이해:</strong> 핑 20ms 이하는 온라인 게임에 적합, 100ms 이상이면 게임·화상통화 품질이 저하될 수 있으니 인터넷 제공사에 문의하세요.</li>
            <li><strong>Wi-Fi vs 유선 비교:</strong> Wi-Fi와 유선 케이블 연결 상태를 각각 측정해 속도 차이를 비교하면 공유기 위치나 채널 문제를 파악하는 데 도움이 됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
