import { Metadata } from 'next'
import SpeedTest from '@/components/SpeedTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '인터넷 속도 측정 - 다운로드 속도, 핑 테스트 | 툴허브',
  description: 'Cloudflare 서버 기준으로 인터넷 다운로드·업로드 속도, 핑, 지터를 무료로 측정하세요. 요금제(100M·500M·1G) 최저보장속도 비교, 용도별 판정, 측정 기록 그래프까지 앱 설치 없이 브라우저에서 확인합니다.',
  keywords: '인터넷 속도 측정, 다운로드 속도 테스트, 업로드 속도 측정, 핑 테스트, 지터, 기가 인터넷 속도, 최저보장속도, 인터넷 속도 확인, 네트워크 속도, Mbps 측정, 속도 측정기',
  openGraph: {
    title: '인터넷 속도 측정 | 툴허브',
    description: '다운로드 속도와 핑(지연 시간)을 브라우저에서 바로 측정하세요.',
    url: 'https://toolhub.ai.kr/speed-test',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/speed-test.png', width: 1200, height: 630, alt: '인터넷 속도 측정' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '인터넷 속도 측정 | 툴허브',
    description: '다운로드 속도와 핑(지연 시간)을 브라우저에서 바로 측정하세요.',
    images: ['https://toolhub.ai.kr/og/speed-test.png'],
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
      description: 'Cloudflare 서버 기준으로 인터넷 다운로드·업로드 속도와 핑·지터를 브라우저에서 무료로 측정합니다.',
      url: 'https://toolhub.ai.kr/speed-test',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '다운로드·업로드 속도 측정 (Mbps, 90퍼센타일)',
        '핑·지터·부하 시 핑(버퍼블로트) 측정',
        'Cloudflare 가장 가까운 서버 자동 선택',
        '요금제 대비 최저보장속도 비교',
        '넷플릭스 4K·화상회의·게임 용도별 판정',
        '측정 기록 그래프 및 결과 이미지 공유',
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
            text: 'Cloudflare 공개 속도 측정 서버(speed.cloudflare.com)와 실제로 데이터를 주고받아 측정하며, 크기를 늘려가며 여러 번 전송한 뒤 90퍼센타일을 결과로 씁니다. 다만 Wi‑Fi 상태, 기기 성능, 다른 탭·기기의 사용량, 브라우저 한계 때문에 요금제 속도보다 낮게 나올 수 있으니 유선으로 여러 번 측정해 비교하세요.',
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
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <SpeedTest />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            인터넷 속도 측정기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            인터넷 속도 측정기는 현재 사용 중인 인터넷 연결의 다운로드·업로드 속도(Mbps)와 핑·지터(ms)를 브라우저에서 바로 측정하는 무료 도구입니다. 가장 가까운 Cloudflare 서버와 실제 데이터를 주고받아 측정하고, 가입한 요금제의 최저보장속도와 비교하거나 측정 기록을 그래프로 확인할 수 있어 인터넷 품질 문제를 빠르게 점검하는 데 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            인터넷 속도 측정 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
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
